import * as vscode from "vscode";

/// implement here all strings (like commands) declaration !!!
export class ExtensionBrandResolver {
  public static readonly openSettings: () => Promise<void>;

  private static instance: ExtensionBrandResolver;

  constructor(private readonly context: vscode.ExtensionContext) {
    if (ExtensionBrandResolver.instance) { return; }

    ExtensionBrandResolver.instance = this;
    (ExtensionBrandResolver as any).openSettingsAction = this.openSettings.bind(this);
  }

  private async openSettings(): Promise<void> {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      `@ext:${this.context.extension.id}`,
    );
  }

  public getBrand() {
    
  }
}
