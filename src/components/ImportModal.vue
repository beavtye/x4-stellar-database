<script setup>
import { computed, reactive, ref } from 'vue'
import { DATASETS } from '../dataIndex'
import { fullImportExamplePackage, importTemplateForDataset, parseImportPayload, reportForDatasets } from '../utils/importMod'
import { downloadText, toCsv } from '../utils/csv'
import { fetchPublicModPackages, postModPackage } from '../utils/reviewApi'
import { publicModItemToPack } from '../utils/modPackages'

const props = defineProps({
  open: { type: Boolean, required: true },
  pendingDatasets: { type: Object, default: () => ({}) },
  importedPacks: { type: Array, required: true },
  dataset: { type: String, default: 'ships' }
})
const emit = defineEmits(['close', 'import-pack', 'replace-public-packs', 'clear-imports'])

const status = ref('')
const parsed = ref(null)
const fileName = ref('')
const submit = reactive({
  packageName: '',
  authorName: '',
  contact: '',
  modId: localStorage.getItem('x4_mod_submit_mod_id') || '',
  authorKey: localStorage.getItem('x4_mod_submit_author_key') || '',
  note: ''
})

const report = computed(() => parsed.value ? reportForDatasets(parsed.value) : reportForDatasets(props.pendingDatasets))
const hasPending = computed(() => report.value.total > 0)
const currentDatasetLabel = computed(() => DATASETS[props.dataset]?.label || '当前分类')
const submitSourceLabel = computed(() => parsed.value ? '刚选择的文件' : '当前本地导入')

async function readFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  fileName.value = file.name
  status.value = '正在读取文件...'
  try {
    const text = await file.text()
    parsed.value = parseImportPayload(text, file.name)
    if (!submit.packageName) submit.packageName = file.name.replace(/\.(csv|json)$/i, '')
    const r = reportForDatasets(parsed.value)
    status.value = `已识别 ${r.total} 行：${Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join('、')}。可以直接提交审核，也可以先合并到本地视图检查。`
  } catch (err) {
    parsed.value = null
    status.value = `导入失败：${err.message}`
  }
}

function confirmImport() {
  if (!parsed.value) return
  const pack = {
    id: `local_${Date.now()}`,
    packageName: submit.packageName || fileName.value || '本地 mod 数据包',
    createdAt: new Date().toISOString(),
    datasets: parsed.value
  }
  emit('import-pack', pack)
  parsed.value = null
  status.value = '已合并到本地视图，提交审核前只保存在浏览器本地。'
}

async function submitForReview() {
  const datasets = parsed.value || props.pendingDatasets
  const r = reportForDatasets(datasets)
  if (!r.total) {
    status.value = '没有可提交的数据包。请先选择 CSV / JSON 文件，或先导入本地数据。'
    return
  }
  status.value = `正在提交${submitSourceLabel.value}到审核服务...`
  try {
    const data = await postModPackage({
      package_name: submit.packageName || fileName.value || '未命名 mod 数据包',
      author_name: submit.authorName,
      contact: submit.contact,
      mod_id: submit.modId,
      author_key: submit.authorKey,
      note: submit.note,
      datasets,
      report: { counts: r.counts, submitted_at: new Date().toISOString() }
    })
    localStorage.setItem('x4_mod_submit_mod_id', data.mod_id || '')
    localStorage.setItem('x4_mod_submit_author_key', data.author_key || '')
    submit.modId = data.mod_id || ''
    submit.authorKey = data.author_key || ''
    parsed.value = null
    status.value = `已提交，审核编号 #${data.id}。请在私下保存 mod_id 和作者更新密钥，后续更新自己的数据包需要用到。`
  } catch (err) {
    status.value = `提交失败：${err.message}`
  }
}

async function syncPublicPackages() {
  status.value = '正在读取已公开启用的 mod 包...'
  try {
    const data = await fetchPublicModPackages()
    const items = Array.isArray(data.items) ? data.items : []
    if (!items.length) {
      emit('replace-public-packs', [])
      status.value = '当前没有已公开启用的 mod 包。'
      return
    }
    emit('replace-public-packs', items.map(publicModItemToPack))
    status.value = `已同步 ${items.length} 个公开 mod 包，可在“数据来源”里单独筛选。`
  } catch (err) {
    status.value = `同步失败：${err.message}`
  }
}

function downloadExamplePackage() {
  const payload = fullImportExamplePackage()
  downloadText('X4_mod_完整导入示例包.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
  status.value = '已下载完整示例包。下载后复制字段并替换成自己的数据，再通过“选择 CSV / JSON 文件”导入。'
}

async function downloadCurrentTemplate() {
  status.value = `正在生成 ${currentDatasetLabel.value} 导入模板...`
  const template = await importTemplateForDataset(props.dataset)
  const csv = `\uFEFF${toCsv(template.rows, template.headers)}`
  downloadText(`X4_${currentDatasetLabel.value}_导入模板.csv`, csv, 'text/csv;charset=utf-8')
  status.value = `已下载 ${currentDatasetLabel.value} 导入模板。`
}
</script>

<template>
  <div class="modal-backdrop" :class="{ open }" @click="$emit('close')"></div>
  <section class="modal" :class="{ open }">
    <header class="modal-head">
      <h3>导入 mod 数据</h3>
      <button type="button" class="icon-toggle" @click="$emit('close')">×</button>
    </header>
    <div class="modal-body import-body">
      <section class="import-block import-fast">
        <h4>最快上传</h4>
        <p>下载模板，填好后选择 CSV / JSON 文件，再点“一键提交审核”。不需要先合并到本地视图。</p>
        <div class="button-row">
          <button type="button" class="btn" @click="downloadExamplePackage">下载完整示例包</button>
          <button type="button" class="btn" @click="downloadCurrentTemplate">下载当前分类模板</button>
        </div>
        <input type="file" accept=".csv,.json,text/csv,application/json" @change="readFile" />
        <div class="quick-submit-row">
          <span>{{ report.total ? `${submitSourceLabel}：${report.total} 行` : '等待选择文件' }}</span>
          <button type="button" class="btn primary" :disabled="!hasPending" @click="submitForReview">一键提交审核</button>
        </div>
      </section>

      <section class="import-block">
        <h4>本地预览</h4>
        <p>想先在网页里检查数据时，再合并到本地视图。这里不会提交到站长后台。</p>
        <button type="button" class="btn primary" :disabled="!parsed" @click="confirmImport">合并到本地视图</button>
        <button type="button" class="btn" @click="syncPublicPackages">从审核服务同步公开 mod</button>
      </section>

      <section class="import-block">
        <h4>提交信息</h4>
        <p>首次提交可以不填 mod_id 和作者更新密钥；提交成功后网页会返回这两个值。以后更新同一个数据包时再填回来。</p>
        <div class="form-grid">
          <label><span>数据包名</span><input v-model="submit.packageName" placeholder="例如 VRO balance patch" /></label>
          <label><span>作者名</span><input v-model="submit.authorName" /></label>
          <label><span>联系方式</span><input v-model="submit.contact" /></label>
          <label><span>mod_id</span><input v-model="submit.modId" placeholder="首次提交可留空" /></label>
          <label><span>作者更新密钥</span><input v-model="submit.authorKey" placeholder="首次提交可留空" /></label>
          <label class="wide"><span>说明</span><textarea v-model="submit.note" /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="$emit('clear-imports')">清空本地导入</button>
          <button type="button" class="btn primary" :disabled="!hasPending" @click="submitForReview">提交{{ submitSourceLabel }}审核</button>
        </div>
      </section>

      <section class="import-status">
        <b>当前本地导入：</b>
        <span>{{ report.total }} 行</span>
        <small v-if="Object.keys(report.counts).length">{{ Object.entries(report.counts).map(([k, v]) => `${k} ${v}`).join('、') }}</small>
        <p>{{ status }}</p>
      </section>
    </div>
  </section>
</template>
