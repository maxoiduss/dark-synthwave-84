import * as vscode from "vscode";
import { ActivityBarHandler } from "./activityBarHandler";
import { noRealDocOpened, ExtensionPageHandler } from "./extensionPageHandler";
import { brand, HiddenExtensionsProvider } from "./hiddenExtensionsProvider";
import { OutputFilterHandler } from "./outputFilterHandler";
import { ExtensionBrandResolver } from "./extensionBrandResolver";

export function activate(context: vscode.ExtensionContext) {
  ActivityBarHandler.create();

  const resolver = new ExtensionBrandResolver(context);
  resolver.getBrand();

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

  const outputFilterHandler = new OutputFilterHandler(context);
  context.subscriptions.push(outputFilterHandler);
}

export function deactivate(_context: vscode.ExtensionContext) {
  ActivityBarHandler.dispose();
}
