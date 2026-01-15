import * as vscode from "vscode";
import { WebviewView } from "vscode";

export const brand: string = "dark-synthwave";

const keyWordForHiddens = "@builtin";
const nonce = getNonce();

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export class HiddenExtensionsProvider implements vscode.WebviewViewProvider {
  private view: WebviewView | undefined;
  private context: vscode.ExtensionContext;
  private lastVisibleValue: boolean = false;
  private readonly hideCommandText = "hideHidden";
  private readonly searchCommandName = "workbench.extensions.search";
  private readonly unfocusCommandName =
    "workbench.action.focusActiveEditorGroup";

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.view = undefined;
  }

  private async unfocusExtensionsSearch() {
    await vscode.commands.executeCommand(this.unfocusCommandName);
  }

  private async showHiddenExtensions() {
    this.updateWebview();
    await vscode.commands.executeCommand(
      this.searchCommandName,
      keyWordForHiddens
    );
  }

  private async hideHiddenExtensions() {
    this.updateWebview("collapse view to stop show");
    await vscode.commands.executeCommand(this.searchCommandName, "");
  }

  registerCommands() {
    const showExtensions = vscode.commands.registerCommand(
      `${brand}.showBuiltinFeatures`,
      () => {
        this.showHiddenExtensions();
      }
    );
    const hideExtensions = vscode.commands.registerCommand(
      `${brand}.hideBuiltinFeatures`,
      () => {
        this.hideHiddenExtensions();
      }
    );

    this.context.subscriptions.push(showExtensions, hideExtensions);
  }

  resolveWebviewView(
    webviewView: WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true,
    };
    this.view = webviewView;
    this.updateWebview();

    const visibilityTimeout = 100;

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === this.hideCommandText) {
        await this.hideHiddenExtensions();
        await this.unfocusExtensionsSearch();
      }
    });
    webviewView.onDidChangeVisibility(() => {
      setTimeout(async () => {
        if (this.lastVisibleValue !== webviewView.visible) {
          this.lastVisibleValue = webviewView.visible;
          if (this.lastVisibleValue) {
            await this.showHiddenExtensions();
            await this.unfocusExtensionsSearch();
          }
        }
      }, visibilityTimeout);
    });
  }

  updateWebview(withText: string = "Hide Builtin Features") {
    if (!this.view) {
      return;
    }
    
    const csp = `default-src 'none'; img-src ${this.view?.webview.cspSource} blob:;
      style-src 'nonce-${nonce}' ${this.view?.webview.cspSource}; script-src 'nonce-${nonce}';`;

    this.view.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="${csp}">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hidden</title>
      <style>
        <style nonce="${nonce}"/>
        body {
          color: var(--vscode-foreground);
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
          padding: 15px;
        }
        button {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 5px 10px;
          cursor: pointer;
        }
          button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        ul {
          list-style: none;
          padding: 0;
        }
      </style>
    </head>
    <body aria-label>
      <h2>Hidden Extensions</h2>
      <button id="showBtn" title="Extensions">${withText}</button>
      <script nonce='${nonce}' type='module'>
        const vscode = acquireVsCodeApi();
        document.getElementById('showBtn').addEventListener('click', () => {
          vscode.postMessage({ command: '${this.hideCommandText}' });
        });
      </script>
    </body>
    </html>`;
  }
}
