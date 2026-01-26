import * as vscode from "vscode";
import { window } from "vscode";
import { brand } from "./hiddenExtensionsProvider";

interface LogConfig {
  name: string;
  show: string[];
  exclude: string[];
}

const empty = '';
const tag = { name: "output.filter", scheme: "rules" };

export class OutputFilterHandler implements vscode.Disposable {
  private static readonly subscriptions: Map<number, vscode.Disposable> = new Map();

  private copyRegistered: boolean = false;
  private pasteRegistered: boolean = false;
  private configurationRegistered: boolean = false;
  private lastCopiedText: string = empty;
  private dismissNotification: (() => void) | undefined;
  private targetLogsPlaceholder: Record<string, LogConfig> =
    { "main": { name: "Main", show: ["warning", "error"], exclude: [] } };
  /*private targetLogsRecord: Record<string, LogConfig> = {
    "main": { name: "Main", show: ["warning", "error"], exclude: [] },
    "exthost": { name: "Extension Host", show: [], exclude: ["github.copilot-chat", "claude-code"] },
    "rendererLog": { name: "Window", show: [], exclude: ["typescript-explorer"] }
  }*/
  private readonly targetLogs: Map<string, LogConfig> = new Map();

  constructor(private readonly context: vscode.ExtensionContext) {
    const changedConfiguration = vscode.workspace.onDidChangeConfiguration(() =>
      this.updateConfiguration(changedConfiguration)
    );
    const changedTextEditor = window.onDidChangeActiveTextEditor((editor) => {
      if (this.getLogTarget(editor?.document) !== false) {
        if (!this.copyRegistered) {
          OutputFilterHandler.subscriptions.set(1, this.registerCopyCommand());
          this.copyRegistered = true;
        }
      } else if (this.copyRegistered) {
        OutputFilterHandler.subscriptions.get(1)?.dispose();
        OutputFilterHandler.subscriptions.delete(1);
        this.copyRegistered = false;
      }
    });
    OutputFilterHandler.subscriptions.set(1, this.registerCopyCommand());
    OutputFilterHandler.subscriptions.set(10, this.registerShowLogCommand());
    OutputFilterHandler.subscriptions.set(100, changedConfiguration);
    OutputFilterHandler.subscriptions.set(1000, changedTextEditor);
    this.copyRegistered = true;
  }

  public dispose() {
    OutputFilterHandler.subscriptions.forEach((subscription, _) => {
      subscription.dispose();
    });
    OutputFilterHandler.subscriptions.clear();
  }

  private updateConfiguration(didChangeConfigurationListener: vscode.Disposable) {
    if (!this.configurationRegistered) {
      this.context.subscriptions.push(didChangeConfigurationListener);
      this.configurationRegistered = true;
    }
    const config = vscode.workspace.getConfiguration(tag.name);
    const targetLogsRecord = config.get<Record<string, LogConfig>>(tag.scheme);

    if (!targetLogsRecord) { return; }

    this.targetLogs.clear();

    Object.entries(targetLogsRecord).map<[string, LogConfig]>(([name, log]) =>
      [name, { ...log }] as [string, LogConfig]
    ).forEach(([k, v]) =>
      this.targetLogs.set(k, v)
    );
  }
  
  private registerShowLogCommand(): vscode.Disposable {
    const show = vscode.commands.registerCommand(
      `${brand}.showOutputLog`,
      async () => {
        this.lastCopiedText = await vscode.env.clipboard.readText();
  
        const logNames = Array.from(this.targetLogs.values()).map((log) => log.name);
        const selected = await window.showQuickPick(
          logNames, { title: "Choose the Output channel"}
        );
        if (!selected) { return; }
  
        await vscode.env.clipboard.writeText(selected);
        const openLog = vscode.commands.executeCommand("workbench.action.showLogs");
        await vscode.commands.executeCommand("editor.action.clipboardPasteAction");
        await vscode.commands.executeCommand("quickInput.accept");
        await vscode.env.clipboard.writeText(this.lastCopiedText);
        await openLog;
        await vscode.commands.executeCommand("workbench.panel.output.focus");
        await new Promise((resolve) => setTimeout(resolve, 100));
        await vscode.commands.executeCommand("editor.action.clipboardCopyAction");
      }
    )
    this.context.subscriptions.push(show);

    return show;
  }
  
  private closeNotification() {
    this.dismissNotification?.();
    this.dismissNotification = undefined;
  }
  
  private registerCopyCommand(): vscode.Disposable {
    const copy = vscode.commands.registerCommand(
      "editor.action.clipboardCopyAction",
      async () => {
        const editor = window.activeTextEditor;
        if (!editor) { return; }
  
        this.closeNotification();
  
        const selection = editor.selection;
        const selected = editor.document.getText(selection);
        const target = this.getLogTarget(editor.document);
  
        if (target && selected === empty) {
          this.lastCopiedText = await vscode.env.clipboard.readText();
          this.registerPasteCommand(this.context);
          
          if (target as unknown as LogConfig) {
            const config = target as LogConfig;
            await this.sendToClipboardAndNotify(config);
          }
        } else {
          if (selected !== empty) {
            await vscode.env.clipboard.writeText(selected);
          }
        }
      }
    );
    this.context.subscriptions.push(copy);

    return copy;
  }
  
  private registerPasteCommand(context: vscode.ExtensionContext) {
    if (this.pasteRegistered) { return; }
  
    this.pasteRegistered = true;
  
    const paste = vscode.commands.registerCommand(
      "editor.action.clipboardPasteAction",
      async () => {
        paste.dispose();
        this.pasteRegistered = false;
        this.closeNotification();
  
        await vscode.commands.executeCommand("editor.action.clipboardPasteAction");
        await vscode.env.clipboard.writeText(this.lastCopiedText);
      }
    )
    context.subscriptions.push(paste);
  }
  
  async showCanOpenSettings(): Promise<void> {
    const yes = "Yes";
    const answer = await window.showInformationMessage(
      "You can check the rules in settings. Open settings?", yes, "No");
    if (answer === yes) {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        `@ext:${this.context.extension.id}`
      );
    }
  }
  
  private async sendToClipboardAndNotify(config: LogConfig): Promise<void> {
    const comma = ", ";
    const exclude = config.exclude.length > 0 && config.exclude[0].length > 0 ?
      `!${config.exclude.join(`${comma}!`)}` : empty;
    const include = config.show.join(comma);
    const text = [include, exclude].filter(Boolean).join(comma);
    await vscode.env.clipboard.writeText(text);
  
    return window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "You can paste the rule to the Filter in Output now.",
        cancellable: true
      }, async (_progress, token) => {
        const onCancel = token.onCancellationRequested(async () => {
          await this.showCanOpenSettings();
          onCancel.dispose();
        })
  
        return new Promise<void>((resolve) => {
            this.dismissNotification = resolve;
        });
    });
  }
  
  private getLogTarget(doc: vscode.TextDocument | undefined): boolean | LogConfig {
    if (!doc) { return false; }
  
    if (this.targetLogs.has(doc.fileName)) {
      const config = this.targetLogs.get(doc.fileName);
      return config ?? true;
    }
    return false;
  }
}
