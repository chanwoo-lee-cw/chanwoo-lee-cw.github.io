# 기술블로그 사용 매뉴얼

## 동작 원리

`index.html`과 `post.html`은 `posts.js`의 `POSTS` 배열에 적힌 경로를 하나씩 `fetch()`로 읽어와서
마크다운을 파싱 후 화면에 렌더링합니다. 즉 별도 빌드 과정 없이, **브라우저가 매 요청마다
`.md` 파일을 직접 읽는 구조**입니다.

## 새 글 추가하는 법

1. `tech_blog/<시리즈명>/` 아래에 `.md` 파일을 추가합니다. (예: `Spring/새글.md`)
   - 시리즈명은 `blog-common.js`의 `SERIES_LABELS`에 매핑되어 있는 `redis`, `server`, `Spring` 중 하나를 폴더명으로 써야 탭 이름이 예쁘게 나옵니다. 새 시리즈를 추가하려면 `SERIES_LABELS`에도 키를 추가하세요.
2. 파일 맨 위에 frontmatter를 넣습니다 (선택이지만 권장):
   ```
   ---
   created_at: 2026-07-01    # 생성일(작성일)
   updated_at: 2026-07-01    # 수정일 (created_at과 같으면 화면에 안 뜸)
   tags:
     - redis
     - cache
   ---
   ```
3. `posts.js`의 `POSTS` 배열에 **`tech_blog` 폴더 기준 상대경로**를 정확히 추가합니다.
   ```js
   const POSTS = [
     'redis/Redis.md',
     'Spring/새글.md',   // 새로 추가
   ];
   ```
   - 대소문자, 띄어쓰기, 확장자까지 실제 파일명과 100% 일치해야 합니다. 하나라도 다르면 해당 글만 조용히 로드 실패합니다(콘솔에 `Failed to load post ...` 에러만 찍히고 화면엔 표시 안 됨).

## ⚠️ "글이 안 보여요" 가장 흔한 원인

**`index.html`을 더블클릭해서 `file:///...` 주소로 열면 글이 하나도 안 뜹니다.**

이유: `fetch()`로 로컬 `.md` 파일을 읽는데, 브라우저가 `file://` 스킴에서는 보안상
로컬 파일 읽기를 차단하기 때문입니다. GitHub Pages처럼 실제 `http(s)://`로 서빙될 때는
정상 동작합니다.

### 로컬에서 확인하는 방법 (택 1)

```bash
# tech_blog 폴더가 아니라 저장소 루트에서 실행
cd chanwoo-lee-cw.github.io-master
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000/tech_blog/index.html 접속
```

또는

```bash
npx serve .
```

또는 VS Code의 "Live Server" 확장 사용.

### 확인 체크리스트

- 주소창이 `http://` 또는 `https://`로 시작하는지 확인 (`file://`이면 실패)
- 브라우저 개발자도구(F12) → Console 탭에 `Failed to load post ...` 에러가 있는지 확인
  → 있다면 해당 경로의 파일명/폴더명이 `posts.js`와 실제 파일이 불일치하는 것
- GitHub Pages에 push하면 자동으로 `https://`로 서빙되므로 별도 조치 없이 정상 동작합니다.

## 글 상세 페이지 (post.html)

목록에서 카드를 클릭하면 `post.html?path=<인코딩된 경로>`로 이동하며, 같은 방식으로
해당 파일 하나만 `fetch`해서 렌더링합니다(마크다운 렌더링은 `marked`, 코드 하이라이트는
`highlight.js`, ` ```mermaid ` 블록은 `mermaid.js`로 그려줍니다). 별도 등록 없이
`posts.js`에 경로만 있으면 자동으로 상세 페이지도 열립니다.
