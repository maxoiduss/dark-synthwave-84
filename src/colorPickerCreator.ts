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
  private notificationShown: boolean = false;

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

        const disposed = panel.onDidDispose(() => {
          this.notificationShown = false;
        });
        const received = panel.webview.onDidReceiveMessage((message) => {
          if (message.command === commands.colorSelected) {
            if (!this.notificationShown) {
              const text = "You copied color to a clipboard.";
              vscode.window.showInformationMessage(text);
              this.notificationShown = true;
            }
            if (typeof message.value === "string") {
              vscode.env.clipboard.writeText(message.value);
            }
          }
        });
        this.context.subscriptions.push(disposed, received);
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
    const hexId = "hex";
    const inputId = "picker";

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style nonce="${nonce}">
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            align-items: stretch;
            justify-content: stretch;
            flex-direction: column;
            align-items: stretch;
            box-sizing: border-box;
            padding: 12px;
          }
          #${inputId} {
            -webkit-appearance: none;
            appearance: none;
            box-sizing: border-box;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-settings-headerBorder);
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            height: 100%;
            max-height: 600px;
            margin-bottom: auto;
            margin: 0;
            padding: 0;
          }
          #${inputId}::-webkit-color-swatch-wrapper {
            padding: 0;
          }
          #${inputId}::-webkit-color-swatch {
            border: none;
            border-radius: 2px;
            width: 100%;
            height: 100%;
          }
          #${inputId}:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -2px;
          }
          #${hexId} {
            margin-top: 10px;
            display: block;
            box-sizing: border-box;
            text-align: center;
            font-family: var(--vscode-editor-font-family);
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 2px;
            border: 1px solid var(--vscode-widget-border);
            padding: 6px;
        }
        </style>
      </head>
      <body aria-label>
        <input type="color" alpha id="${inputId}">
        <div id="${hexId}">#000000</div>
        <script nonce='${nonce}' type='module'>
          const vscode = acquireVsCodeApi();
          const picker = document.getElementById('${inputId}');
          const hexText = document.getElementById('${hexId}');
          const closePicker = () => {
            picker.type = 'text';
            picker.type = 'color';
            };
          let pickerOpened = false;
          
          picker.addEventListener('input', (e) => {
            pickerOpened = true;
            const color = e.target.value;
            hexText.innerText = color.toUpperCase();
            vscode.postMessage({
              command: '${commands.colorSelected}',
              value: color.toUpperCase()
            });
          }, { passive: true });
          document.addEventListener('click', async (e) => {
            const clickedElement = e.target;
            if (clickedElement.id === '${inputId}') {
              if (pickerOpened) {
                await new Promise(resolve => setTimeout(resolve, 50));
                closePicker();
              }
              pickerOpened = !pickerOpened;
            }
          }, { passive: true });
          window.addEventListener('blur', () => {
            if (pickerOpened) {
              pickerOpened = false;
            }
            closePicker();
          }, { passive: true });
        </script>
      </body>
      </html>`;
  }
}
