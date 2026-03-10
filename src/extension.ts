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
import { ThemeCustomizer } from "./themeCustomizer";
import { EditorRulersHandler } from "./editorRulersHandler";

export function activate(context: vscode.ExtensionContext) {
  const extensionBrand = new ExtensionBrandResolver(context);
  extensionBrand.resolve();
  
  const toggleRegistered = ActivityBarHandler.create();
  if (toggleRegistered) {
    ExtensionBrandResolver.subsriptions.push(toggleRegistered);
  }

  const aimRegistered = vscode.commands.registerCommand(
    brand.aimFile,
    async () => noRealDocOpened() ?
      await ExtensionPageHandler.openExtensionPage()
    : await vscode.commands.executeCommand(
        commands.showActiveFileInExplorer
      )
  );
  context.subscriptions.push(aimRegistered);

  const colorPicker = new ColorPickerCreator(context);
  ExtensionBrandResolver.subsriptions.push(colorPicker.create());

  const hiddenExtensionsProvider = new HiddenExtensionsProvider(context);
  const webviewRegistered = vscode.window.registerWebviewViewProvider(
    ExtensionBrandResolver.webview,
    hiddenExtensionsProvider
  );
  context.subscriptions.push(webviewRegistered);

  const outputFilterHandler = new OutputFilterHandler(context);
  ExtensionBrandResolver.subsriptions.push(outputFilterHandler);

  const themeCustomizer = new ThemeCustomizer(context);
  ExtensionBrandResolver.subsriptions.push(themeCustomizer);

  const editorRulers = EditorRulersHandler.getInstance(context);
  ExtensionBrandResolver.subsriptions.push(editorRulers);
  editorRulers.handle();

  const reopenClosedCommand = vscode.commands.registerCommand(
    brand.reopenClosedEditor, () => vscode.commands.executeCommand(
      commands.reopenClosedEditor
    )
  );
  const openBrowserCommand = vscode.commands.registerCommand(
    brand.openEmbedBrowser, () => vscode.commands.executeCommand(
      commands.browserOpen
    )
  );
  context.subscriptions.push(reopenClosedCommand, openBrowserCommand);
}

export function deactivate(_context: vscode.ExtensionContext) {
  ActivityBarHandler.dispose();
  ExtensionBrandResolver.dispose();
}
