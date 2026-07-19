const SERIES_LABELS = {
  'Redis': 'Redis',
  'Server': 'Server',
  'Spring': 'Spring',
  'Kafka': 'Kafka',
  'Kotlin': 'Kotlin',
  'DB': 'DB',
  'Design Pattern': '디자인 패턴',
  'AI': 'AI',
  'Markdown': 'Markdown',
  'Development tools': '개발 툴'
};

function seriesFromPath(path) {
  return path.split('/')[0];
}

function seriesLabel(seriesKey) {
  return SERIES_LABELS[seriesKey] || seriesKey;
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function fetchPostRaw(path) {
  const res = await fetch(encodePath(path));
  if (!res.ok) {
    throw new Error('Failed to fetch: ' + path);
  }
  return res.text();
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { data: {}, body: raw };
  }
  const yamlBlock = match[1];
  const body = raw.slice(match[0].length);
  const data = {};
  let currentKey = null;
  yamlBlock.split(/\r?\n/).forEach((line) => {
    const listItemMatch = line.match(/^\s*-\s*(.+)$/);
    if (listItemMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(listItemMatch[1].trim());
      return;
    }
    const kvMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const value = kvMatch[2].trim();
      currentKey = key;
      data[key] = value === '' ? [] : value;
    }
  });
  return { data, body };
}

function extractTitle(body, fallback) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function extractExcerpt(body, maxLen) {
  const limit = maxLen || 100;
  const plain = body
    .replace(/^#\s+.+$/m, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^>.*$/gm, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*`>_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > limit ? plain.slice(0, limit) + '…' : plain;
}

function extractMermaidBlocks(markdown) {
  const blocks = [];
  const text = markdown.replace(/```mermaid\r?\n([\s\S]*?)```/g, (match, code) => {
    const token = `@@MERMAID_BLOCK_${blocks.length}@@`;
    blocks.push(code);
    return token;
  });
  return { text, blocks };
}

function renderMermaidBlocks(html, blocks) {
  return blocks.reduce((acc, code, i) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const div = `<div class="mermaid">\n${escaped}</div>`;
    const token = `@@MERMAID_BLOCK_${i}@@`;
    const wrapped = new RegExp(`<p>\\s*${token}\\s*</p>`);
    return wrapped.test(acc) ? acc.replace(wrapped, div) : acc.replace(token, div);
  }, html);
}

function renderInlineMarkdown(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

// CommonMark won't close a **bold** run when the closing ** is preceded by
// punctuation and immediately followed by a non-space, non-punctuation char
// (e.g. `**중간 저장소(버퍼 역할)**를`). Marked follows that rule, so such bold
// text renders as literal asterisks. We insert an invisible zero-width space
// before the offending closing ** so the run becomes a valid closer. Code
// (fenced blocks and inline code) is protected so its ** are never touched.
function fixBoldFlanking(markdown) {
  const protectedSegments = [];
  const stash = (match) => {
    // Wrap the index in private-use sentinels so the token is never mistaken
    // for punctuation by the bold regex, and restoration cannot collide with
    // real digits already in the text.
    const token = "\uE000" + protectedSegments.length + "\uE001";
    protectedSegments.push(match);
    return token;
  };
  // Protect fenced blocks and inline code in a single left-to-right pass.
  // One pass (not two) is essential: a token holds no backticks, so once a
  // fence is stashed the inline-code alternative can never span it, which keeps
  // tokens from nesting and makes the single-pass restore below exact.
  const withoutCode = markdown.replace(/```[\s\S]*?```|`[^`]*`/g, stash);

  const fixed = withoutCode.replace(
    /(\*\*(?!\s)[^*\n]*?\p{P})(\*\*)(?=[^\s\p{P}])/gu,
    "$1\u200B$2"
  );

  return fixed.replace(/\uE000(\d+)\uE001/g, (_m, i) => protectedSegments[Number(i)]);
}

// GitHub 알림 박스에 쓰는 octicon 아이콘(16px) path 데이터. 타입별로 GitHub과 동일.
const CALLOUT_ICON_PATHS = {
  NOTE: 'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
  TIP: 'M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z',
  IMPORTANT: 'M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  WARNING: 'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  CAUTION: 'M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z'
};

function calloutIcon(type) {
  const d = CALLOUT_ICON_PATHS[type];
  if (!d) return '';
  return '<svg class="callout-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="' + d + '"></path></svg>';
}

function transformCallouts(markdown) {
  const calloutRegex = /^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$\n((?:^>.*$\n?)*)/gim;
  return markdown.replace(calloutRegex, (match, rawType, rawBody) => {
    const type = rawType.toUpperCase();
    const cssType = type.toLowerCase();
    const label = type.charAt(0) + type.slice(1).toLowerCase();
    const icon = calloutIcon(type);
    const text = rawBody
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => line.replace(/^>\s?/, ''))
      .join(' ');
    const inner = renderInlineMarkdown(text);
    return `\n<div class="callout callout-${cssType}"><div class="callout-title">${icon}${label}</div><div class="callout-body">${inner}</div></div>\n\n`;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
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
  };
}
