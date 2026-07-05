#!/usr/bin/env bash
#
# 블로그/포트폴리오 빌드 + 배포 스크립트
#
#   1) posts.json 매니페스트 재생성 (generate_posts.py)
#   2) 사이트 파일만 스테이징 → 커밋 → push
#
# 사용법:
#   ./publish.sh                 # 기본 커밋 메시지
#   ./publish.sh "글 추가: Kafka"  # 커밋 메시지 지정
#
# 주의: git add -A 를 쓰지 않는다.
#   개인 파일이 실수로 공개 커밋되지 않도록 아래 SITE_PATHS 만 스테이징한다.
#   새로 커밋할 사이트 파일/폴더가 생기면 SITE_PATHS 에 추가하면 된다.

set -euo pipefail

# 스크립트 위치 = 리포 루트로 이동
cd "$(dirname "$0")"

# 커밋에 포함할 "사이트 파일"만 명시 (개인 파일 제외)
SITE_PATHS=(
  "tech_blog"
  "index.html"
  "이찬우 포트폴리오"
)

# 커밋 메시지 (인자 없으면 타임스탬프 기본값)
MSG="${1:-"update site $(date '+%Y-%m-%d %H:%M')"}"

echo "==> 1/3 posts.json 재생성"
python3 tech_blog/generate_posts.py

echo "==> 2/3 사이트 파일 스테이징"
git add -- "${SITE_PATHS[@]}"

# 스테이징된 변경이 없으면 종료
if git diff --cached --quiet; then
  echo "변경 사항 없음 — 커밋할 게 없습니다."
  exit 0
fi

echo "--- 커밋될 파일 ---"
git diff --cached --name-status
echo "-------------------"

echo "==> 3/3 커밋 & push"
git commit -m "$MSG"
git push origin "$(git rev-parse --abbrev-ref HEAD)"

echo "완료 ✅  배포는 GitHub Pages 가 자동으로 진행합니다."
