import * as vscode from "vscode";
import { ActivityBarHandler } from "./activityBarHandler";
import { ExtensionPageHandler } from "./extensionPageHandler";
import { brand, HiddenExtensionsProvider } from "./hiddenExtensionsProvider";

function noRealDocOpened() {
  return vscode.window.activeTextEditor?.document?.fileName ?
    vscode.window.activeTextEditor.document.isUntitled
  : true;
}

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
}

export function deactivate(context: vscode.ExtensionContext) {
  ActivityBarHandler.dispose();
}
