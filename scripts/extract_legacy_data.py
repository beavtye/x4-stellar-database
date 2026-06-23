#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract public data from the legacy static pages.

The script intentionally reads only static HTML/JS data files and writes JSON
used by the Vue app. It does not read tokens, SQLite databases, logs, or Python
server files.
"""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LEGACY_DIR = ROOT / "public" / "legacy"
DATA_DIR = ROOT / "src" / "data"
DOCS_DIR = ROOT / "docs"
MAIN_HTML = LEGACY_DIR / "index.html"
SHARE_JS = LEGACY_DIR / "x4-share-data.js"


DATASET_FILES = {
    "ships": "ships.json",
    "weapons": "weapons.json",
    "turrets": "turrets.json",
    "equipment": "equipment.json",
}


def extract_js_object(source: str, marker: str) -> object:
    start = source.find(marker)
    if start < 0:
        raise RuntimeError(f"Cannot find marker: {marker}")
    i = source.find("{", start)
    if i < 0:
        raise RuntimeError(f"Cannot find object start after: {marker}")

    depth = 0
    in_string = False
    escape = False
    for pos in range(i, len(source)):
        ch = source[pos]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(source[i : pos + 1])
    raise RuntimeError(f"Unclosed object after marker: {marker}")


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sanitize_share_data(data: dict) -> dict:
    meta = dict(data.get("meta") or {})
    if "source" in meta:
        meta["source"] = "legacy-main-html"
    if "enrichedFrom" in meta:
        meta["enrichedFrom"] = str(meta["enrichedFrom"])
    data = dict(data)
    data["meta"] = meta
    return data


def field_summary(name: str, payload: dict) -> dict:
    rows = payload.get("data") or []
    headers = payload.get("headers") or []
    samples = {}
    for header in headers:
        for row in rows:
            value = row.get(header)
            if value not in (None, "", "—"):
                samples[header] = value
                break
    return {
        "dataset": name,
        "count": len(rows),
        "fields": [{"name": h, "sample": samples.get(h, "")} for h in headers],
    }


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    html = MAIN_HTML.read_text(encoding="utf-8")
    db = extract_js_object(html, "const DB =")

    extracted = {}
    for dataset, filename in DATASET_FILES.items():
        payload = db.get(dataset)
        if not payload:
            raise RuntimeError(f"Missing dataset: {dataset}")
        write_json(DATA_DIR / filename, payload)
        extracted[dataset] = payload

    raw_share = SHARE_JS.read_text(encoding="utf-8")
    match = re.search(r"window\.X4_SHARE_DATA\s*=\s*(\{.*\})\s*;?\s*$", raw_share, re.S)
    if not match:
        raise RuntimeError("Cannot parse x4-share-data.js")
    share_data = sanitize_share_data(json.loads(match.group(1)))
    write_json(DATA_DIR / "share-data.json", share_data)

    records = share_data.get("records") or []
    sectors = [r for r in records if r.get("type") in {"sector", "cluster", "map"}]
    lore = [r for r in records if r.get("type") in {"lore", "lore_section", "lore_box"}]
    write_json(DATA_DIR / "sectors.json", {"records": sectors, "count": len(sectors)})
    write_json(DATA_DIR / "lore.json", {"records": lore, "count": len(lore)})

    field_docs = {
        "generatedFrom": "public/legacy/index.html",
        "privacy": "仅包含公开静态资料字段；不包含站长 token、SQLite、日志、作者联系方式或后台数据。",
        "datasets": [field_summary(name, payload) for name, payload in extracted.items()],
        "derived": {
            "sectors.json": "来自 share-data.json 中 type 为 sector、cluster、map 的公开分享记录。",
            "lore.json": "来自 share-data.json 中 type 为 lore、lore_section、lore_box 的公开分享记录。",
            "share-data.json": "来自 legacy 分享卡数据，已移除本地 source 路径。",
        },
    }
    write_json(DOCS_DIR / "data-fields.json", field_docs)

    # Keep copied legacy share data runnable while removing local source path.
    legacy_text = "window.X4_SHARE_DATA = " + json.dumps(share_data, ensure_ascii=False) + ";"
    SHARE_JS.write_text(legacy_text, encoding="utf-8")

    print("Extracted datasets:")
    for name, payload in extracted.items():
        print(f"- {name}: {len(payload.get('data') or [])} rows")
    print(f"- sectors: {len(sectors)} records")
    print(f"- lore: {len(lore)} records")
    print("- share-data: sanitized")


if __name__ == "__main__":
    main()
