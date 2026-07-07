const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {
  SERIES_LABELS,
  seriesFromPath,
  seriesLabel,
  encodePath,
  fetchPostRaw,
  parseFrontmatter,
  extractTitle,
  extractExcerpt,
  extractMermaidBlocks,
  renderMermaidBlocks,
  renderInlineMarkdown,
  transformCallouts,
  fixBoldFlanking
} = require('./blog-common.js');

test('seriesFromPath extracts the top-level folder', () => {
  assert.strictEqual(seriesFromPath('redis/Redis.md'), 'redis');
  assert.strictEqual(seriesFromPath('Spring/Spring Batch.md'), 'Spring');
});

test('seriesLabel maps known series to display names', () => {
  assert.strictEqual(seriesLabel('redis'), 'Redis');
  assert.strictEqual(seriesLabel('server'), 'Server');
  assert.strictEqual(seriesLabel('Spring'), 'Spring');
});

test('seriesLabel falls back to the raw key for unknown series', () => {
  assert.strictEqual(seriesLabel('unknown'), 'unknown');
});

test('encodePath encodes each path segment but keeps slashes', () => {
  assert.strictEqual(encodePath('Spring/Spring Batch.md'), 'Spring/Spring%20Batch.md');
  assert.strictEqual(encodePath('redis/Redis.md'), 'redis/Redis.md');
});

test('fetchPostRaw returns the response body on success', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/redis/Redis.md') {
      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end('# Redis\n');
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const originalFetch = global.fetch;
  global.fetch = (url) => originalFetch(`http://localhost:${port}/${url}`);
  try {
    const content = await fetchPostRaw('redis/Redis.md');
    assert.strictEqual(content, '# Redis\n');
  } finally {
    global.fetch = originalFetch;
    server.close();
  }
});

test('fetchPostRaw throws when the response is not ok', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const originalFetch = global.fetch;
  global.fetch = (url) => originalFetch(`http://localhost:${port}/${url}`);
  try {
    await assert.rejects(() => fetchPostRaw('missing/File.md'));
  } finally {
    global.fetch = originalFetch;
    server.close();
  }
});

test('parseFrontmatter extracts date and tags', () => {
  const raw = '---\ndate: 2026-06-23\ntags:\n  - kafka\n  - redis\n---\n# Redis\n\n내용...\n';
  const { data, body } = parseFrontmatter(raw);
  assert.deepStrictEqual(data, { date: '2026-06-23', tags: ['kafka', 'redis'] });
  assert.strictEqual(body, '# Redis\n\n내용...\n');
});

test('parseFrontmatter returns empty data when there is no frontmatter', () => {
  const raw = '# Redis\n\n내용...\n';
  const { data, body } = parseFrontmatter(raw);
  assert.deepStrictEqual(data, {});
  assert.strictEqual(body, raw);
});

test('extractTitle returns the first H1 heading', () => {
  assert.strictEqual(extractTitle('# Redis\n\n내용', 'fallback'), 'Redis');
});

test('extractTitle falls back when there is no heading', () => {
  assert.strictEqual(extractTitle('내용만 있음', 'fallback-title'), 'fallback-title');
});

test('extractExcerpt strips markdown syntax and blockquotes', () => {
  const body = '# Redis\n\n> Key-Value 구조의 저장소\n\n일반 텍스트와 **굵게** 그리고 `코드`가 있다.';
  const result = extractExcerpt(body, 100);
  assert.strictEqual(result, '일반 텍스트와 굵게 그리고 코드가 있다.');
});

test('extractExcerpt truncates long text with an ellipsis', () => {
  const body = '가'.repeat(150);
  const result = extractExcerpt(body, 100);
  assert.strictEqual(result.length, 101);
  assert.ok(result.endsWith('…'));
});

test('extractMermaidBlocks replaces a mermaid fence with a placeholder token', () => {
  const input = '본문\n\n```mermaid\ngraph TD\nA-->B\n```\n\n끝';
  const { text, blocks } = extractMermaidBlocks(input);
  assert.ok(!text.includes('```mermaid'));
  assert.ok(text.includes('@@MERMAID_BLOCK_0@@'));
  assert.deepStrictEqual(blocks, ['graph TD\nA-->B\n']);
});

test('extractMermaidBlocks leaves non-mermaid code fences untouched', () => {
  const input = '```js\nconst a = 1;\n```';
  const { text, blocks } = extractMermaidBlocks(input);
  assert.strictEqual(text, input);
  assert.deepStrictEqual(blocks, []);
});

test('renderMermaidBlocks substitutes a placeholder paragraph with an escaped div', () => {
  const html = '<p>@@MERMAID_BLOCK_0@@</p>';
  const output = renderMermaidBlocks(html, ['graph TD\nA-->B\n']);
  assert.ok(output.includes('<div class="mermaid">'));
  assert.ok(output.includes('A--&gt;B'));
  assert.ok(!output.includes('@@MERMAID_BLOCK_0@@'));
});

test('renderInlineMarkdown renders inline code and bold text', () => {
  const result = renderInlineMarkdown('이것은 `코드`와 **굵게**를 포함한다.');
  assert.strictEqual(result, '이것은 <code>코드</code>와 <strong>굵게</strong>를 포함한다.');
});

test('transformCallouts converts a GitHub-style alert into a callout div', () => {
  const input = '텍스트\n\n> [!NOTE]\n> 이것은 `코드`와 **굵게**를 포함한다.\n\n끝';
  const result = transformCallouts(input);
  assert.ok(result.includes('<div class="callout callout-note">'));
  // GitHub-style: an icon precedes a Title-case label inside the title.
  assert.ok(result.includes('<div class="callout-title">'));
  assert.ok(result.includes('class="callout-icon"'));
  assert.ok(result.includes('>Note</div>'));
  assert.ok(!result.includes('>NOTE</div>'));
  assert.ok(result.includes('<code>코드</code>'));
  assert.ok(result.includes('<strong>굵게</strong>'));
  assert.ok(!result.includes('[!NOTE]'));
});

test('transformCallouts uses the matching icon and label for each alert type', () => {
  const types = [
    ['TIP', 'Tip'],
    ['IMPORTANT', 'Important'],
    ['WARNING', 'Warning'],
    ['CAUTION', 'Caution'],
  ];
  for (const [raw, label] of types) {
    const result = transformCallouts('> [!' + raw + ']\n> 본문');
    assert.ok(result.includes('class="callout-icon"'), raw + ' should have an icon');
    assert.ok(result.includes('>' + label + '</div>'), raw + ' should show ' + label);
  }
});

test('transformCallouts leaves normal blockquotes untouched', () => {
  const input = '> 그냥 인용문일 뿐이다.';
  const result = transformCallouts(input);
  assert.strictEqual(result, input);
});

const ZWSP = '​';

test('fixBoldFlanking makes bold closing after punctuation renderable', () => {
  const input = '**중간 저장소(버퍼 역할)**를 말한다.';
  const out = fixBoldFlanking(input);
  // A zero-width space is inserted right before the closing ** so CommonMark
  // treats it as a valid closer, and the visible text is unchanged.
  assert.strictEqual(out, '**중간 저장소(버퍼 역할)' + ZWSP + '**를 말한다.');
  assert.strictEqual(out.replace(/​/g, ''), input);
});

test('fixBoldFlanking fixes multiple failing spans on one line', () => {
  const input = '**생산자(Producer)**와 **소비자(Consumer)**에게';
  const out = fixBoldFlanking(input);
  assert.strictEqual(
    out,
    '**생산자(Producer)' + ZWSP + '**와 **소비자(Consumer)' + ZWSP + '**에게'
  );
});

test('fixBoldFlanking leaves already-valid bold untouched', () => {
  const inputs = [
    '**foo**bar',                         // closer preceded by a letter -> valid
    '**작업 지시(command)** 를 전달',       // closer followed by a space -> valid
    '**중간 저장소(버퍼 역할)**.',          // closer followed by punctuation -> valid
  ];
  for (const input of inputs) {
    assert.strictEqual(fixBoldFlanking(input), input);
  }
});

test('fixBoldFlanking does not touch ** inside inline code', () => {
  const input = '`a**b)**c` 코드';
  assert.strictEqual(fixBoldFlanking(input), input);
});

test('fixBoldFlanking does not touch ** inside a fenced code block', () => {
  const input = '```js\nconst x = a)**b;\n```';
  assert.strictEqual(fixBoldFlanking(input), input);
});

test('fixBoldFlanking never leaks placeholder sentinels around odd backticks', () => {
  // A doc about backticks can carry unbalanced backticks around fences; code
  // protection must not nest tokens or leak the private-use sentinels.
  const input = '`x \`\`\`js\nconst a = b)**c;\n\`\`\` z` 그리고 **끝(end)**임';
  const out = fixBoldFlanking(input);
  assert.ok(!/[\uE000\uE001]/.test(out), 'sentinel leaked into output');
  assert.strictEqual(out.replace(/\u200B/g, ''), input, 'visible text must be preserved');
})
