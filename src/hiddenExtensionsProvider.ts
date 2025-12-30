import * as vscode from "vscode";
import { WebviewView } from "vscode";

export const brand: string = "dark-synthwave";

const keyWordForHiddens = "@builtin";

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
  private readonly searchCommandName = "workbench.extensions.search";
  private readonly unfocusCommandName = "workbench.action.focusActiveEditorGroup";

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.view = undefined;
  }

  registerCommands() {
    const showExtensions = vscode.commands.registerCommand(
      `${brand}.showBuiltinFeatures`,
      () => {
        vscode.commands.executeCommand(
          this.searchCommandName,
          keyWordForHiddens
        );
      }
    );
    const hideExtensions = vscode.commands.registerCommand(
      `${brand}.hideBuiltinFeatures`,
      () => {
        vscode.commands.executeCommand(this.searchCommandName, "");
      }
    );

    this.context.subscriptions.push(showExtensions, hideExtensions);
  }

  async unfocusExtensionsSearch() {
    await vscode.commands.executeCommand(
      this.unfocusCommandName
    );
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

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "hideHiddenExtensions") {
        await vscode.commands.executeCommand(this.searchCommandName, "");
        await this.unfocusExtensionsSearch();
      }
    });
    webviewView.onDidChangeVisibility(async () => {
      if (webviewView.visible) {
        await vscode.commands.executeCommand(
          this.searchCommandName,
          "@builtin"
        );
        await this.unfocusExtensionsSearch();
      } else {
        await vscode.commands.executeCommand(this.searchCommandName, "");
        await this.unfocusExtensionsSearch();
      }
    });
  }

  updateWebview() {
    if (!this.view) {
      return;
    }
    const nonce = getNonce();
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
      <button id="showBtn" title="Extensions">Hide Builtin Features</button>
      <script nonce='${nonce}' type='module'>
        const vscode = acquireVsCodeApi();
        document.getElementById('showBtn').addEventListener('click', () => {
          vscode.postMessage({ command: 'hideHiddenExtensions' });
        });
      </script>
    </body>
    </html>`;
  }
}
