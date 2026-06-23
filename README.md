# X4 星际数据库 Vue3 迁移版

这是 X4: Foundations 中文玩家数据库的 Vue3 迁移版。当前仍处于迁移阶段，旧版纯 HTML 保存在 `public/legacy/`，欢迎提交数据修正、字段补全和页面迁移 PR。

这是从旧版单文件 HTML/CSS/JS 迁移出的 Vue3 + Vite 工程。目标是让数据、界面、协作流程分层，方便后续放到 GitHub 多人维护。

## 当前状态

第一阶段核心数据库已完成迁移：

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

后续迁移阶段见 `docs/MIGRATION_PLAN.md`。

## 目录结构

```text
x4-vue-migration/
  public/
    legacy/                 旧版静态页对照，不包含 Python 后端、SQLite、token 或日志
  scripts/
    extract_legacy_data.py  从旧版静态页抽取公开数据
  src/
    components/             Vue 组件
    composables/            状态与数据逻辑
    data/                   拆分后的公开 JSON 数据
    utils/                  CSV、导入、格式化、审核 API 工具
    App.vue
    main.js
    styles.css
  docs/
    DATA_MODEL.md           数据模型说明
    MIGRATION_PLAN.md       后续迁移计划
    data-fields.json        数据字段清单和样例
  .env.example
  package.json
  vite.config.js
```

## 数据文件

核心数据位于 `src/data/`：

- `ships.json`
- `weapons.json`
- `turrets.json`
- `equipment.json`
- `sectors.json`
- `lore.json`
- `share-data.json`

字段说明见 `docs/DATA_MODEL.md` 和 `docs/data-fields.json`。数据结构变更时，应同步更新这些说明。

## 环境配置

复制 `.env.example` 为本地 `.env` 后按需填写：

```env
VITE_REVIEW_API_BASE=
```

本地只跑前端时可以空着，此时开发环境会使用 Vite 代理访问 `/api`。

如果前端和 `review_server.py` 不同域，填写公网或本地审核服务地址，例如：

```env
VITE_REVIEW_API_BASE=http://127.0.0.1:8765
```

`.env` 和 `.env.*` 不应提交到仓库。

## 本地运行

安装依赖：

```powershell
npm install
```

启动开发服务器：

```powershell
npm run dev
```

开发环境里 `/api` 默认代理到：

```text
http://127.0.0.1:8765
```

## 构建与预览

构建：

```powershell
npm run build
```

本地预览构建产物：

```powershell
npm run preview
```

构建产物输出到 `dist/`，默认不作为源码提交。

## 静态部署

前端可以作为纯静态站点部署，推荐优先使用 hash 路由入口：

```text
#/map
#/lore
#/benchmark
#/share?type=ship&id=ship_arg_l_destroyer_01_a
```

这样部署到 GitHub Pages、Cloudflare Pages、Nginx 子目录或本地静态目录时，不需要额外配置服务端 fallback。

Vite 已使用相对资源路径：

```js
base: './'
```

因此 `dist/` 可以放在站点根目录、子目录，或由公网部署机直接托管。若使用 `/map`、`/lore`、`/benchmark` 这类普通路径，需要服务器把所有前端路由回退到 `index.html`。

核心数据库数据采用按需加载：首次进入首页只加载当前分类，切换“舰船 / 武器 / 炮塔 / 装备”时再加载对应 JSON。分享卡、星区地图、编年史和数值标杆页也按页面拆包加载。

## 旧版入口

旧版静态页保存在：

```text
public/legacy/index.html
```

迁移期间不要删除 legacy 文件。它用于对照旧功能和回退验证。

## 后端审核服务

`review_server.py` 暂时仍作为独立 Python 审核服务，在旧工程或部署机运行。本 Vue 工程不重写后端。

前端通过 `fetch` 对接以下接口：

- `POST /api/proposals`
- `POST /api/mod-packages`
- `GET /api/mod-packages`

数据库页面会在启动时尝试读取已批准并启用的公开 mod 包；读取成功后，用户可以在“数据来源”里切换“原版 / 全部 / 指定 mod”。如果当前部署没有审核服务，前端会继续使用内置原版静态数据。

## 重新抽取旧数据

旧版静态页更新后，可重新生成 JSON：

```powershell
npm run extract:data
```

抽取脚本只读取 `public/legacy/index.html` 和 `public/legacy/x4-share-data.js`，不会读取站长 token、SQLite、日志、后台配置或 Python 服务。

## 隐私与发布边界

不要提交以下内容：

- `.x4_review_admin_token`
- `.x4_github_sync.json`
- `x4_review.sqlite3`
- `review_server.log`
- `review_server.err.log`
- 任何 token、SQLite、日志、私有配置、作者私钥、联系方式导出、站长后台截图或公网 tunnel 配置
