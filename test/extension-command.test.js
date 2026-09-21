'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(activeDocument, selectedDocument, openError) {
  let command;
  const titles = [];
  const opened = [];
  const warnings = [];
  const errors = [];
  const vscode = {
    commands: { registerCommand: (_, handler) => { command = handler; } },
    window: {
      activeTextEditor: activeDocument && { document: activeDocument },
      showWarningMessage: (message) => warnings.push(message),
      showErrorMessage: (message) => errors.push(message),
      createWebviewPanel: (_, title) => {
        titles.push(title);
        return {
          webview: { cspSource: 'test', onDidReceiveMessage() {} },
          onDidDispose() {}
        };
      }
    },
    workspace: {
      openTextDocument: async (uri) => {
        opened.push(uri);
        if (openError) throw openError;
        return selectedDocument;
      },
      onDidChangeTextDocument: () => ({ dispose() {} })
    },
    Uri: { joinPath: (_, ...parts) => ({ fsPath: path.join(__dirname, '..', ...parts) }) },
    ViewColumn: { Beside: 2 }
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist/extension.js'), 'utf8'), {
    exports,
    Error,
    require: (name) => name === 'vscode' ? vscode : name === './metadata' ? {} : require(name)
  });
  exports.activate({ subscriptions: [], extensionUri: {} });
  return { command, titles, opened, warnings, errors };
}

const document = (name) => ({ fileName: name, uri: { scheme: 'file' } });

test('opens the right-clicked CWL file instead of the active document', async () => {
  const selected = document('selected.cwl');
  const state = setup(document('other.cwl'), selected);
  await state.command(selected.uri);
  assert.deepEqual(state.opened, [selected.uri]);
  assert.deepEqual(state.titles, ['CWL Metadata: selected.cwl']);
});

test('opens a right-clicked CWL file without an active editor', async () => {
  const selected = document('selected.cwl');
  const state = setup(undefined, selected);
  await state.command(selected.uri);
  assert.deepEqual(state.titles, ['CWL Metadata: selected.cwl']);
});

test('palette and shortcut still use the active CWL document', async () => {
  const state = setup(document('active.cwl'));
  await state.command();
  assert.deepEqual(state.opened, []);
  assert.deepEqual(state.titles, ['CWL Metadata: active.cwl']);
});

test('rejects a selected non-CWL document instead of falling back to the active file', async () => {
  const selected = document('notes.txt');
  const state = setup(document('active.cwl'), selected);
  await state.command(selected.uri);
  assert.equal(state.warnings.length, 1);
  assert.deepEqual(state.titles, []);
});

test('reports document open failures without opening a form', async () => {
  const state = setup(undefined, undefined, new Error('File unavailable'));
  await state.command({ scheme: 'file' });
  assert.deepEqual(state.errors, ['Unable to open CWL document: File unavailable']);
  assert.deepEqual(state.titles, []);
});
