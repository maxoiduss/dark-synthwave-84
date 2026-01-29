import * as vscode from "vscode";
import { ConfigurationTarget } from "vscode";

const empty: {} = {} as const;
const busy: string = "busy" as const;
const free: string = "free" as const;
type busy_or_free = typeof busy | typeof free;
type Empty = typeof empty;

function isEmpty(object: any) {
  return JSON.stringify(object) === JSON.stringify(empty)
}

export class ConfigurationManager {
  private readonly changed: vscode.Event<vscode.ConfigurationChangeEvent> =
    vscode.workspace.onDidChangeConfiguration;
  private readonly configurations: Map<string, busy_or_free> = new Map();

  private static instance: ConfigurationManager;
  public static getInstance(configuration: string): ConfigurationManager {
    ConfigurationManager.instance ??= new ConfigurationManager();
    ConfigurationManager.instance.configurations.set(configuration, "free");

    return ConfigurationManager.instance ;
  }
  private constructor() { }

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

  public async makeUpdateConfiguration<T extends Empty>(
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
    
    const updateThenSet = async (on: ConfigurationTarget): Promise<T> =>
    {
      const onScope = on;
      const value = await update(onScope);

      if (setter === this.setValue && section) {
        await this.setValue(configuration, section, on, value);
      } else {
        await setter();
      }
      return value;
    };
    const global = await updateThenSet(ConfigurationTarget.Global);
    const wspace = await updateThenSet(ConfigurationTarget.Workspace);

    if (isEmpty(wspace) && !isEmpty(global)) {
      await updateThenSet(ConfigurationTarget.Global);
    }
    this.configurations.set(configuration, free);
  }

  public getValue<T>(
    config: string,
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

  public async setValue<T extends Empty>(
    config: string,
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
