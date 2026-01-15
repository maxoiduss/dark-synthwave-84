import * as vscode from "vscode";
import { brand, HiddenExtensionsProvider } from "./hiddenExtensionsProvider";

const activityBarToggleIcon: string = "layout-sidebar-left-dock";

let activityBarToggle: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext) {
  activityBarToggle = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  activityBarToggle.text = `$(${activityBarToggleIcon})`;
  activityBarToggle.tooltip = "Show/Hide Activity Bar";
  activityBarToggle.command = `${brand}.showActivity`;
  activityBarToggle.show();

  const toggle = vscode.commands.registerCommand(`${brand}.showActivity`, () => {
    vscode.commands.executeCommand("workbench.action.toggleActivityBarVisibility");
  });
  context.subscriptions.push(toggle);

  const hiddenExtensionsProvider = new HiddenExtensionsProvider(context);
  hiddenExtensionsProvider.registerCommands();

  const webview = vscode.window.registerWebviewViewProvider(
    "hiddenView",
    hiddenExtensionsProvider
  );
  context.subscriptions.push(webview);
}

export function deactivate(context: vscode.ExtensionContext) {
  activityBarToggle?.dispose();
}
