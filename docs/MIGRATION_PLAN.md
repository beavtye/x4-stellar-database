# 迁移计划

本文档记录 X4 星际数据库从单文件 HTML/CSS/JS 迁移到 Vue3 + Vite 工程后的阶段边界。每个阶段都应在完成后运行 `npm run build`，并确认旧版入口 `public/legacy/index.html` 未被破坏。

## Phase 1：核心数据库

状态：迁移预览可用，默认入口暂时回挂 legacy exact。

已迁移范围：

- 左侧/顶部导航
- 搜索、筛选、排序
- 表格视图、卡片视图
- 详情抽屉
- 勾选对比
- 导出 CSV
- 导入 mod 数据
- 提交 mod 包审核接口
- 日间/夜间主题
- 手机适配

当前策略：

- `#/` 默认显示 `public/legacy/index.html`，保证玩家看到的首页数据库和旧版 HTML 一致。
- `#/database-vue` 是 Vue3 数据库迁移预览入口，用于继续组件化、复刻旧版交互和视觉。
- 完成验收前，不把半迁移 Vue 数据库替换到默认首页。

验收重点：

- 核心数据集能正常浏览、搜索、筛选、排序。
- 表格和卡片视图可切换。
- 数据详情、对比、导出、导入流程可用。
- 前端通过现有 Python 审核服务接口提交和读取 mod 包，不重写后端。

## Phase 2：分享卡页面

状态：已完成基础迁移与视觉抛光。

目标：迁移旧版分享卡页面，复用 `src/data/share-data.json`，保留可分享、可检索、可扩展的数据展示能力。

建议范围：

- 分享卡列表和详情视图。
- 与核心数据库一致的主题、布局和移动端适配。
- 保留旧版数据来源边界，不引入私有源文件路径或后台信息。
- 固定分享路由、固定卡片节点和 Bot ready 信号。

## Phase 3：星区地图页面

状态：迁移预览可用，默认地图暂时回挂 legacy exact。

目标：迁移星区地图页面，基于 `src/data/sectors.json` 建立可维护的地图展示层。

建议范围：

- 星系、星区、定位记录展示。
- 搜索和基础筛选。
- 点击星区显示资料面板。
- 基础缩放、拖动和移动端可读布局。
- 与后续数据动态加载兼容的结构。

当前策略：

- `#/map` 默认显示 legacy exact 星图，并自动调用旧版 `openAtlasV4()`。
- `#/map-vue` 是 Vue3 星区地图迁移预览入口，用于继续复刻旧版真实星图、三栏布局、资源排行和详情面板。
- 完成验收前，不把半迁移 Vue 地图替换到默认地图入口。

## Phase 4：编年史页面

状态：基础阅读骨架可用，后续按章节/卡片继续定制。

目标：迁移编年史页面，基于 `src/data/lore.json` 展示章节、小节和卡片记录。

当前策略：

- `#/lore` 先保证章节列表、搜索、目录跳转和正文阅读稳定可用。
- 视觉沉浸组件不批量套壳，后续按每章、每个小版位单独匹配 Gemini 定制卡片。
- 编年史不影响首页数据库和星区地图的 legacy exact 正式入口。
- 数据层为每个章节、正文小节和档案卡生成稳定定制挂点：`slotId`、`renderKind`、`customComponentKey`。
- 正文 DOM 会同步输出 `data-lore-slot`、`data-render-kind`、`data-component-key`，右侧目录只输出 `data-lore-index-slot`。后续 Gemini 定制组件应按正文挂点替换或增强，不要在 `LoreReader.vue` 里按章节继续堆硬编码。

建议范围：

- 编年史导航。
- 章节内容阅读。
- 搜索和基础筛选。
- 分类切换与正文目录。
- 保持内容数据与展示组件分离。

后续定制约定：

- `slotId` 是稳定槽位标识，例如 `lore:faction-archive:card:lore-box-xxxx`。
- `renderKind` 表示建议渲染类型，例如 `card-faction`、`card-conflict`、`card-boundary`、`timeline-node`。
- `customComponentKey` 是未来注册定制组件时使用的键，例如 `lore.faction-archive.card.lore-box-xxxx`。
- 某个卡片没有 Gemini 定制时，继续使用默认阅读组件；有定制时，只替换对应槽位，不影响同章其他内容。

## Phase 5：Benchmark 数值工具

状态：已完成基础迁移与视觉抛光。

目标：迁移 Benchmark 数值对比工具，让舰船、武器、炮塔、装备等数据可以参与可解释的数值对比。

建议范围：

- 对比项选择。
- 关键数值汇总。
- CSV 导出或复制结果。
- 明确公式来源，避免把临时计算写死到组件里。

## Phase 6：动态加载、性能优化、部署流程

状态：基础适配已完成，后续优化中。

目标：为公开协作和部署打基础。

建议范围：

- 按页面或数据集拆分加载。
- 大 JSON 数据的加载性能优化。
- GitHub Pages 或其他静态部署流程。
- 前后端分域部署时的 `VITE_REVIEW_API_BASE` 配置说明。
- 发布前敏感文件扫描流程。

## 当前可访问入口

以下路由路径可在开发环境或构建后的静态站点中直接访问：

- `#/` — 核心数据库首页（舰船、武器、炮塔、装备）
- `#/map` — 星区地图
- `#/database-vue` — Vue3 数据库迁移预览入口
- `#/map-vue` — Vue3 星区地图迁移预览入口
- `#/lore` — 编年史
- `#/benchmark` — 数值标杆工具
- `#/share?type=ship&id=...` — 分享卡（`type` 支持 `ship`、`weapon`、`turret`、`equipment`、`sector`、`lore`）
- `/legacy/index.html` — 旧版静态对照入口
