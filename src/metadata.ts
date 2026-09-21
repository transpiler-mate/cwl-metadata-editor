import { dumpYaml, parseEntry, topLevelEntries } from './yaml-cst';

export const METADATA_KEYS = [
  '$namespaces', '@type', 's:name', 's:description', 's:dateCreated', 's:license',
  's:identifier', 's:sameAs', 's:keywords', 's:operatingSystem',
  's:softwareRequirements', 's:softwareVersion', 's:softwareHelp', 's:publisher',
  's:author', 's:contributor'
] as const;
export type MetadataKey = typeof METADATA_KEYS[number];
export type Metadata = Partial<Record<MetadataKey, unknown>>;
const metadataKeySet = new Set<string>(METADATA_KEYS);

export function parseMetadata(source: string): Metadata {
  const output: Metadata = {};
  for (const entry of topLevelEntries(source)) {
    if (!entry.key || !metadataKeySet.has(entry.key)) continue;
    const parsed = parseEntry(entry);
    output[entry.key as MetadataKey] = parsed[entry.key];
  }
  return output;
}

export function stringifyMetadata(metadata: Metadata): string {
  const clean: Record<string, unknown> = {};
  for (const key of METADATA_KEYS) if (Object.prototype.hasOwnProperty.call(metadata, key)) clean[key] = metadata[key];
  if (!Object.keys(clean).length) return '';
  const rendered = dumpYaml(clean);
  // A trailing blank content line already separates metadata from the CWL body.
  // Adding or trimming newlines here would change a final keep-chomp literal block.
  return rendered + (/\n[ \t]+\n$/.test(rendered) ? '' : '\n');
}

export function updateMetadata(source: string, metadata: Metadata): string {
  const remainder = topLevelEntries(source)
    .filter((entry) => !entry.key || !metadataKeySet.has(entry.key))
    .map((entry) => entry.text)
    .join('')
    .replace(/^(?:[ \t]*\r?\n)+/, '');
  return stringifyMetadata(metadata) + remainder;
}
