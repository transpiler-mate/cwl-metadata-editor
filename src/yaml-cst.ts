export interface TopLevelEntry {
  key: string | null;
  start: number;
  end: number;
  text: string;
}

function keyOf(line: string): string | null {
  const match = line.match(/^([^\s#][^\n]*?):(?=\s|$)/);
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

export function topLevelEntries(source: string): TopLevelEntry[] {
  const lines = source.match(/.*(?:\n|$)/g)?.filter(Boolean) ?? [];
  const entries: TopLevelEntry[] = [];
  let offset = 0;
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    const key = keyOf(line.replace(/\r?\n$/, ''));
    const start = offset;
    offset += line.length;
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      const stripped = next.replace(/\r?\n$/, '');
      if (stripped && !/^\s/.test(stripped) && keyOf(stripped)) break;
      offset += next.length;
      j += 1;
    }
    entries.push({ key, start, end: offset, text: source.slice(start, offset) });
    i = j;
  }
  return entries;
}

function scalar(text: string): unknown {
  const value = text.trim();
  if (value === '' || value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try { return value.startsWith('"') ? JSON.parse(value) : value.slice(1, -1).replace(/''/g, "'"); }
    catch { return value.slice(1, -1); }
  }
  if (value === '{}') return {};
  if (value === '[]') return [];
  return value;
}

const blockHeader = /^[|>](?:[1-9][+-]?|[+-][1-9]?)?$/;

function parseBlockScalar(lines: string[], start: number, indent: number, header: string): { value: string; index: number } {
  let index = start;
  const explicitIndent = header.match(/[1-9]/);
  const firstContent = lines.slice(start).find((line) => line.trim());
  const firstIndent = firstContent?.match(/^ */)?.[0].length ?? 0;
  const contentIndent = explicitIndent ? indent + Number(explicitIndent[0])
    : firstIndent > indent ? firstIndent : indent + 2;
  const chunks: string[] = [];
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() && (line.match(/^ */)?.[0].length ?? 0) < contentIndent) break;
    chunks.push(line.slice(contentIndent));
    index += 1;
  }
  let value = chunks.join(header.startsWith('>') ? ' ' : '\n') + (chunks.length ? '\n' : '');
  if (!header.includes('+')) {
    value = value.replace(/\n+$/, '');
    if (!header.includes('-') && chunks.some((chunk) => chunk !== '')) value += '\n';
  }
  return { value, index };
}

function parseBlock(lines: string[], start: number, indent: number): { value: unknown; index: number } {
  let index = start;
  let container: unknown[] | Record<string, unknown> | undefined;
  while (index < lines.length) {
    const raw = lines[index];
    if (!raw.trim() || raw.trimStart().startsWith('#')) { index += 1; continue; }
    const currentIndent = raw.match(/^\s*/)?.[0].length ?? 0;
    if (currentIndent < indent) break;
    if (currentIndent > indent) { index += 1; continue; }
    const text = raw.slice(indent);
    const isList = text.startsWith('- ') || text === '-';
    if (container === undefined) container = isList ? [] : {};
    if (isList && Array.isArray(container)) {
      const rest = text === '-' ? '' : text.slice(2);
      if (!rest) {
        const child = parseBlock(lines, index + 1, indent + 2);
        container.push(child.value); index = child.index; continue;
      }
      if (blockHeader.test(rest)) {
        const child = parseBlockScalar(lines, index + 1, indent, rest);
        container.push(child.value); index = child.index; continue;
      }
      const inlineKey = keyOf(rest);
      if (inlineKey) {
        const item: Record<string, unknown> = {};
        const colon = rest.indexOf(':', inlineKey.indexOf(':') + 1);
        const after = rest.slice(colon + 1).trim();
        if (blockHeader.test(after)) {
          const child = parseBlockScalar(lines, index + 1, indent + 2, after);
          item[inlineKey] = child.value; index = child.index - 1;
        }
        else if (after) item[inlineKey] = scalar(after);
        else {
          const child = parseBlock(lines, index + 1, indent + 4);
          item[inlineKey] = child.value; index = child.index - 1;
        }
        const following = parseBlock(lines, index + 1, indent + 2);
        if (following.value && !Array.isArray(following.value) && typeof following.value === 'object') Object.assign(item, following.value);
        container.push(item); index = following.index; continue;
      }
      container.push(scalar(rest)); index += 1; continue;
    }
    if (Array.isArray(container)) { index += 1; continue; }
    const key = keyOf(text);
    if (!key) { index += 1; continue; }
    const colon = text.indexOf(':', key.indexOf(':') + 1);
    const after = text.slice(colon + 1).trim();
    if (blockHeader.test(after)) {
      const child = parseBlockScalar(lines, index + 1, indent, after);
      container[key] = child.value; index = child.index; continue;
    }
    if (after) { container[key] = scalar(after); index += 1; continue; }
    const child = parseBlock(lines, index + 1, indent + 2);
    container[key] = child.value === undefined ? null : child.value; index = child.index;
  }
  return { value: container, index };
}

export function parseEntry(entry: TopLevelEntry): Record<string, unknown> {
  return (parseBlock(entry.text.replace(/\r?\n$/, '').split(/\r?\n/), 0, 0).value ?? {}) as Record<string, unknown>;
}

const yamlReservedInitials = new Set('@{}[]:#&*!%|>?-<=,`');

function quote(value: unknown): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function renderScalar(value: unknown, indent: number): string {
  if (typeof value !== 'string' || !value.includes('\n')) return quote(value) + '\n';
  const trailingNewlines = value.match(/\n+$/)?.[0].length ?? 0;
  const chomping = trailingNewlines === 0 ? '-' : trailingNewlines > 1 || /^\n+$/.test(value) ? '+' : '';
  // An explicit indentation indicator preserves leading spaces in the content.
  const indentation = /^[ \t]/m.test(value) ? '2' : '';
  const lines = (value.endsWith('\n') ? value.slice(0, -1) : value).split('\n');
  return `|${indentation}${chomping}\n` + lines.map((line) => ' '.repeat(indent + 2) + line + '\n').join('');
}

function quoteKey(key: string): string {
  if (key === '' || yamlReservedInitials.has(key[0]) || /^\s|\s$/.test(key)) return JSON.stringify(key);
  return key;
}

export function dumpYaml(value: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return pad + '[]\n';
    return value.map((item) => {
      if (item && typeof item === 'object') {
        const rendered = dumpYaml(item, indent + 2).split('\n');
        const tail = rendered.slice(1).filter(Boolean);
        return pad + '- ' + rendered[0].trimStart() + '\n' + tail.join('\n') + (tail.length ? '\n' : '');
      }
      return pad + '- ' + renderScalar(item, indent);
    }).join('');
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return pad + '{}\n';
    return entries.map(([key, item]) => {
      const renderedKey = quoteKey(key);
      if (item && typeof item === 'object') return `${pad}${renderedKey}:\n${dumpYaml(item, indent + 2)}`;
      return `${pad}${renderedKey}: ${renderScalar(item, indent)}`;
    }).join('');
  }
  return pad + renderScalar(value, indent);
}
