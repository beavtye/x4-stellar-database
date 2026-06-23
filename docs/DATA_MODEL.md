# 数据字段说明

完整字段清单由脚本生成，见：

```text
docs/data-fields.json
```

## 顶层结构

核心四类数据文件采用统一结构：

```json
{
  "headers": ["中文名", "英文名"],
  "data": []
}
```

派生数据：

- `sectors.json`：从分享数据中筛出星系、星区和星图定位记录。
- `lore.json`：从分享数据中筛出编年史章节、小节和卡片记录。
- `share-data.json`：分享卡使用的数据集合，已去除本地源文件路径。

## 运行时补充字段

Vue 前端会在运行时补充：

- `__source`：数据来源，原版为 `原版数据`，本地导入为 mod 包名。
- `__source_type`：来源类型，`vanilla` 或 `mod`。
- `__import_pack_id`：本地导入包 ID，仅浏览器本地使用。
- `__import_pack_name`：本地导入包名称，仅浏览器本地使用。

这些字段不写回原始 JSON。
