import * as vscode from "vscode";
import { WebviewView, WebviewViewProvider } from "vscode";
import { brand, commands } from "./extensionBrandResolver";

const keyWordForHiddens = "@builtin";
const empty = '';

const command = {
  hide: "hideHidden"
} as const;

export function getNonce() {
  let text = empty;
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function getCSP(nonce: string, cspSourceDefault: string) {
  const cspSource = cspSourceDefault;
  const csp = [
    `default-src 'none'`,
    `script-src 'nonce-${nonce}' ${cspSource}`,
    `style-src 'nonce-${nonce}' ${cspSource} 'unsafe-inline'`,
    `frame-src ${cspSource} blob: data:`,
    `connect-src ${cspSource} https: http://localhost:* http://127.0.0.1:*`
  ].join("; ");

  return csp;
}

export class HiddenExtensionsProvider implements WebviewViewProvider {
  private view: WebviewView | undefined;
  private registered: boolean = false;
  private lastViewVisibleValue: boolean = false;
  private cspSourceDefault!: string;
  private readonly collapseView = "collapse view to stop show";
  private readonly unfocus = commands.focusActiveEditorGroup;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.registerCommands();
  }

  private async unfocusExtensionsSearch() {
    await vscode.commands.executeCommand(this.unfocus);
  }

  private async showHiddenExtensions() {
    this.updateWebview();
    await vscode.commands.executeCommand(
      commands.extensionsSearch,
      keyWordForHiddens
    );
  }

  private async hideHiddenExtensions() {
    this.updateWebview(this.collapseView);
    await vscode.commands.executeCommand(
      commands.extensionsSearch,
      empty
    );
  }

  private setDefaults() {
    if (this.view) {
      if (this.view.webview.html === empty || undefined) {
        this.updateWebview();
      }
      this.view.webview.options = {
        enableScripts: true,
      };
    }
  }

  public registerCommands() {
    if (this.registered) { return; }
    
    const showExtensions = vscode.commands.registerCommand(
      brand.showBuiltinFeatures,
      () => {
        this.showHiddenExtensions();
      }
    );
    const hideExtensions = vscode.commands.registerCommand(
      brand.hideBuiltinFeatures,
      () => {
        this.hideHiddenExtensions();
      }
    );
    this.context.subscriptions.push(showExtensions, hideExtensions);
    this.registered = true;
  }

  public resolveWebviewView(
    webviewView: WebviewView,
    _context: vscode.WebviewViewResolveContext<unknown>,
    _token: vscode.CancellationToken
  ): void | Thenable<void> {
    const view = webviewView;
    this.view = view;
    this.cspSourceDefault = view.webview.cspSource;

    const visibilityTimeout = 100;

    view.webview.onDidReceiveMessage(async (message) => {
      if (message.command === command.hide) {
        await this.hideHiddenExtensions();
        await this.unfocusExtensionsSearch();
      }
    });
    view.onDidChangeVisibility(() => {
      setTimeout(async () => {
        if (this.lastViewVisibleValue !== view.visible) {
          this.lastViewVisibleValue = view.visible;
          if (this.lastViewVisibleValue) {
            await this.showHiddenExtensions();
            await this.unfocusExtensionsSearch();
          }
        }
      }, visibilityTimeout);
    });
    this.updateWebview();
    this.setDefaults();
  }

  public updateWebview(withText: string = "Hide Builtin Features") {
    if (!this.view) { return; }
    
    const nonce = getNonce();
    const csp = getCSP(nonce, this.cspSourceDefault);
    const buttonId = "showBtn";
  
    this.view.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="${csp}">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hidden</title>
      <style nonce="${nonce}">
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
      </style>
    </head>
    <body aria-label>
      <h2>Hidden Extensions</h2>
      <button id="${buttonId}" title="Extensions">${withText}</button>
      <script nonce='${nonce}' type='module'>
        const vscode = acquireVsCodeApi();
        document.getElementById('${buttonId}').addEventListener('click', () => {
          vscode.postMessage({ command: '${command.hide}' });
        }, { passive: true });
      </script>
    </body>
    </html>`;
  }
}
