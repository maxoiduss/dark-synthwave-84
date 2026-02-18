import * as vscode from "vscode";
import { ConfigurationTarget } from "vscode";

const busy: string = "busy" as const;
const free: string = "free" as const;
const empty: {} = {} as const;

type BusyOrFree = typeof busy | typeof free;
type Empty = typeof empty;

function isEmpty(object: any) {
  return JSON.stringify(object) === JSON.stringify(empty);
}

async function doesWorkspaceSettingsExist(): Promise<boolean> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) { return false; }

  const settingsUri = vscode.Uri.joinPath(
    folders[0].uri, ".vscode", "settings.json"
  );
  try {
      await vscode.workspace.fs.stat(settingsUri);
      return true;
  } catch {
      return false;
  }
}

export class ConfigurationManager {
  private readonly changed: vscode.Event<vscode.ConfigurationChangeEvent> =
    vscode.workspace.onDidChangeConfiguration;
  private readonly configurations: Map<string, BusyOrFree> = new Map();

  private static instance: ConfigurationManager;
  public static getInstance(configuration: string): ConfigurationManager {
    ConfigurationManager.instance ??= new ConfigurationManager();
    ConfigurationManager.instance.configurations.set(configuration, "free");

    return ConfigurationManager.instance;
  }
  private constructor() { }

  public onChangedConfiguration(configuration: string,
    configurationFullName: string,
    listener: () => any,
    thisArgs?: any,
    disposables?: vscode.Disposable[]
  ): vscode.Disposable {
    const onDidChangeConfiguration = this.changed((e) => {
      if (this.configurations.has(configuration)
        && e.affectsConfiguration(configurationFullName)) {
        listener();
      }
    }, thisArgs, disposables);

    return onDidChangeConfiguration;
  }

  public async makeUpdateConfiguration<T extends Empty | undefined>(
    config: () => [string, string | undefined],
    update: (target: ConfigurationTarget) => Promise<T>,
    setter: (...args: any[]) => Promise<any> = this.setValue
  ): Promise<void> {
    const configuration: string = config()[0];
    const section: string | undefined = config()[1];

    if (this.configurations.get(configuration) === busy) {
      return;
    }
    this.configurations.set(configuration, busy);
    try {
      const workspaceSettingsExist = await doesWorkspaceSettingsExist();
      const updateThenSet = async (on: ConfigurationTarget): Promise<T> =>
      {
        const onScope = on;
        const value = await update(onScope);
  
        if (!workspaceSettingsExist && isEmpty(value)) {
          return value;
        }
        if (setter === this.setValue && section) {
          await this.setValue(configuration, section, onScope, value);
        } else {
          await setter(value);
        }
        return value;
      };
      const global = await updateThenSet(ConfigurationTarget.Global);
      const wspace = await updateThenSet(ConfigurationTarget.Workspace);
  
      if (isEmpty(wspace) && !isEmpty(global)) {
        await updateThenSet(ConfigurationTarget.Global);
      }
    } finally {
      this.configurations.set(configuration, free);
    }
  }

  public getValue<T>(
    config: string | undefined,
    section: string,
    target: ConfigurationTarget
  ): T | undefined {
    const configuration = vscode.workspace.getConfiguration(config);
    const inspection = configuration.inspect(section);
    const value = target === ConfigurationTarget.Global ?
      inspection?.globalValue
    : target === ConfigurationTarget.Workspace ?
        inspection?.workspaceValue
      : inspection?.workspaceFolderValue;
    return value as T | undefined;
  }

  public async setValue<T extends Empty | undefined>(
    config: string | undefined,
    section: string,
    target: ConfigurationTarget,
    value: T
  ): Promise<void> {
    const configuration = vscode.workspace.getConfiguration(config);
    try {
      await configuration.update(section, value, target);
    } catch (error) {
      const message = error?.toString() ?? "Configuration save error";
      vscode.window.showErrorMessage(message);
    }
  }

  public async cleanValue(
    configuration: string, 
    section: string
  ): Promise<void> {
    const global = ConfigurationTarget.Global;
    const workspace = ConfigurationTarget.Workspace;
    if (this.configurations.get(configuration) === busy) {
      return;
    }
    this.configurations.set(configuration, busy);
    try {
      await this.setValue(configuration, section, global, undefined);
      await this.setValue(configuration, section, workspace, undefined);
    } finally {
      this.configurations.set(configuration, free);
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
