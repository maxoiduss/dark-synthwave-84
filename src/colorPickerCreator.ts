import * as vscode from "vscode";
import { ExtensionContext } from "vscode";
import { brand } from "./extensionBrandResolver";
import { getNonce, getCSP } from "./hiddenExtensionsProvider";

const title: string = "Color Picker";
const viewType: string = "colorPicker";

const commands = {
  colorSelected: "colorSelected"
} as const;

export class ColorPickerCreator implements vscode.Disposable {
  private static created: vscode.Disposable;

  private cspSourceDefault!: string;

  constructor(private readonly context: ExtensionContext) { }

  public create() {
    ColorPickerCreator.created = vscode.commands.registerCommand(
      brand.openColorPicker, () => {
        const panel = vscode.window.createWebviewPanel(
            viewType, title,
            vscode.ViewColumn.Beside,
            {
              enableScripts: true,
              retainContextWhenHidden: true
            }
        );
        this.cspSourceDefault = panel.webview.cspSource;

        panel.webview.html = this.getWebviewContent();
        panel.webview.onDidReceiveMessage((message) => {
          if (message.command === commands.colorSelected) {
            vscode.window.showInformationMessage(`Selected Color: ${message.value}`);
          }
        });
      }
    );
    this.context.subscriptions.push(ColorPickerCreator.created);
  }

  public dispose() {
    ColorPickerCreator.created.dispose();
  }

  private getWebviewContent() {
    const nonce = getNonce();
    const csp = getCSP(nonce, this.cspSourceDefault);
    const hexId = "picker";
    const inputId = "hex";

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          <style nonce="${nonce}"/>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
          }
          h2 {
            font-weight: normal;
            font-size: 1.5rem;
            margin-bottom: 20px;
          }
          #picker {
            border: 1px solid var(--vscode-settings-headerBorder);
            background: var(--vscode-input-background);
            cursor: pointer;
            border-radius: 4px;
            padding: 4px;
          }
          #picker:focus {
            outline: 1px solid var(--vscode-focusBorder);
          }
          #hex {
            margin-top: 15px;
            padding: 4px 8px;
            font-family: var(--vscode-editor-font-family);
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 2px;
            border: 1px solid var(--vscode-widget-border);
          }
        </style>
      </head>
      <body>
        <input type="color" id="${inputId}">
        <p id="${hexId}">#000000</p>
        <script nonce='${nonce}' type='module'  >
          const vscode = acquireVsCodeApi();
          const picker = document.getElementById('${inputId}}');
          const hexText = document.getElementById('${hexId}');

          picker.addEventListener('input', (e) => {
            const color = e.target.value;
            hexText.innerText = color;
            vscode.postMessage({ command: '${commands.colorSelected}', value: color });
          });
        </script>
      </body>
      </html>`;
  }
}
