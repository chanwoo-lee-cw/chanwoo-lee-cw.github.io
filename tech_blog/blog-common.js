const SERIES_LABELS = {
  redis: 'Redis',
  server: 'Server',
  Spring: 'Spring'
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
    transformCallouts
  };
}
