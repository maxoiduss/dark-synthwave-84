import * as vscode from "vscode";
import { ConfigurationTarget, ExtensionContext, WebviewPanel } from "vscode";
import { brand, commands } from "./extensionBrandResolver";
import { getNonce, getCSP } from "./hiddenExtensionsProvider";
import { ConfigurationManager } from "./configurationManager";

const title: string = "Editor Rulers";
const viewType: string = "editorRulers";
const rulerPrefix: string = "ruler-";
const defaultColor: string = "--vscode-editorIndentGuide-background1";

const tag = {
  name: "editor",
  scheme: "rulers"
} as const;

const command = {
  update: "update",
  setup: "setup",
  ready: "ready",
  empty: "empty"
} as const;

const scope = {
  global: "global",
  wspace: "workspace"
} as const;

const range = {
  min: 0,
  max: 240
} as const;

function getWebviewContent(cspSource: string) {
  const nonce = getNonce();
  const csp = getCSP(nonce, cspSource);
  const noRulerText = "No rulers defined.";
  const columnText = 'Column: ';
  const addText = "Add Ruler";
  const globText = "GLOBAL";
  const wrksText = "WORKSPACE";
  const globHover = "Show Global Scope";
  const wrksHover = "Show Workspace Scope";
  const editHover = "Edit Column";
  const delHover = "Delete Ruler";
  /// non-text parameters
  const addG = "add-" + scope.global;
  const addW = "add-" + scope.wspace;
  const globTabId = "tab-" + scope.global;
  const wrksTabId = "tab-" + scope.wspace;
  const viewGId = "view-" + scope.global;
  const viewWId = "view-" + scope.wspace;
  const lst = "list-";
  const listGId = lst + scope.global;
  const listWId = lst + scope.wspace;
  const rulerDel = rulerPrefix + "delete";
  const rulerRow = rulerPrefix + "row";
  const rulerVal = rulerPrefix + "value";
  const rulerValNum = rulerPrefix + "number";
  const rulerWrap = rulerPrefix + "wrapper";
  const rulerColor = rulerPrefix + "color";
  const rulerLabel = rulerPrefix + "label";
  const rulerSlider = rulerPrefix + "slider";
  const tabClass = "tab";
  const tabsClass = "tabs";
  const viewClass = "view";
  const actnsClass = "actions";
  const emptyClass = "empty";
  const ctrlsClass = "controls";
  const sldrGClass = "slider-group";
  
  return `<!DOCTYPE html>
  <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="${csp}" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style nonce="${nonce}">
          :root {
            --gap: 12px;
          }
          body {
            margin: 0;
            padding: 12px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
          }
          .${tabsClass} {
            display: flex;
            border: 1px solid var(--vscode-tab-activeBorder);
            width: fit-content;
            margin-bottom: 12px;
            border-radius: 4px;
            overflow: hidden;
          }
          .${tabClass} {
            flex: 1;
            padding: 6px 10px;
            border-width: 0px;
            cursor: pointer;
            outline: none;
            user-select: none;
            color: var(--vscode-foreground);
            background: transparent;
          }
          .${tabClass}[aria-selected="true"] {
            background: var(--vscode-button-background);
            border-color: var(--vscode-button-foreground);
            border-width: 1px;
            border-radius: 3px;
          }
          .${viewClass} {
            display: none;
          }
          .${viewClass}[aria-hidden="false"] {
            display: block;
          }
          .${sldrGClass} {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }  
          .${rulerRow} {
            display: flex;
            align-items: center;
            gap: var(--gap);
            padding: 10px 1px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          .${rulerLabel} {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
          }
          .${rulerValNum} {
            display: none;
            width: 36px;
          }
          .${ctrlsClass} {
            display: flex;
            align-items: center;
            gap: 2px;
          }
          .${emptyClass}} {
            color: var(--vscode-descriptionForeground);
            padding: 8px;
          }
          .${actnsClass} {
            margin-top: 10px;
          }
          input[type="color"] {
            width: 40px;
            height: 35px;
            padding: 1px;
            margin-right: 5px;
            border-radius: 4px;
            border: 1px solid var(--vscode-settings-checkboxBorder);
            background: none;
            cursor: pointer;
          }
          input[type="range"]:focus {
            outline: none;
          }
          button[appearance="icon"] {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1px 4px;
            margin-left: 10px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>

      <body>
        <div class="${tabsClass}" role="tablist" aria-label="Ruler scopes">
          <button class="${tabClass}" id="${globTabId}"
            role="tab" aria-selected="true"
            data-view="${viewGId}" title="${globHover}">${globText}</button>
          <button class="${tabClass}" id="${wrksTabId}"
            role="tab" aria-selected="false"
            data-view="${viewWId}" title="${wrksHover}">${wrksText}</button>
        </div>

        <div id="${viewGId}" class="${viewClass}" aria-hidden="false">
          <div id="${listGId}" aria-live="polite"></div>
          <div class="${actnsClass}">
            <button id="${addG}" appearance="secondary">${addText}</button>
          </div>
        </div>

        <div id="${viewWId}" class="${viewClass}" aria-hidden="true">
          <div id="${listWId}" aria-live="polite"></div>
          <div class="${actnsClass}">
            <button id="${addW}" appearance="secondary">${addText}</button>
          </div>
        </div>

        <script nonce="${nonce}" type="module">
          const vscode = acquireVsCodeApi();

          const validation = {
            color: (value, def) => 
              /^#([A-Fa-f0-9]{3}){1,2}$/i.test(value) ? value : def,
            range: (value) => 
              value < ${range.min} ?
                ${range.min}
              : value > ${range.max} ?
                  ${range.max}
                : value
          }
          let emptyGlobal, emptyWSpace;

          function createRulerRow(container, scope, column, color, validate) {
            if (validate) {
              column = validation.range(column);
              color = validation.color(color, getDefaultColor());
            }
            const id = Math.random().toString(36).slice(2, 9);
            const row = document.createElement('div');
            row.className = '${rulerRow}';
            row.dataset.id = id;
            row.dataset.scope = scope;
            row.innerHTML = \`
              <div class='${sldrGClass}'>
                <label class='${rulerLabel}'>
                  ${columnText}
                  <span class='${rulerWrap}'>
                    <input type="number" class='${rulerValNum}'
                      min="${range.min}" max="${range.max}" value="\${column}">
                    <strong class='${rulerVal}' title='${editHover}'>\${column}</strong>
                  </span>
                </label>
                <input type="range" min="${range.min}" max="${range.max}"
                  value="\${column}" class='${rulerSlider}' aria-label="Rulers"/>
              </div>
              <div class='${ctrlsClass}'>
                <input type="color" class='${rulerColor}' value="\${color}"
                  title="\${color}" aria-label="Ruler color">
                <button appearance="icon" class='${rulerDel}' title='${delHover}'>
                  &times;
                </button>
              </div>
            \`;
            container.appendChild(row);

            return row;
          }
          
          function postSync(scope, index, column, color) {
            let item = {
              column: column,
              color: color
            };
            if (!column || !color) { item = undefined; }
            vscode.postMessage(
              { command: '${command.update}', scope, index, item }
            );
          }

          function populateList(scope, items) {
            const container = document.getElementById('${lst}' + scope);
            container.innerHTML = '';

            if (!items || items.length === 0) {
              createEmptyView(container, scope);
              return;
            }
            items.forEach((item) =>
              createRulerRow(container, scope, item.column, item.color, true)
            );
          }

          function createEmptyView(container, scope) {
            const empty = document.createElement('div');
            empty.className = '${emptyClass}';
            empty.textContent = '${noRulerText}';

            if (scope === '${scope.global}') { emptyGlobal = empty; }
            if (scope === '${scope.wspace}') { emptyWSpace = empty; }
            container.appendChild(empty);
          }

          function deleteEmptyView(container, scope) {
            if (scope === '${scope.global}' && emptyGlobal) {
              container.removeChild(emptyGlobal);
              emptyGlobal = undefined;
            }
            if (scope === '${scope.wspace}' && emptyWSpace) {
              container.removeChild(emptyWSpace);
              emptyWSpace = undefined;
            }
          }

          function getDefaultColor() {
            return getComputedStyle(document.documentElement)
              .getPropertyValue('${defaultColor}');
          }

          function getNewRuler(column = 80, color = undefined) {
            return { column: column, color: color ?? getDefaultColor()};
          }

          function getIndexOf(row) {
            return row.parentElement ? Array.from(
              row.parentElement.querySelectorAll('.${rulerRow}')
            ).indexOf(row) : -1;
          }

          document.body.addEventListener('input', (ev) => {
            const target = ev.target;
            const row = target.closest('.${rulerRow}');

            if (!row) { return; }
            if (target.classList && target.classList.contains('${rulerValNum}')) {
              const slider = row.querySelector('.${rulerSlider}');
              slider.value = target.value;
            }
            if (target.classList && target.classList.contains('${rulerSlider}')) {
              row.querySelector('.${rulerVal}').textContent = target.value;
              row.querySelector('.${rulerSlider}').value = target.value;
            }
            const index = getIndexOf(row);
            const picker = row.querySelector('.${rulerColor}');
            const color = picker.value;
            if (picker) {
              picker.title = color;
            }
            const column = row.querySelector('.${rulerSlider}').value;
            postSync(row.dataset.scope, index, column, color);
          }, { passive: true });

          document.body.addEventListener('click', (event) => {
            const target = event.target;
            const deleteBtn = target.closest('.${rulerDel}');

            if (target.classList.contains('${rulerVal}')) {
              const wrapper = target.closest('.${rulerWrap}');
              const input = wrapper.querySelector('.${rulerValNum}');
              const text = target;
              text.style.display = 'none';
              input.style.display = 'inline-block';
              input.value = text.textContent;
              input.focus();
              input.addEventListener('blur', () => {
                input.style.display = 'none';
                text.style.display = 'inline-block';
                text.textContent = input.value; 
              }, { once: true });
            }
            if (deleteBtn) {
              const row = deleteBtn.closest('.${rulerRow}');
              const index = getIndexOf(row);
              row.remove();
              postSync(row.dataset.scope, index);
            }
          }, { passive: true });

          document.getElementById('${addG}').addEventListener('click', () => {
            const container = document.getElementById('${listGId}');
            deleteEmptyView(container, '${scope.global}');
            const index = Array.from(container.children).length;
            const ruler = getNewRuler();
            createRulerRow(
              container, '${scope.global}', ruler.column, ruler.color
            );
            postSync('${scope.global}', index, ruler.column, ruler.color);
          }, { passive: true });

          document.getElementById('${addW}').addEventListener('click', () => {
            const container = document.getElementById('${listWId}');
            deleteEmptyView(container, '${scope.wspace}');
            const index = Array.from(container.children).length;
            const ruler = getNewRuler();
            createRulerRow(
              container, '${scope.wspace}', ruler.column, ruler.color
            );
            postSync('${scope.wspace}', index, ruler.column, ruler.color);
          }, { passive: true });

          document.querySelectorAll('.${tabClass}').forEach(tab => {
            tab.addEventListener('click', () => {
              document.querySelectorAll('.${tabClass}')
                      .forEach(t => t.setAttribute('aria-selected', 'false'));
              document.querySelectorAll('.${viewClass}')
                      .forEach(v => v.setAttribute('aria-hidden', 'true'));
              tab.setAttribute('aria-selected', 'true');
              const view = document.getElementById(tab.dataset.view);
              view.setAttribute('aria-hidden', 'false');
            }, { passive: true });
          });

          window.addEventListener('message', (event) => {
            const msg = event.data || {};
            if (msg.command === '${command.setup}') {
              populateList('${scope.global}', msg.global || []);
              populateList('${scope.wspace}', msg.workspace || []);
            } else
            if (msg.command === '${command.empty}') {
              const container = document.getElementById('${lst}' + msg.scope);
              container.innerHTML = '';
              createEmptyView(container, msg.scope);
            }
          }, { passive: true });

          vscode.postMessage({ command: '${command.ready}' });
        </script>
      </body>
    </html>`;
}

interface Ruler {
  column: number;
  color: string;
}

export class EditorRulersHandler implements vscode.Disposable {
  private cspSourceDefault!: string;
  private webviewPanel: WebviewPanel | undefined = undefined;
  
  private readonly globalRulers: Ruler[] = [];
  private readonly wspaceRulers: Ruler[] = [];

  private readonly configManager: ConfigurationManager =
    ConfigurationManager.getInstance(EditorRulersHandler.name);

  private static context: ExtensionContext;
  private static handled: vscode.Disposable | undefined = undefined;

  private static instance: EditorRulersHandler;
  public static getInstance(context: ExtensionContext): EditorRulersHandler {
    EditorRulersHandler.instance ??= new EditorRulersHandler();
    EditorRulersHandler.context ??= context;

    return EditorRulersHandler.instance;
  }

  private constructor() { }

  public handle() {
    const handler =
      vscode.commands.registerCommand(brand.openEditorRulers, async () =>
      { if (this.webviewPanel) { 
          await this.revealWebviewPanel(); 
        } else {
          await this.createWebviewPanel();
        }
      });
    if (!EditorRulersHandler.handled) {
      EditorRulersHandler.handled = handler;
      EditorRulersHandler.context.subscriptions.push(handler);
    }
  }

  public dispose() {
    this.webviewPanel?.dispose();
  }
  
  private async revealWebviewPanel(): Promise<void> {
    await vscode.commands.executeCommand(commands.editorLayoutTwoRows);
    await vscode.commands.executeCommand(commands.focusSecondEditorGroup);
    this.webviewPanel?.reveal(vscode.ViewColumn.Active);
  }

  private async createWebviewPanel(): Promise<void> {
    await vscode.commands.executeCommand(commands.editorLayoutTwoRows);
    await vscode.commands.executeCommand(commands.focusSecondEditorGroup);
    const panel = vscode.window.createWebviewPanel(viewType,
      title, vscode.ViewColumn.Active, { enableScripts: true }
    );
    this.webviewPanel = panel;
    this.cspSourceDefault = panel.webview.cspSource;
    panel.webview.html = getWebviewContent(this.cspSourceDefault);

    panel.onDidDispose(() => {
        this.webviewPanel = undefined;
    }, null, EditorRulersHandler.context.subscriptions);

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === command.update && message.scope) {
        const index = message.index as number;
        let item = message.item;
        if (item) {
          item.column = parseInt(item.column, 10);
        }
        await this.updateRulers(panel, message.scope, index, item);
      } else
      if (message.command === command.ready) {
        await this.setupRulers(panel.webview);
      }
    }, null, EditorRulersHandler.context.subscriptions);
  }

  private async updateRulers(
    panel: WebviewPanel,
    onScope: "global" | "workspace",
    index: number,
    ruler: Ruler | undefined
  ): Promise<void> {
    const rulers = onScope === "global" ?
      this.globalRulers : this.wspaceRulers;
    if (!ruler) {
      rulers.splice(index, 1);
    } else {
      rulers[index] = ruler;
    }
    await this.configManager.setValue(
      tag.name, tag.scheme, onScope === "global" ?
        ConfigurationTarget.Global
      : ConfigurationTarget.Workspace,
      rulers.length > 0 ? rulers : undefined
    );
    await this.cleanWebListIfEmpty(rulers, panel, onScope);
  }

  private async cleanWebListIfEmpty(
    rulers: Ruler[],
    panel: WebviewPanel,
    scope: string
  ): Promise<void> {
    if (rulers.length === 0) {
      await panel.webview.postMessage({ 
        command: command.empty,
        scope: scope
      });
    }
  }

  private async setupRulers(view: vscode.Webview): Promise<void> {
    const getValueFor = (trg: ConfigurationTarget, lst: Ruler[]) => {
      const taken = this.configManager.getValue(
        tag.name, tag.scheme, trg
      ) as Ruler[] | undefined;
      (lst as Ruler[]).length = 0;
      if (taken) { lst.push(...taken); }
    };
    getValueFor(ConfigurationTarget.Global, this.globalRulers);
    getValueFor(ConfigurationTarget.Workspace, this.wspaceRulers);

    await view.postMessage({
      command: command.setup,
      global: this.globalRulers,
      workspace: this.wspaceRulers 
    });
  }
}
