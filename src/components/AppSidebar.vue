<script setup>
defineProps({
  datasets: { type: Object, required: true },
  current: { type: String, required: true },
  stats: { type: Object, required: true }
})
defineEmits(['switch'])
</script>

<template>
  <aside class="sidebar">
    <section class="brand">
      <div class="brand-mark">X4</div>
      <div>
        <h1>星际数据库</h1>
        <p>Vue3 协作迁移版</p>
      </div>
    </section>

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
        <span class="nav-count">{{ item.payload.data.length }}</span>
      </button>
    </nav>

    <section class="side-note">
      <b>迁移范围</b>
      <p>第一阶段聚焦核心数据库。分享卡、星图、编年史和 Benchmark 已保留数据接口，后续作为独立页面迁移。</p>
      <a href="/legacy/index.html" target="_blank" rel="noopener">打开 legacy 对照页</a>
    </section>
  </aside>
</template>
