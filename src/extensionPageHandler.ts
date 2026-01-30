import * as vscode from "vscode";
import { commands, ExtensionBrandResolver } from "./extensionBrandResolver";

export function noRealDocOpened() {
  return vscode.window.activeTextEditor?.document?.fileName ?
    vscode.window.activeTextEditor.document.isUntitled
  : true;
}

export class ExtensionPageHandler {
  public async openExtensionPage() {
    if (!vscode.workspace.name) {
      vscode.window.showWarningMessage("There is no opened project.");
      return;
    }

    const project = vscode.workspace.name;
    const extensions = vscode.extensions.all;
    const extension = extensions.find((ext) =>
      ext.id.endsWith(project)
      || ext.packageJSON?.displayName?.endsWith(project)
      || ext.packageJSON?.name.endsWith(project)
    );

    try {
      await vscode.commands.executeCommand(
        commands.extensionOpen, 
        extension?.id ?? project
      );
    } catch (error) {
      const settings = "Open Settings";
      const extensions = "Show Running Extensions";
      const answer = await vscode.window.showWarningMessage(
        `There is no such extension: ${extension?.id ?? project}`,
        settings,
        extensions
      );
      if (answer === settings) {
        ExtensionBrandResolver.openSettings();
      } else if (answer === extensions) {
        ExtensionBrandResolver.openRunningExtensions()
      }
    }
  }
}
