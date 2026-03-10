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
  openEditorRulers: string;
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
  editorLayoutTwoRows: "workbench.action.editorLayoutTwoRows",
  focusSecondEditorGroup: "workbench.action.focusSecondEditorGroup",
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
function eject<T>(arr: Array<T>, filter: (item: T) => boolean) {
  const index = arr.findIndex(filter);
  return index >= 0 ? arr.splice(index, 1)[0] : undefined;
}

export class ExtensionBrandResolver {
  public static readonly command: string;
  public static readonly webview: string;
  public static readonly configuration0: string;
  public static readonly configuration1: string;
  public static readonly configuration2: string;
  public static readonly configuration3: string;
  public static readonly objectProperty0: string;
  public static readonly objectProperty1: string;
  public static readonly objectProperty2: string;
  public static readonly objectProperty3: string;
  public static readonly openSettings: () => Promise<void>;
  public static readonly openRunningExtensions: () => Promise<void>;
  public static readonly subsriptions: vscode.Disposable[] = [];

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
      defaults.find(([n, ]) =>
        n.includes(ExtensionBrandResolver.objectProperty2))?.[1]
      : undefined;
    if (background) {
      Object.entries<string>((background as any).default)
        .forEach((r) => backgroundDefault.colors.set(r[0], r[1]));
    }
    const foreground = defaults.length > 0 ?
      defaults.find(([n, ]) =>
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
    brand.openEditorRulers = `${name}.openEditorRulers`;
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
    const isBoolean = (it: HasType) => it.type === "boolean";
    const isWebview = (it: HasType) => it.type === "webview";
    const afterLastDot = (str?: string) => str?.split(dot)?.pop();
    const beforeLastDot = (str?: string) =>
      str?.split(dot)?.slice(0, -1)?.join(dot);
    const throws = () => {
      throw new Error("CANNOT SET UNDEFINED TO RESOLVER FIELDS");
    };
    this.readFromPackageJSON(); // the first step of branding

    const properties =
      this.configurationJSON.properties as HasType[];
    const commands = this.commandsJSON.map(
      (c: { command: string; }) => c.command
    ) as string[];
    const views = Object.values(this.viewsJSON).find((v) => 
      Array.isArray(v) && v.some(item => isWebview(item))
    ) as Array<HasId>;
    // get all the properties in package.json
    const objectProps = properties ?
      Object.entries<HasType>(properties).flatMap(
        ([name, property]) => isObject(property) ? [name]: []
      ) : [];
    // make objectProp0 be boolean and objectProp1 be Object
    const objectProps0 = properties ?
      Object.entries<HasType>(properties).flatMap(
        ([name, property]) => isBoolean(property) ? [name]: []
      ) : [];
    const objectProp0 = objectProps0.length > 0 ?
      objectProps0[0] : undefined;
    // eject those aren't color property
    const objectProp1 = objectProps.length > 0 ?
      eject(objectProps, (p) => !hasColor(p)) : undefined;
    // make objectProp2 be color rules
    const objectProp2 = objectProps.length > 0 ?
      objectProps.find((p) => hasColor(p)) : undefined;
    if (objectProp2) {
      objectProps.splice(objectProps.indexOf(objectProp2), 1);
    }
    // make objectProp3 be another color rules
    const objectProp3 = objectProps.length > 0 ?
      objectProps.find((p) => hasColor(p)) : undefined;
    // get first value of the command names
    const command = new Set<string>(
      commands.map((c) => c.split(dot)[0])
    ).keys().next().value;
    // get first (and single) value of the view names
    const view = views.length > 0 ?
      views[0].id
    : undefined;
    // init all the fields of the class
    const self = ExtensionBrandResolver as any;
    self.command = command; // set common brand name for commands
    self.webview = view; // set name for webview
    // composition for configs and properties in package.json
    self.configuration0 = beforeLastDot(objectProp0) ?? throws();
    self.configuration1 = beforeLastDot(objectProp1) ?? throws();
    self.configuration2 = beforeLastDot(objectProp2) ?? throws();
    self.configuration3 = beforeLastDot(objectProp3) ?? throws();
    self.objectProperty0 = afterLastDot(objectProp0) ?? throws();
    self.objectProperty1 = afterLastDot(objectProp1) ?? throws();
    self.objectProperty2 = afterLastDot(objectProp2) ?? throws();
    self.objectProperty3 = afterLastDot(objectProp3) ?? throws();
    Object.freeze(ExtensionBrandResolver); // stop class edition
    // setup all dedicated instances
    this.setupBrand();
    this.setupColors();
    this.setupDefaultColors();
  }

  public static dispose() {
    ExtensionBrandResolver.subsriptions.forEach((subsription) =>
      subsription.dispose()
    );
  }
}
