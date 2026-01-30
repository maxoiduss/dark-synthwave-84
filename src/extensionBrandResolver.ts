import * as vscode from "vscode";

const resolver = "dark-synthwave";

interface Brand {
  aimFile: string;
  showBuiltinFeatures: string;
  hideBuiltinFeatures: string;
  showActivityBar: string;
  showOutputLog: string;
}
export const brand = {} as Brand;

export const commands = {
  openSettings: "workbench.action.openSettings",
  showRuntimeExtensions: "workbench.action.showRuntimeExtensions",
  toggleActivityBarVisibility:
    "workbench.action.toggleActivityBarVisibility",
  showActiveFileInExplorer:
    "workbench.files.action.showActiveFileInExplorer",
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
  public static readonly brand: string;
  public static readonly webview: string;
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
    const byId = (id: string) => `@ext:${id}`;

    await vscode.commands.executeCommand(
      commands.openSettings,
      byId(this.context.extension.id),
    );
  }

  private async open_extensions(): Promise<void> {
    await vscode.commands.executeCommand(
      commands.showRuntimeExtensions
    );
  }

  private setupBrand() {
    const name = ExtensionBrandResolver.brand;
    brand.aimFile = `${name}.aimFile`;
    brand.showBuiltinFeatures = `${name}.showBuiltinFeatures`;
    brand.hideBuiltinFeatures = `${name}.hideBuiltinFeatures`;
    brand.showActivityBar = `${name}.showActivityBar`;
    brand.showOutputLog = `${name}.showOutputLog`;
  }

  private readCommandsAndViews() {
    const extensions = vscode.extensions.all
      .filter(ext => ext.id.includes(resolver))
      .map(ext => {
        const packageJSON: any = ext.packageJSON;
        return {
          commands: packageJSON.contributes?.commands || [],
          views: packageJSON.contributes?.views || {}
        };
      });
    return extensions.length > 0 ? extensions[0] : undefined;
  }

  public resolve() {
    const isWebview = (it: any) => it.type === "webview";
    const fromPackageJson = this.readCommandsAndViews();
    if (!fromPackageJson) { return; }

    const commands = fromPackageJson.commands.map(
      (c: { command: string; }) => c.command
    ) as string[];
    const views = Object.values(fromPackageJson.views).find((v) => 
      Array.isArray(v) && v.some(item => isWebview(item))
    ) as Array<{id: string}>;

    const command = new Set<string>(
      commands.map((c) => c.split(".")[0])
    ).keys().next().value;

    const view = views.length > 0 ?
      views[0].id
    : undefined;

    const self = ExtensionBrandResolver as any;
    self.brand = command;
    self.webview = view;

    this.setupBrand();
  }
}
