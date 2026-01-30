import * as vscode from "vscode";

export const commands = {
  openSettings: "workbench.action.openSettings",
  showRuntimeExtensions: "workbench.action.showRuntimeExtensions",
  toggleActivityBarVisibility: "workbench.action.toggleActivityBarVisibility",
  showActiveFileInExplorer: "workbench.files.action.showActiveFileInExplorer",
  focusActiveEditorGroup: "workbench.action.focusActiveEditorGroup",
  extensionsSearch: "workbench.extensions.search",
  clipboardPasteAction: "editor.action.clipboardPasteAction",
  clipboardCopyAction: "editor.action.clipboardCopyAction",
  outputFocus: "workbench.panel.output.focus",
  quickInputAccept: "quickInput.accept",
  showLogs: "workbench.action.showLogs",
  extensionOpen: "extension.open"
} as const;

export class ExtensionBrandResolver {
  public static readonly openSettings: () => Promise<void>;
  public static readonly openRunningExtensions: () => Promise<void>;

  private static instance: ExtensionBrandResolver;

  constructor(private readonly context: vscode.ExtensionContext) {
    if (ExtensionBrandResolver.instance) { return; }

    ExtensionBrandResolver.instance = this;
    
    const self = ExtensionBrandResolver as any;
    self.openSettings = this.open_settings.bind(this);
    self.openRunningExtensions = this.open_extensions.bind(this);
  }

  private async open_settings(): Promise<void> {
    await vscode.commands.executeCommand(
      commands.openSettings,
      `@ext:${this.context.extension.id}`,
    );
  }

  private async open_extensions(): Promise<void> {
    await vscode.commands.executeCommand(
      commands.showRuntimeExtensions
    );
  }

  public getBrand() {
    
  }
}
