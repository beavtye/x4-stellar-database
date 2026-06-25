<script setup>
const props = defineProps({
  datasets: { type: Object, required: true },
  current: { type: String, required: true },
  stats: { type: Object, required: true },
  datasetStats: { type: Object, default: () => ({}) }
})
defineEmits(['switch'])

function datasetCode() {
  const map = { ships: 'SHIP', weapons: 'WPN', turrets: 'TUR', equipment: 'EQP', sectors: 'SEC' }
  return map[props.current] || String(props.current || 'DB').slice(0, 4).toUpperCase()
}

function sharePercent() {
  const total = Object.values(props.datasetStats || {}).reduce((sum, value) => sum + (Number(value) || 0), 0)
  if (!total) return 0
  return Math.round(((props.datasetStats?.[props.current] || 0) / total) * 100)
}
</script>

<template>
  <aside class="sidebar">
    <section class="brand">
      <div class="brand-mark">X4</div>
      <div class="brand-text">
        <h1><span>X4</span> 数据库</h1>
        <p>X4助手喵大脑存放地</p>
      </div>
    </section>

    <div class="nav-label">数据库</div>
    <nav class="nav">
      <button
        v-for="item in datasets"
        :key="item.key"
        class="nav-btn"
        :class="{ active: current === item.key }"
        type="button"
        @click="$emit('switch', item.key)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-text">
          <b>{{ item.label }}</b>
          <small>{{ item.description }}</small>
        </span>
        <span class="nav-count">{{ datasetStats[item.key] || '…' }}</span>
      </button>
    </nav>

    <section class="side-overview" aria-label="数据库实时概览">
      <div class="side-overview-head">
        <span>实时概览</span>
        <em>{{ datasetCode() }}</em>
      </div>
      <div class="side-stat-grid">
        <div class="side-stat"><span>当前结果</span><strong>{{ stats.filtered }}</strong></div>
        <div class="side-stat"><span>收藏项目</span><strong>{{ stats.favorites || 0 }}</strong></div>
        <div class="side-stat"><span>勾选条目</span><strong>{{ stats.selected }}</strong></div>
        <div class="side-stat"><span>全库总量</span><strong>{{ stats.total }}</strong></div>
      </div>
      <div class="side-metric">
        <span>当前排行指标</span>
        <strong>{{ datasets[current]?.label || current }}</strong>
      </div>
      <div class="side-share">
        <div><span>当前库占全库</span><b>{{ sharePercent() }}%</b></div>
        <i><span :style="{ width: `${sharePercent()}%` }"></span></i>
      </div>
    </section>

    <a class="nav-btn nav-link" href="#/map">
      <span class="nav-icon">图</span>
      <span class="nav-text">
        <b>星区地图</b>
        <small>真实坐标星图与星区资料</small>
      </span>
      <span class="nav-count">MAP</span>
    </a>

    <a class="nav-btn nav-link" href="#/lore">
      <span class="nav-icon">史</span>
      <span class="nav-text">
        <b>编年史</b>
        <small>章节、小节与档案卡阅读</small>
      </span>
      <span class="nav-count">LORE</span>
    </a>

    <a class="nav-btn nav-link" href="#/benchmark">
      <span class="nav-icon">标</span>
      <span class="nav-text">
        <b>数值标杆</b>
        <small>mod 作者曲线对比工具</small>
      </span>
      <span class="nav-count">BM</span>
    </a>

    <section class="side-note side-card">
      <b>玩家版数据口径</b>
      <p>隐藏维护字段与内部条目。<br><kbd>Ctrl</kbd> + <kbd>K</kbd> 可随时全库搜索。</p>
      <a href="#/legacy">打开旧版对照页</a>
      <div class="side-dev-links" aria-label="旧版对照入口">
        <a href="#/">数据库首页</a>
        <a href="#/legacy-map">旧版星图</a>
      </div>
    </section>
  </aside>
</template>
