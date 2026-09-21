'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMetadata, updateMetadata } = require('../dist/metadata');
const { dumpYaml } = require('../dist/yaml-cst');

test('extracts metadata with namespaced keys and ignores CWL structure', () => {
  const source = '$namespaces:\n  s: https://schema.org/\n\'@type\': s:SoftwareApplication\ns:name: Demo\ncwlVersion: v1.2\nclass: CommandLineTool\ninputs: {}\noutputs: {}\n';
  const metadata = parseMetadata(source);
  assert.equal(metadata['s:name'], 'Demo');
  assert.equal(metadata.class, undefined);
});

test('updates metadata while preserving non-metadata CWL bytes', () => {
  const body = 'cwlVersion: v1.2\nclass: CommandLineTool\n# preserve me\nbaseCommand: echo\ninputs:\n  message: string\noutputs: {}\n';
  const source = 's:name: Old\ns:description: old text\n\n' + body;
  const updated = updateMetadata(source, {
    '$namespaces': { s: 'https://schema.org/' },
    '@type': 's:SoftwareApplication',
    's:name': 'New'
  });
  assert.ok(updated.endsWith(body));
  assert.equal(parseMetadata(updated)['s:name'], 'New');
  assert.ok(!updated.includes('old text'));
});

test('removes interleaved metadata using CST ranges without reformatting CWL', () => {
  const source = [
    'cwlVersion: v1.2',
    's:name: Old',
    'class: CommandLineTool',
    'inputs: { message: string } # inline comment',
    's:softwareVersion: 0.1.0',
    'outputs: {}',
    ''
  ].join('\n');
  const updated = updateMetadata(source, { 's:name': 'New' });
  assert.equal(updated, 's:name: "New"\n\ncwlVersion: v1.2\nclass: CommandLineTool\ninputs: { message: string } # inline comment\noutputs: {}\n');
});

test('quotes keys and values that begin with a YAML reserved character', () => {
  const reserved = ['@', '{', '}', '[', ']', ':', '#', '&', '*', '!', '%', '|', '>', '?', '-', '<', '=', ',', '`'];
  const value = Object.fromEntries(reserved.map((character, index) => [character + 'key', character + 'value-' + index]));
  const output = dumpYaml(value);

  reserved.forEach((character, index) => {
    assert.ok(output.includes(`${JSON.stringify(character + 'key')}: ${JSON.stringify(character + 'value-' + index)}\n`));
  });
});

test('parses people and mixed keyword metadata without losing nested fields', () => {
  const source = [
    's:author:',
    '  - \'@type\': s:Person',
    '    s:givenName: Ada',
    '    s:familyName: Lovelace',
    '    s:email: ada@example.org',
    '    s:affiliation:',
    '      \'@type\': s:Organization',
    '      s:name: Analytical Engine Society',
    's:contributor:',
    '  - class: s:Role',
    '    s:roleName: Custom role',
    '    s:contributor:',
    '      class: s:Person',
    '      s:givenName: Grace',
    '      s:familyName: Hopper',
    's:keywords:',
    '  - CWL',
    '  - \'@type\': s:DefinedTerm',
    '    s:name: Atmospheric temperature',
    '    s:termCode: example-concept-id',
    '    s:inDefinedTermSet: https://example.org/terms',
    'cwlVersion: v1.2',
    'class: Workflow',
    ''
  ].join('\n');

  const metadata = parseMetadata(source);
  assert.deepEqual(metadata['s:author'], [{
    '@type': 's:Person',
    's:givenName': 'Ada',
    's:familyName': 'Lovelace',
    's:email': 'ada@example.org',
    's:affiliation': {
      '@type': 's:Organization',
      's:name': 'Analytical Engine Society'
    }
  }]);
  assert.deepEqual(metadata['s:contributor'], [{
    class: 's:Role',
    's:roleName': 'Custom role',
    's:contributor': {
      class: 's:Person',
      's:givenName': 'Grace',
      's:familyName': 'Hopper'
    }
  }]);
  assert.deepEqual(metadata['s:keywords'], [
    'CWL',
    {
      '@type': 's:DefinedTerm',
      's:name': 'Atmospheric temperature',
      's:termCode': 'example-concept-id',
      's:inDefinedTermSet': 'https://example.org/terms'
    }
  ]);
});

test('double-quotes single-line string values and preserves their contents when reopened', () => {
  const metadata = {
    's:name': 'Demo',
    's:description': 'A "quoted" description\nwith a backslash \\ and tab\tending\n',
    's:dateCreated': '2026-09-21',
    's:softwareVersion': '1.0',
    's:keywords': ['science', '2026-09-21', '', 'true', '42'],
    's:author': [{ '@type': 's:Person', 's:givenName': 'Ada' }]
  };
  const output = updateMetadata('', metadata);
  assert.ok(output.includes('s:name: "Demo"\n'));
  assert.ok(output.includes('s:dateCreated: "2026-09-21"\n'));
  assert.ok(output.includes('s:softwareVersion: "1.0"\n'));
  assert.ok(output.includes('s:description: |\n  A "quoted" description\n  with a backslash \\ and tab\tending\n'));
  for (const keyword of metadata['s:keywords']) {
    assert.ok(output.includes('  - ' + JSON.stringify(keyword) + '\n'));
  }
  assert.ok(output.includes('    s:givenName: "Ada"\n'));
  assert.deepEqual(parseMetadata(output), metadata);
});

test('quotes root strings while preserving non-string scalar types everywhere', () => {
  assert.equal(dumpYaml('2026-09-21'), '"2026-09-21"\n');
  assert.equal(dumpYaml({ count: 42, enabled: true, missing: null }), 'count: 42\nenabled: true\nmissing: null\n');
  assert.equal(dumpYaml(['text', 42, true, false, null]), '- "text"\n- 42\n- true\n- false\n- null\n');
  for (const value of [42, true, false, null]) {
    assert.equal(dumpYaml(value), String(value) + '\n');
  }
});

test('uses literal blocks with chomping that preserves multiline contents', () => {
  const cases = [
    ['first\nsecond', '|-'],
    ['first\nsecond\n', '|'],
    ['first\nsecond\n\n', '|+'],
    ['  indented\n    deeper\n\nlast  ', '|2-'],
    ['\nfirst\n\nsecond\n', '|'],
    ['\n', '|+'],
    ['\n\n', '|+']
  ];
  const body = 'cwlVersion: v1.2\nclass: Workflow\ninputs: {}\noutputs: {}\n';
  for (const [value, header] of cases) {
    const metadata = {
      's:description': value,
      's:keywords': [value, 'single line'],
      's:author': [{ 's:description': value, 's:name': 'Ada' }],
      's:contributor': [{ 's:description': value }]
    };
    const output = updateMetadata(body, metadata);
    assert.ok(output.includes(`s:description: ${header}\n`));
    assert.ok(output.endsWith(body));
    assert.deepEqual(parseMetadata(output), metadata, JSON.stringify(value));
    assert.equal(updateMetadata(output, parseMetadata(output)), output);
    assert.deepEqual(parseMetadata(updateMetadata('', metadata)), metadata);
  }
  assert.equal(dumpYaml('first\nsecond'), '|-\n  first\n  second\n');
});

test('preserves existing literal content including blank lines and indentation', () => {
  const source = 's:description: |\n    First line\n\n      Indented line\n    Last line\ns:name: Demo\n';
  const metadata = parseMetadata(source);
  assert.equal(metadata['s:description'], 'First line\n\n  Indented line\nLast line\n');
  assert.deepEqual(parseMetadata(updateMetadata(source, metadata)), metadata);
});
