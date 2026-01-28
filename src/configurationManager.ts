import * as vscode from "vscode";
import { ConfigurationTarget } from "vscode";

const busy: string = "busy" as const;
const free: string = "free" as const;
type busy_or_free = typeof busy | typeof free;

function same(obj1: {} | undefined, obj2: {} | undefined) {
  return JSON.stringify(obj1) === JSON.stringify(obj2)
}

export class ConfigurationManager {
  private readonly changed: vscode.Event<vscode.ConfigurationChangeEvent> =
    vscode.workspace.onDidChangeConfiguration;
  private readonly configurations: Map<string, busy_or_free> = new Map();
  private readonly workspaceSectionValues: Map<string, {}> = new Map();
  private readonly globalSectionValues: Map<string, {}> = new Map();
  private readonly changedSectionValues: Map<string, boolean> = new Map()
  private readonly lastUsedSectionScopes: Map<string, ConfigurationTarget> =
    new Map();
  private static instance: ConfigurationManager;
  public static getInstance(configuration: string): ConfigurationManager {
    ConfigurationManager.instance ??= new ConfigurationManager();
    ConfigurationManager.instance.configurations.set(configuration, "free");

    return ConfigurationManager.instance ;
  }
  private constructor() {}

  private detectConfigTarget(
    configuration: vscode.WorkspaceConfiguration,
    section: string
  ): ConfigurationTarget | undefined {
    const inspection = configuration.inspect(section);
    const workspaceValue = inspection?.workspaceValue as any;
    const globalValue = inspection?.globalValue as any;
    const workspaceOldValue = this.workspaceSectionValues.get(section);
    const globalOldValue = this.globalSectionValues.get(section);
    let configTarget: ConfigurationTarget | undefined;

    const onWorkspace = !same(workspaceOldValue, workspaceValue);
    const onGlobal = !same(globalOldValue, globalValue);
    if (onWorkspace) {
      this.workspaceSectionValues.set(section, workspaceValue);
      this.changedSectionValues.set(section, true);
      configTarget = ConfigurationTarget.Workspace;
    }
    if (onGlobal) {
      this.globalSectionValues.set(section, globalValue);
      this.changedSectionValues.set(section, true);
      configTarget = ConfigurationTarget.Global;
    }
    if (!onGlobal && !onWorkspace) {
      configTarget = undefined;
    } else if (configTarget) {
      this.lastUsedSectionScopes.set(section, configTarget);
    }
    return configTarget;
  }

  public onChangedConfiguration(
    listener: () => any,
    thisArgs?: any,
    disposables?: vscode.Disposable[]
  ): vscode.Disposable {
    const onDidChangeConfiguration = this.changed((e) => {
      if ([...this.configurations].some(
        ([configuration, _]) => e.affectsConfiguration(configuration))
      ) {
        listener();
      }
    }, thisArgs, disposables);

    return onDidChangeConfiguration;
  }

  public configurationWasChanged(
    section: string
  ): boolean {
    const wasChanged = this.changedSectionValues.get(section);
    this.changedSectionValues.set(section, false);

    return wasChanged ?? false;
  }

  public async updateConfiguration(
    config: string,
    update: (configuration: string) => Promise<void>
  ): Promise<void> {
    if (this.configurations.get(config) === busy)
    { return; }

    this.configurations.set(config, busy);
    await update(config);
    this.configurations.set(config, free);
  }

  public getValue<T>(
    config: string,
    section: string
  ): T | undefined {
    const configuration = vscode.workspace.getConfiguration(config);
    const configTarget = this.detectConfigTarget(configuration, section);

    const value = configTarget === ConfigurationTarget.Global ?
      this.globalSectionValues.get(section)
    : configTarget === ConfigurationTarget.Workspace ?
        this.workspaceSectionValues.get(section)
      : configuration.get(section);

    return value as T | undefined;
  }

  public async setValue<T extends {}>(
    config: string,
    section: string,
    value: T
  ): Promise<void> {
    const configuration = vscode.workspace.getConfiguration(config);
    const configTarget = this.lastUsedSectionScopes.get(section);
    try {
      await configuration.update(section, value, configTarget);
    } catch (error) {
      const message = error?.toString() ?? "Configuration save error";
      vscode.window.showErrorMessage(message);
    }
  }

  public recordToArray<T>(record: Record<string, T>): [string, T][] {
    return Object.entries(record).map<[string, T]>(([name, element]) =>
      [ name,
        typeof element === "string" ?
          element
        : { ...element }
      ] as [string, T]
    );
  }
}