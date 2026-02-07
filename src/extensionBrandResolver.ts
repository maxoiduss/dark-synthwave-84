import * as vscode from "vscode";

const resolver = "dark-synthwave";

type HasId = { id: string };
type HasType = { type: string | undefined };
type HasProperties = { properties: {} };

class Custom {
  public readonly colors: string[] = [];
}
export const background = new Custom();
export const foreground = new Custom();

/*class Default {
  public readonly colors: Record<string, string> = {};
}
export const foregroundDefault = new Default();
export const backgroundDefault = new Default();
*/
interface Brand {
  aimFile: string;
  hideBuiltinFeatures: string;
  showBuiltinFeatures: string;
  showActivityBar: string;
  showOutputLog: string;
  openColorPicker: string;
}
export const brand = {} as Brand;

export const commands = {
  colorCustomizations: "workbench.colorCustomizations",
  openSettings: "workbench.action.openSettings",
  showRuntimeExtensions: "workbench.action.showRuntimeExtensions",
  toggleActivityBarVisibility:
    "workbench.action.toggleActivityBarVisibility",
  toggleSideBarVisibility:
    "workbench.action.toggleSidebarVisibility",
  showActiveFileInExplorer:
    "workbench.files.action.showActiveFileInExplorer",
  focusActiveEditorGroup: "workbench.action.focusActiveEditorGroup",
  toggleFullScreen: "workbench.action.toggleFullScreen",
  showLogs: "workbench.action.showLogs",
  outputFocus: "workbench.panel.output.focus",
  extensionsSearch: "workbench.extensions.search",
  clipboardPasteAction: "editor.action.clipboardPasteAction",
  clipboardCopyAction: "editor.action.clipboardCopyAction",
  quickInputAccept: "quickInput.accept",
  extensionOpen: "extension.open"
} as const;

function validate(entries: string[], on: Set<string>): boolean {
  return entries.every(entry => on.has(entry));
}
function hasColor(str: string): boolean {
  return str.toLowerCase().includes("color");
}
function isString(it: HasType): boolean {
  return it.type === "string";
}
function isObject(it: HasType): boolean {
  return it.type === "object";
}

export class ExtensionBrandResolver {
  public static readonly command: string;
  public static readonly webview: string;
  public static readonly configuration1: string;
  public static readonly configuration2: string;
  public static readonly objectProperty1: string;
  public static readonly objectProperty2: string;
  public static readonly openSettings: () => Promise<void>;
  public static readonly openRunningExtensions: () => Promise<void>;

  private static instance: ExtensionBrandResolver;

  private readonly filtration:
  (value: any, index: number, array: any[]) => unknown =
        value => typeof value === "string"
    && !value.includes(":");

  constructor(private readonly context: vscode.ExtensionContext) {
    if (ExtensionBrandResolver.instance) { return; }

    ExtensionBrandResolver.instance = this;
    
    const self = ExtensionBrandResolver as any;
    self.openSettings = this.openSettings.bind(this);
    self.openRunningExtensions = this.openExtensions.bind(this);
  }

  private async openSettings(): Promise<void> {
    const byId = (id: string) => `@ext:${id}`;

    await vscode.commands.executeCommand(
      commands.openSettings,
      byId(this.context.extension.id),
    );
  }

  private async openExtensions(): Promise<void> {
    await vscode.commands.executeCommand(
      commands.showRuntimeExtensions
    );
  }

  private getColors(
    properties: (HasType & HasProperties)[],
    kind: "background" | "foreground"
  ): string[] {
    const has = (type: string, str: string) =>
      str.toLowerCase().includes(type);

    const colors = Object.entries<HasType & HasProperties>(
      properties
    ).flatMap(([name, property]) =>
         isObject(property)
      && hasColor(name)
      && has(kind, name) ? [property.properties] : []
    ) as { _: HasType }[];
    
    return colors.length > 0 ? 
      Object.entries(colors[0]).flatMap(
        ([name, prop]) => isString(prop) ? [name] : []
      ).sort()
    : [];
  }

  private setupDefaultColors() {
    //backgroundDefault.colors["s1"] = "s2"
  }
  
  private setupColors() {
    const fromPackageJson = this.readConfig(false);
    const configs = fromPackageJson?.configuration?.properties;
    if (!configs) { return; }
    
    const properties = configs as (HasType & HasProperties)[];
    let colors = this.getColors(properties, "background");
    if (colors.length > 0) {
      this.setupBackground(colors);
    }
    colors = this.getColors(properties, "foreground");
    if (colors.length > 0) {
      this.setupForeground(colors);
    }
  }

  private setupBackground(colors: string[]) {
    colors.forEach((c) => background.colors.push(c));
  }
  
  private setupForeground(colors: string[]) {
    colors.forEach((c) => foreground.colors.push(c));
  }

  private setupBrand() {
    const name = ExtensionBrandResolver.command;
    brand.aimFile = `${name}.aimFile`;
    brand.showBuiltinFeatures = `${name}.showBuiltinFeatures`;
    brand.hideBuiltinFeatures = `${name}.hideBuiltinFeatures`;
    brand.showActivityBar = `${name}.showActivityBar`;
    brand.showOutputLog = `${name}.showOutputLog`;
    brand.openColorPicker = `${name}.openColorPicker`;

    this.validateSetup();
  }

  private validateSetup() {
    const fromPackageJson = this.readConfig(true);
    if (!fromPackageJson) { return; }

    const commands = fromPackageJson.commands.map(
      (rec: { command: string; }) => rec.command
    ) as string[];
    const on = new Set(commands.sort());
    const branding = new Set<string>(
      Object.values(brand).filter(this.filtration).sort()
    );
    const validated = validate([...branding], on);
    if (!validated) {
      throw new Error("PACKAGE.JSON DOESN'T CONTAIN SOME BRANDING");
    }
  }

  private readConfig(thenCommandsAndViews: boolean) {
    const extensions = vscode.extensions.all
      .filter(ext => ext.id.includes(resolver))
      .map(ext => {
        const packageJSON: any = ext.packageJSON;
        return thenCommandsAndViews ? {
          configuration:
            packageJSON.contributes?.configuration || [],
          commands: packageJSON.contributes?.commands || [],
          views: packageJSON.contributes?.views || {}
        } : {
          configuration:
            packageJSON.contributes?.configuration || []
        };
      });
    return extensions.length > 0 ? extensions[0] : undefined;
  }

  public resolve() {
    const dot = ".";
    const isWebview = (it: HasType) => it.type === "webview";
    const afterLastDot = (str?: string) => str?.split(dot)?.pop();
    const beforeLastDot = (str?: string) =>
      str?.split(dot)?.slice(0, -1)?.join(dot);
    const fromPackageJson = this.readConfig(true);
    if (!fromPackageJson) { return; }

    const properties =
      fromPackageJson.configuration.properties as HasType[];
    const commands = fromPackageJson.commands.map(
      (c: { command: string; }) => c.command
    ) as string[];
    const views = Object.values(fromPackageJson.views).find((v) => 
      Array.isArray(v) && v.some(item => isWebview(item))
    ) as Array<HasId>;

    const objectProps = properties ?
      Object.entries<HasType>(properties).flatMap(
        ([name, property]) => isObject(property) ? [name]: []
      ) : [];
    
    const objectProp1 = objectProps.length > 0 ?
      objectProps.find((p) => !hasColor(p)) : undefined;
    
    const objectProp2 = objectProps.length > 0 ?
      objectProps.find((p) => hasColor(p)) : undefined;
    
    const command = new Set<string>(
      commands.map((c) => c.split(dot)[0])
    ).keys().next().value;

    const view = views.length > 0 ?
      views[0].id
    : undefined;

    const self = ExtensionBrandResolver as any;
    self.command = command;
    self.webview = view;
    self.configuration1 = beforeLastDot(objectProp1);
    self.configuration2 = beforeLastDot(objectProp2);
    self.objectProperty1 = afterLastDot(objectProp1);
    self.objectProperty2 = afterLastDot(objectProp2);
    Object.freeze(ExtensionBrandResolver);

    this.setupBrand();
    //this.setupColors();
    //this.setupDefaultColors();
  }
}
