#!/usr/bin/env python3
"""tech_blog 매니페스트 생성기.

posts.js 의 POSTS 배열(순서 = 목록 노출 순서)을 입력으로 받아,
각 마크다운의 프론트매터/제목/요약을 뽑아 posts.json 하나로 만든다.

목록 페이지(index.html)는 이 posts.json 한 개만 받으므로,
글이 아무리 많아져도 목록 로딩 요청은 항상 1번이다.

글을 추가/수정/삭제한 뒤 커밋 전에 실행:
    python3 tech_blog/generate_posts.py
"""
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
POSTS_JS = os.path.join(BASE, "posts.js")
OUT_JSON = os.path.join(BASE, "posts.json")

FRONTMATTER_RE = re.compile(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n?")
KV_RE = re.compile(r"^([A-Za-z0-9_]+):\s*(.*)$")
LIST_ITEM_RE = re.compile(r"^\s*-\s*(.+)$")
TITLE_RE = re.compile(r"^#\s+(.+)$", re.M)


def read_posts_list():
    """posts.js 에서 따옴표로 감싼 .md 경로들을 등장 순서대로 뽑는다."""
    with open(POSTS_JS, encoding="utf-8") as f:
        txt = f.read()
    return re.findall(r"'([^']+\.md)'", txt)


def parse_frontmatter(raw):
    """blog-common.js 의 parseFrontmatter 와 동일한 규칙."""
    m = FRONTMATTER_RE.match(raw)
    if not m:
        return {}, raw
    yaml_block = m.group(1)
    body = raw[m.end():]
    data = {}
    current_key = None
    for line in re.split(r"\r?\n", yaml_block):
        item = LIST_ITEM_RE.match(line)
        if item and current_key is not None:
            if not isinstance(data.get(current_key), list):
                data[current_key] = []
            data[current_key].append(item.group(1).strip())
            continue
        kv = KV_RE.match(line)
        if kv:
            key = kv.group(1)
            value = kv.group(2).strip()
            current_key = key
            data[key] = [] if value == "" else value
    return data, body


def extract_title(body, fallback):
    m = TITLE_RE.search(body)
    return m.group(1).strip() if m else fallback


def extract_excerpt(body, max_len=100):
    plain = re.sub(r"^#\s+.+$", "", body, count=1, flags=re.M)
    plain = re.sub(r"```[\s\S]*?```", " ", plain)
    plain = re.sub(r"^>.*$", " ", plain, flags=re.M)
    plain = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", plain)
    plain = re.sub(r"[#*`>_~]", "", plain)
    plain = re.sub(r"\s+", " ", plain).strip()
    return plain[:max_len] + "…" if len(plain) > max_len else plain


def series_from_path(path):
    return path.split("/")[0]


def build():
    listed = read_posts_list()
    posts = []
    for path in listed:
        fp = os.path.join(BASE, path)
        if not os.path.isfile(fp):
            print("  [!] 파일 없음, 건너뜀:", path)
            continue
        with open(fp, encoding="utf-8") as f:
            raw = f.read()
        data, body = parse_frontmatter(raw)
        filename = os.path.splitext(os.path.basename(path))[0]
        tags = data.get("tags")
        posts.append({
            "path": path,
            "series": series_from_path(path),
            "title": extract_title(body, filename),
            "date": data["created_at"] if isinstance(data.get("created_at"), str) else "",
            "updated": data["updated_at"] if isinstance(data.get("updated_at"), str) else "",
            "tags": tags if isinstance(tags, list) else [],
            "excerpt": extract_excerpt(body, 100),
        })

    # 목록 노출은 작성일(created_at) 기준 최신순.
    # 같은 날짜는 posts.js 원본 순서를 유지(파이썬 정렬은 stable),
    # 날짜 없는 글은 맨 뒤로 밀린다.
    posts.sort(key=lambda p: p["date"] or "", reverse=True)

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("생성 완료: {}개 글 → {}".format(len(posts), os.path.relpath(OUT_JSON, BASE)))

    # posts.js 에 빠진 디스크상의 글 경고
    on_disk = set()
    for root, _, files in os.walk(BASE):
        for name in files:
            if name.endswith(".md") and name != "README.md":
                on_disk.add(os.path.relpath(os.path.join(root, name), BASE))
    missing = sorted(on_disk - set(listed))
    if missing:
        print("\n[알림] posts.js 에 없는 글(목록에 안 나옴):")
        for m in missing:
            print("  -", m)


if __name__ == "__main__":
    build()
