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

class Default {
  public readonly colors: Map<string, string> = new Map();

  public contains = (color: string): boolean =>
    this.colors.has(color);
}
export const foregroundDefault = new Default();
export const backgroundDefault = new Default();

interface Brand {
  aimFile: string;
  hideBuiltinFeatures: string;
  showBuiltinFeatures: string;
  showActivityBar: string;
  showOutputLog: string;
  openColorPicker: string;
  openEmbedBrowser: string;
  reopenClosedEditor: string;
  enableEditMode: string;
  resetBackgroundColors: string;
  resetForegroundColors: string;
}
export const brand = {} as Brand;

export const commands = {
  colorCustomizations: "workbench.colorCustomizations",
  openSettings: "workbench.action.openSettings",
  browserOpen: "workbench.action.browser.open",
  reopenClosedEditor: "workbench.action.reopenClosedEditor",
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
function hasDefault(it: any): boolean {
  return isObject(it) && it.default;
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
  public static readonly configuration3: string;
  public static readonly objectProperty1: string;
  public static readonly objectProperty2: string;
  public static readonly objectProperty3: string;
  public static readonly openSettings: () => Promise<void>;
  public static readonly openRunningExtensions: () => Promise<void>;

  private static instance: ExtensionBrandResolver;

  private readonly filtration:
  (value: any, index: number, array: any[]) => unknown =
        value => typeof value === "string"
    && !value.includes(":");

  private commandsJSON: any;
  private configurationJSON: any;
  private viewsJSON: any;

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
    const properties =
      this.configurationJSON.properties as HasType[];
    const defaults = properties ?
      Object.entries<HasType>(properties).flatMap(
        ([name, property]) =>
          (hasDefault(property) && hasColor(name) ?
            [[name, property]] : []) as [string, HasType][]
      ) : [];
    const background = defaults.length > 0 ?
      defaults.find(([n, _]) =>
        n.includes(ExtensionBrandResolver.objectProperty2))?.[1]
      : undefined;
    if (background) {
      Object.entries<string>((background as any).default)
        .forEach((r) => backgroundDefault.colors.set(r[0], r[1]));
    }
    const foreground = defaults.length > 0 ?
      defaults.find(([n, _]) =>
        n.includes(ExtensionBrandResolver.objectProperty3))?.[1]
      : undefined;
    if (foreground) {
      Object.entries<string>((foreground as any).default)
        .forEach((r) => foregroundDefault.colors.set(r[0], r[1]));
    }
  }
  
  private setupColors() {
    const configs = this.configurationJSON;
    if (!configs) { return; }
    
    const properties = configs as (HasType & HasProperties)[];
    let colors = this.getColors(properties, "background");
    if (colors.length > 0) {
      colors.forEach((c) => background.colors.push(c));
    }
    colors = this.getColors(properties, "foreground");
    if (colors.length > 0) {
      colors.forEach((c) => foreground.colors.push(c));
    }
  }

  private setupBrand() {
    const name = ExtensionBrandResolver.command;
    brand.aimFile = `${name}.aimFile`;
    brand.showBuiltinFeatures = `${name}.showBuiltinFeatures`;
    brand.hideBuiltinFeatures = `${name}.hideBuiltinFeatures`;
    brand.showActivityBar = `${name}.showActivityBar`;
    brand.showOutputLog = `${name}.showOutputLog`;
    brand.openColorPicker = `${name}.openColorPicker`;
    brand.openEmbedBrowser = `${name}.openEmbedBrowser`;
    brand.enableEditMode = `${name}.enableEditMode`;
    brand.reopenClosedEditor = `${name}.reopenClosedEditor`;
    brand.resetBackgroundColors = `${name}.resetBackgroundColors`;
    brand.resetForegroundColors = `${name}.resetForegroundColors`;

    this.validateSetup();
  }

  private validateSetup() {
    if (!Array.isArray(this.commandsJSON)) { return; }

    const commands = this.commandsJSON.map(
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

  private readFromPackageJSON() {
    const extensions = vscode.extensions.all
      .filter(ext => ext.id.includes(resolver));
    if (extensions.length <= 0) {
      throw new Error("PACKAGE.JSON NOT FOUND");
    }
    const packageJSON = extensions[0].packageJSON;
    this.configurationJSON
      = packageJSON.contributes?.configuration || [];
    this.commandsJSON = packageJSON.contributes?.commands || [];
    this.viewsJSON = packageJSON.contributes?.views || {};
  }

  public resolve() {
    const dot = ".";
    const isWebview = (it: HasType) => it.type === "webview";
    const afterLastDot = (str?: string) => str?.split(dot)?.pop();
    const beforeLastDot = (str?: string) =>
      str?.split(dot)?.slice(0, -1)?.join(dot);
    const throws = () => {
      throw new Error("CANNOT SET UNDEFINED TO RESOLVER FIELDS");
    };
    this.readFromPackageJSON();

    const properties =
      this.configurationJSON.properties as HasType[];
    const commands = this.commandsJSON.map(
      (c: { command: string; }) => c.command
    ) as string[];
    const views = Object.values(this.viewsJSON).find((v) => 
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
    if (objectProp2) {
      objectProps.splice(objectProps.indexOf(objectProp2), 1);
    }
    const objectProp3 = objectProps.length > 0 ?
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
    self.configuration1 = beforeLastDot(objectProp1) ?? throws();
    self.configuration2 = beforeLastDot(objectProp2) ?? throws();
    self.configuration3 = beforeLastDot(objectProp3) ?? throws();
    self.objectProperty1 = afterLastDot(objectProp1) ?? throws();
    self.objectProperty2 = afterLastDot(objectProp2) ?? throws();
    self.objectProperty3 = afterLastDot(objectProp3) ?? throws();
    Object.freeze(ExtensionBrandResolver);

    this.setupBrand();
    this.setupColors();
    this.setupDefaultColors();
  }
}
