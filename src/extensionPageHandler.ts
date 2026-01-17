import * as vscode from "vscode";

export class ExtensionPageHandler {
  async openExtensionPage() {
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

    await vscode.commands.executeCommand(
      "extension.open", 
      extension?.id ?? project
    );
  }
}
