import * as vscode from "vscode";
import { ActivityBarHandler } from "./activityBarHandler";
import {
  noRealDocOpened,
  ExtensionPageHandler } from "./extensionPageHandler";
import { HiddenExtensionsProvider } from "./hiddenExtensionsProvider";
import { OutputFilterHandler } from "./outputFilterHandler";
import {
  brand,
  commands,
  ExtensionBrandResolver } from "./extensionBrandResolver";
import { ColorPickerCreator } from "./colorPickerCreator";

export function activate(context: vscode.ExtensionContext) {
  const extensionBrand = new ExtensionBrandResolver(context);
  extensionBrand.resolve();
  
  const toggleRegistered = ActivityBarHandler.create();
  toggleRegistered ? 
    context.subscriptions.push(toggleRegistered) : {};

  const extensionPageHandler = new ExtensionPageHandler();
  const aimRegistered = vscode.commands.registerCommand(
    brand.aimFile,
    async () => noRealDocOpened() ?
      await extensionPageHandler.openExtensionPage()
    : await vscode.commands.executeCommand(
        commands.showActiveFileInExplorer
      )
  );
  context.subscriptions.push(aimRegistered);

  const colorPicker = new ColorPickerCreator(context);
  colorPicker.create();

  const hiddenExtensionsProvider = new HiddenExtensionsProvider(context);
  const webviewRegistered = vscode.window.registerWebviewViewProvider(
    ExtensionBrandResolver.webview,
    hiddenExtensionsProvider
  );
  context.subscriptions.push(webviewRegistered);

  const outputFilterHandler = new OutputFilterHandler(context);
  context.subscriptions.push(outputFilterHandler);
}

export function deactivate(_context: vscode.ExtensionContext) {
  ActivityBarHandler.dispose();
}
