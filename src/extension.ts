import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Metadata, parseMetadata, updateMetadata } from './metadata';

function isCwl(document: vscode.TextDocument): boolean {
  return document.uri.scheme === 'file'
    && document.fileName.toLowerCase().endsWith('.cwl');
}

function nonce(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function webviewHtml(template: string, webview: vscode.Webview): string {
  const token = nonce();
  return template
    .replace('__CSP__', `default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${token}'; connect-src https://api.ror.org https://pub.orcid.org;`)
    .replaceAll('__NONCE__', token);
}

async function openEditor(context: vscode.ExtensionContext, uri?: vscode.Uri): Promise<void> {
  let document: vscode.TextDocument | undefined;
  try {
    document = uri
      ? await vscode.workspace.openTextDocument(uri)
      : vscode.window.activeTextEditor?.document;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Unable to open CWL document: ${message}`);
    return;
  }

  if (!document || !isCwl(document)) {
    void vscode.window.showWarningMessage('Open a local .cwl file before starting the CWL Metadata Editor.');
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'cwlMetadataEditor',
    `CWL Metadata: ${path.basename(document.fileName)}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
    }
  );

  const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'editor.html').fsPath;
  panel.webview.html = webviewHtml(fs.readFileSync(htmlPath, 'utf8'), panel.webview);

  let applying = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const sendCurrent = (): void => {
    try {
      void panel.webview.postMessage({ type: 'loadMetadata', metadata: parseMetadata(document.getText()) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Cannot parse CWL YAML: ${message}`);
    }
  };

  panel.webview.onDidReceiveMessage((message: { type?: string; metadata?: Metadata }) => {
    if (message.type === 'ready') {
      sendCurrent();
      return;
    }
    if (message.type !== 'metadataChanged') return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        applying = true;
        const current = document.getText();
        const updated = updateMetadata(current, message.metadata ?? {});
        if (updated === current) return;

        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          document.uri,
          new vscode.Range(document.positionAt(0), document.positionAt(current.length)),
          updated
        );
        await vscode.workspace.applyEdit(edit);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Unable to update CWL metadata: ${messageText}`);
      } finally {
        applying = false;
      }
    }, 200);
  });

  const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
    if (!applying && event.document.uri.toString() === document.uri.toString()) {
      sendCurrent();
    }
  });

  panel.onDidDispose(() => {
    if (timer) clearTimeout(timer);
    changeSubscription.dispose();
  });
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('cwlMetadataEditor.open', (uri?: vscode.Uri) => openEditor(context, uri))
  );
}

export function deactivate(): void {}
