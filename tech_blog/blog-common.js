const SERIES_LABELS = {
  'redis': 'Redis',
  'server': 'Server',
  'Spring': 'Spring',
  'Kafka': 'Kafka',
  'Design-Pattern': '디자인 패턴',
  'Markdown': 'Markdown',
  'development_tools': '개발 툴'
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

function transformCallouts(markdown) {
  const calloutRegex = /^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$\n((?:^>.*$\n?)*)/gim;
  return markdown.replace(calloutRegex, (match, rawType, rawBody) => {
    const type = rawType.toUpperCase();
    const cssType = type.toLowerCase();
    const text = rawBody
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => line.replace(/^>\s?/, ''))
      .join(' ');
    const inner = renderInlineMarkdown(text);
    return `\n<div class="callout callout-${cssType}"><div class="callout-title">${type}</div><div class="callout-body">${inner}</div></div>\n\n`;
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
