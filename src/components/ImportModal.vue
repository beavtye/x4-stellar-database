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
const rawFiles = ref([])
const rawLinks = ref([{ label: '', url: '', access_code: '', size_hint: '', sha256: '', note: '' }])
const RAW_TOTAL_LIMIT = 24 * 1024 * 1024
const RAW_FILE_LIMIT = 8 * 1024 * 1024
const submit = reactive({
  packageName: '',
  authorName: '',
  contact: '',
  modId: localStorage.getItem('x4_mod_submit_mod_id') || '',
  authorKey: localStorage.getItem('x4_mod_submit_author_key') || '',
  note: ''
})

const report = computed(() => parsed.value ? reportForDatasets(parsed.value) : reportForDatasets(props.pendingDatasets))
const rawReport = computed(() => ({
  count: rawFiles.value.length,
  bytes: rawFiles.value.reduce((sum, file) => sum + (file.size || 0), 0)
}))
const validRawLinks = computed(() => rawLinks.value
  .map((link) => ({
    ...link,
    label: link.label.trim(),
    url: link.url.trim(),
    access_code: link.access_code.trim(),
    size_hint: link.size_hint.trim(),
    sha256: link.sha256.trim(),
    note: link.note.trim()
  }))
  .filter((link) => link.url))
const hasPending = computed(() => report.value.total > 0 || rawReport.value.count > 0 || validRawLinks.value.length > 0)
const currentDatasetLabel = computed(() => DATASETS[props.dataset]?.label || '当前分类')
const submitSourceLabel = computed(() => {
  if (rawReport.value.count) return '原始文件包'
  if (validRawLinks.value.length) return '大包下载链接'
  if (parsed.value) return '刚选择的整理文件'
  return '当前本地导入'
})

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

async function readRawFiles(event) {
  const files = [...(event.target.files || [])]
  event.target.value = ''
  if (!files.length) return
  status.value = '正在读取原始文件...'
  try {
    let total = 0
    const output = []
    for (const file of files) {
      if (file.size > RAW_FILE_LIMIT) throw new Error(`单个文件不能超过 ${Math.floor(RAW_FILE_LIMIT / 1024 / 1024)} MB：${file.name}`)
      total += file.size
      if (total > RAW_TOTAL_LIMIT) throw new Error(`原始文件总量不能超过 ${Math.floor(RAW_TOTAL_LIMIT / 1024 / 1024)} MB`)
      output.push({
        name: file.name,
        path: file.webkitRelativePath || file.name,
        size: file.size,
        type: file.type || '',
        content_base64: await fileToBase64(file)
      })
    }
    rawFiles.value = output
    if (!submit.packageName) submit.packageName = inferRawPackageName(output)
    status.value = `已读取 ${output.length} 个原始文件，共 ${formatBytes(total)}。可以直接提交给站长审核。`
  } catch (err) {
    rawFiles.value = []
    status.value = `原始文件读取失败：${err.message}`
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
  const raw = rawFiles.value
  const links = validRawLinks.value
  if (!r.total && !raw.length && !links.length) {
    status.value = '没有可提交的数据包。大船包请填写下载链接，小文件可直接上传，整理好的数据可选 CSV / JSON。'
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
      raw_files: raw,
      raw_links: links,
      report: {
        counts: r.counts,
        raw_file_count: rawReport.value.count,
        raw_file_bytes: rawReport.value.bytes,
        raw_link_count: links.length,
        submitted_at: new Date().toISOString()
      }
    })
    localStorage.setItem('x4_mod_submit_mod_id', data.mod_id || '')
    localStorage.setItem('x4_mod_submit_author_key', data.author_key || '')
    submit.modId = data.mod_id || ''
    submit.authorKey = data.author_key || ''
    parsed.value = null
    rawFiles.value = []
    rawLinks.value = [{ label: '', url: '', access_code: '', size_hint: '', sha256: '', note: '' }]
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      resolve(dataUrl.includes(',') ? dataUrl.split(',').pop() : dataUrl)
    }
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

function inferRawPackageName(files) {
  const firstPath = files[0]?.path || files[0]?.name || ''
  return firstPath.includes('/') ? firstPath.split('/')[0] : firstPath.replace(/\.[^.]+$/, '') || '原始 mod 文件包'
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function addRawLink() {
  rawLinks.value.push({ label: '', url: '', access_code: '', size_hint: '', sha256: '', note: '' })
}

function removeRawLink(index) {
  rawLinks.value.splice(index, 1)
  if (!rawLinks.value.length) addRawLink()
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
        <h4>上传大船包</h4>
        <p>几百 MB 或几 GB 的船包不要直接传到网站。请先传到网盘、GitHub Release、Nexus、群文件等地方，然后把下载链接交给站长。</p>
        <div class="raw-link-list">
          <div v-for="(link, index) in rawLinks" :key="index" class="raw-link-card">
            <label><span>链接名称</span><input v-model="link.label" placeholder="例如 某某船包 v1.2" /></label>
            <label class="wide"><span>下载链接</span><input v-model="link.url" placeholder="https://..." /></label>
            <label><span>提取码</span><input v-model="link.access_code" placeholder="可选" /></label>
            <label><span>大小</span><input v-model="link.size_hint" placeholder="例如 1.8 GB" /></label>
            <label><span>SHA256</span><input v-model="link.sha256" placeholder="可选，方便校验" /></label>
            <label><span>说明</span><input v-model="link.note" placeholder="安装位置、依赖、适配版本" /></label>
            <button type="button" class="btn ghost" @click="removeRawLink(index)">删除链接</button>
          </div>
        </div>
        <div class="button-row">
          <button type="button" class="btn" @click="addRawLink">再加一个链接</button>
        </div>
        <div class="quick-submit-row">
          <span>{{ validRawLinks.length ? `大包链接：${validRawLinks.length} 个` : '大包请提交下载链接，不直接上传文件本体' }}</span>
          <button type="button" class="btn primary" :disabled="!hasPending" @click="submitForReview">一键提交审核</button>
        </div>
      </section>

      <section class="import-block">
        <h4>小型原始文件</h4>
        <p>只适合几十 MB 以内的关键 XML、CSV、JSON、说明文件。完整船包请用上方下载链接。</p>
        <div class="button-row">
          <label class="btn primary file-btn">
            选择小文件夹
            <input type="file" multiple webkitdirectory directory @change="readRawFiles" />
          </label>
          <label class="btn file-btn">
            选择散装文件
            <input type="file" multiple accept=".xml,.xsd,.txt,.md,.csv,.json" @change="readRawFiles" />
          </label>
          <button type="button" class="btn ghost" @click="rawFiles = []">清空原始文件</button>
        </div>
        <div class="quick-submit-row">
          <span>{{ rawReport.count ? `小型原始文件：${rawReport.count} 个 / ${formatBytes(rawReport.bytes)}` : '上限约 24 MB，只用于关键小文件' }}</span>
          <button type="button" class="btn primary" :disabled="!hasPending" @click="submitForReview">一键提交审核</button>
        </div>
      </section>

      <section class="import-block">
        <h4>整理后数据</h4>
        <p>如果作者愿意按模板整理数据，可以走这条路。选择 CSV / JSON 后也能直接提交，或先合并到本地视图检查。</p>
        <div class="button-row">
          <button type="button" class="btn" @click="downloadExamplePackage">下载完整示例包</button>
          <button type="button" class="btn" @click="downloadCurrentTemplate">下载当前分类模板</button>
        </div>
        <input type="file" accept=".csv,.json,text/csv,application/json" @change="readFile" />
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
        <small v-if="rawReport.count">原始文件 {{ rawReport.count }} 个 / {{ formatBytes(rawReport.bytes) }}</small>
        <p>{{ status }}</p>
      </section>
    </div>
  </section>
</template>
