import * as vscode from "vscode";
import { ActivityBarHandler } from "./activityBarHandler";
import { noRealDocOpened, ExtensionPageHandler } from "./extensionPageHandler";
import { brand, HiddenExtensionsProvider } from "./hiddenExtensionsProvider";

interface LogConfig {
  name: string;
  show: string[];
  exclude: string[];
}

const empty = '';

let pasteRegistered = false;
let lastCopiedText = empty;
let dismissNotification: (() => void) | undefined;
let targetLogsRecord: Record<string, LogConfig> = {
  "main": { name: "Main", show: ["warning", "error"], exclude: [] },
  "exthost": { name: "Extension Host", show: [], exclude: ["github.copilot-chat", "claude-code"] },
  "rendererLog": { name: "Window", show: [], exclude: ["typescript-explorer"] }
}
let targetLogs = new Map<string, LogConfig>(Object.entries(targetLogsRecord));

export function activate(context: vscode.ExtensionContext) {
  ActivityBarHandler.create();

  const toggleRegistered = vscode.commands.registerCommand(
    ActivityBarHandler.commandName,
    () => vscode.commands.executeCommand(
      "workbench.action.toggleActivityBarVisibility"
    )
  );
  context.subscriptions.push(toggleRegistered);

  const extensionPageHandler = new ExtensionPageHandler();
  const aimRegistered = vscode.commands.registerCommand(
    `${brand}.aimFile`,
    async () => noRealDocOpened() ?
      await extensionPageHandler.openExtensionPage()
    : await vscode.commands.executeCommand(
        "workbench.files.action.showActiveFileInExplorer"
      )
  );
  context.subscriptions.push(aimRegistered);

  const hiddenExtensionsProvider = new HiddenExtensionsProvider(context);
  const webviewRegistered = vscode.window.registerWebviewViewProvider(
    "hiddenView",
    hiddenExtensionsProvider
  );
  context.subscriptions.push(webviewRegistered);

  registerShowLogCommand(context);
  registerCopyCommand(context);
}

function registerShowLogCommand(context: vscode.ExtensionContext) {
  const show = vscode.commands.registerCommand(
    `${brand}.showOutputLog`,
    async () => {
      lastCopiedText = await vscode.env.clipboard.readText();

      const logNames = Array.from(targetLogs.values()).map((log) => log.name);
      const selected = await vscode.window.showQuickPick(
        logNames, { title: "Choose the Output channel"}
      );
      if (!selected) { return; }

      await vscode.env.clipboard.writeText(selected);
      const openLog = vscode.commands.executeCommand("workbench.action.showLogs");
      await vscode.commands.executeCommand("editor.action.clipboardPasteAction");
      await vscode.commands.executeCommand("quickInput.accept");
      await vscode.env.clipboard.writeText(lastCopiedText);
      await openLog;
      await vscode.commands.executeCommand("workbench.panel.output.focus");
      await new Promise((resolve) => setTimeout(resolve, 100));
      await vscode.commands.executeCommand("editor.action.clipboardCopyAction");
    }
  )
  context.subscriptions.push(show);
}

function closeNotification() {
  dismissNotification?.();
  dismissNotification = undefined;
}

function registerCopyCommand(context: vscode.ExtensionContext) {
  const copy = vscode.commands.registerCommand(
    "editor.action.clipboardCopyAction",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }

      closeNotification();

      const selection = editor.selection;
      const selected = editor.document.getText(selection);
      const target = getLogTarget(editor.document);

      if (target && selected === empty) {
        lastCopiedText = await vscode.env.clipboard.readText();
        registerPasteCommand(context);
        
        if (target as unknown as LogConfig) {
          const config = target as LogConfig;
          await sendToClipboardAndNotify(config, context);
        }
      } else {
        if (selected !== empty) {
          await vscode.env.clipboard.writeText(selected);
        }
      }
    }
  );
  context.subscriptions.push(copy);
}

function registerPasteCommand(context: vscode.ExtensionContext) {
  if (pasteRegistered) { return; }

  pasteRegistered = true;

  const paste = vscode.commands.registerCommand(
    "editor.action.clipboardPasteAction",
    async () => {
      paste.dispose();
      pasteRegistered = false;
      closeNotification();

      await vscode.commands.executeCommand("editor.action.clipboardPasteAction");
      await vscode.env.clipboard.writeText(lastCopiedText);
    }
  )
  context.subscriptions.push(paste);
}

async function showCanOpenSettings(context:vscode.ExtensionContext): Promise<void> {
  const yes = "Yes";
  const answer = await vscode.window.showInformationMessage(
    "You can check the rules in settings. Open settings?", yes, "No");
  if (answer === yes) {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      `@ext:${context.extension.id}`
    );
  }
}

async function sendToClipboardAndNotify(config: LogConfig, context: vscode.ExtensionContext): Promise<void> {
  const comma = ", ";
  const exclude = config.exclude.length > 0 && config.exclude[0].length > 0 ?
    `!${config.exclude.join(`${comma}!`)}` : empty;
  const include = config.show.join(comma);
  const text = [include, exclude].filter(Boolean).join(comma);
  await vscode.env.clipboard.writeText(text);

  return vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "You can paste the rule to the Filter in Output now.",
      cancellable: true
    }, async (_progress, token) => {
      const onCancel = token.onCancellationRequested(async () => {
        await showCanOpenSettings(context);
        onCancel.dispose();
      })

      return new Promise<void>((resolve) => {
          dismissNotification = resolve;
      });
  });
}

function getLogTarget(doc: vscode.TextDocument | undefined): boolean | LogConfig {
  if (!doc) { return false; }

  if (targetLogs.has(doc.fileName)) {
    const config = targetLogs.get(doc.fileName);
    return config ?? true;
  }
  return false;
}

export function deactivate(context: vscode.ExtensionContext) {
  ActivityBarHandler.dispose();
}
