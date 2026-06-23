# 贡献说明

## 基本原则

- 优先保持功能清晰、可维护，不做难读的特效页。
- 普通贡献者优先修改 `src/data/*.json`，或通过 Issue/PR 提交补充和修正。
- 数据字段需要遵守 `docs/DATA_MODEL.md`，字段清单和样例见 `docs/data-fields.json`。
- 大功能先开 issue 讨论，再开始实现。
- 每次迁移一个模块后都要运行 `npm run build`。

## 不要提交的内容

不要提交：

- `node_modules/`
- `dist/`
- `.env`、`.env.*`
- token、作者密钥、站长后台配置
- SQLite 数据库
- 日志文件
- 私有联系方式导出

`.env.example` 可以提交，用于说明需要哪些环境变量。

## 推荐开发流程

1. 创建分支。
2. 只改一个功能模块、一个数据集，或一个文档主题。
3. 本地安装依赖：

```powershell
npm install
```

4. 启动开发环境：

```powershell
npm run dev
```

5. 验证核心流程：

- 切换数据集
- 搜索
- 筛选
- 排序
- 表格/卡片切换
- 打开详情抽屉
- 勾选两条数据并打开对比
- 导出 CSV
- 导入一份小型 CSV 或 JSON

6. 提交前运行：

```powershell
npm run build
```

## 后端接口约定

Vue 前端只通过 `fetch` 调用现有 Python 审核服务：

- `POST /api/proposals`
- `POST /api/mod-packages`
- `GET /api/mod-packages`

不要在 Vue 工程里重写 `review_server.py`。

## 数据导入格式

mod 导入支持：

- CSV
- JSON 数组
- 包含 `datasets` 对象的 JSON

推荐 JSON 包格式：

```json
{
  "datasets": {
    "ships": [],
    "weapons": [],
    "turrets": [],
    "equipment": []
  }
}
```

字段名优先使用 `docs/DATA_MODEL.md` 和 `docs/data-fields.json` 中记录的字段。
