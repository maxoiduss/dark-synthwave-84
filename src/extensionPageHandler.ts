import * as vscode from "vscode";
import {
  commands,
  ExtensionBrandResolver
} from "./extensionBrandResolver";

const text = {
  settings: "Open Settings",
  extensions: "Show Running Extensions"
} as const;

export function noRealDocOpened() {
  return vscode.window.activeTextEditor?.document?.fileName ?
    vscode.window.activeTextEditor.document.isUntitled
  : true;
}

export class ExtensionPageHandler {
  public async openExtensionPage() {
    if (!vscode.workspace.name) {
      const noProjectText = "There is no opened project.";
      vscode.window.showWarningMessage(noProjectText);
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
      const answer = await vscode.window.showWarningMessage(
        `There is no such extension: ${extension?.id ?? project}`,
        text.settings,
        text.extensions
      );
      if (answer === text.settings) {
        ExtensionBrandResolver.openSettings();
      } else if (answer === text.extensions) {
        ExtensionBrandResolver.openRunningExtensions();
      }
    }
  }
}
