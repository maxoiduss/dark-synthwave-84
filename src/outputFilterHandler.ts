import * as vscode from "vscode";
import { window } from "vscode";
import { ConfigurationManager } from "./configurationManager";
import {
  brand,
  commands,
  ExtensionBrandResolver
} from "./extensionBrandResolver";
import {
  CommandInterceptor,
  InterceptorType
} from "./commandInterceptor";

interface LogConfig {
  name: string;
  show: string[];
  exclude: string[];
}

const empty = '';
const tag = {
  get name() { return ExtensionBrandResolver.configuration1; },
  scheme: {
    get rules() { return ExtensionBrandResolver.objectProperty1; }
  }
} as const;

export class OutputFilterHandler implements vscode.Disposable {
  private static readonly subscriptions: Map<number, vscode.Disposable> =
    new Map();
  private copyRegistered: boolean = false;
  private configurationRegistered: boolean = false;
  private lastCopiedText: string = empty;
  private dismissNotification: (() => void) | undefined;
  
  private readonly pasteCommand!: CommandInterceptor;
  private readonly targetLogs: Map<string, LogConfig> = new Map();
  private readonly configManager: ConfigurationManager =
    ConfigurationManager.getInstance(tag.name);

  constructor(private readonly context: vscode.ExtensionContext) {
    const changedConfig = this.configManager.onChangedConfiguration(tag.name,
      `${tag.name}.${tag.scheme.rules}`,
      () => this.updateConfiguration(changedConfig)
    );
    const changedTextEditor = window.onDidChangeActiveTextEditor((editor) => {
      if (this.getLogTarget(editor?.document) !== false) {
        if (!this.copyRegistered) {
          OutputFilterHandler.subscriptions.set(1, this.registerCopyCommand());
          this.copyRegistered = true;
        }
      } else if (this.copyRegistered) {
        OutputFilterHandler.subscriptions.get(1)?.dispose();
        OutputFilterHandler.subscriptions.delete(1);
        this.copyRegistered = false;
      }
    });
    OutputFilterHandler.subscriptions.set(1, this.registerCopyCommand());
    OutputFilterHandler.subscriptions.set(10, this.registerShowLogCommand());
    OutputFilterHandler.subscriptions.set(100, changedConfig);
    OutputFilterHandler.subscriptions.set(1000, changedTextEditor);

    this.pasteCommand = new CommandInterceptor(
      commands.clipboardPasteAction, InterceptorType.Weak, this.context, () =>
        this.closeNotification(), async () =>
        await vscode.env.clipboard.writeText(this.lastCopiedText)
    );
    this.copyRegistered = true;
    this.updateConfiguration();
  }

  public dispose() {
    OutputFilterHandler.subscriptions.forEach((subscription, _) => {
      subscription.dispose();
    });
    this.pasteCommand.destroy();
    OutputFilterHandler.subscriptions.clear();
  }

  private checkConfigListener(
    didChangeConfigurationListener?: vscode.Disposable
  ) {
    if (!this.configurationRegistered) {
      if (didChangeConfigurationListener) {
        this.context.subscriptions.push(didChangeConfigurationListener);
        this.configurationRegistered = true;
      }
    }
  }

  private async updateConfiguration(
    didChangeConfigurationListener?: vscode.Disposable
  ): Promise<void> {
    this.checkConfigListener(didChangeConfigurationListener);
    const configNames = (): [string, string] => [tag.name, tag.scheme.rules];

    await this.configManager.makeUpdateConfiguration(configNames,
      async (configTarget): Promise<Record<string, string>> =>
      {
        const targetLogsStrings =
          this.configManager.getValue<Record<string, string>>(
            configNames()[0], configNames()[1], configTarget
          );
        if (!targetLogsStrings) { return {}; }

        const targetLogs = await this.parseRulesConfiguration(
          targetLogsStrings
        );
        if (!targetLogs) { return {}; }

        const logs = this.configManager.recordToArray(targetLogs);
        const rules: [string, string][] = logs.map(([name, log]) =>
          [`${name}:${log.name}`, this.simplifyLogConfig(log)]
        );
        const validatedRules = this.validateRules(rules);
        this.refreshTargetLogsBy(logs);

        return Object.fromEntries(validatedRules);
      }
    );
  }

  private validateRules(rules: [string, string][]): [string, string][] {
    return rules.filter(([_, rule]) => rule !== empty);
  }

  private refreshTargetLogsBy(source: [string, LogConfig][]) {
    this.targetLogs.clear();
    source.forEach(([k, v]) => this.targetLogs.set(k, v));
  }

  private async parseRulesConfiguration(
    rulesConfig: Record<string, string>
  ): Promise<Record<string, LogConfig> | undefined> {
    const targetLogs = this.configManager.recordToArray<string>(rulesConfig)
                                         .flatMap(([names, rules]) => {
      const splittedName = names.split(":").map((name) => name.trim());
      const splittedRule = rules.split(",").map((rule) => rule.trim());

      if (splittedName.length < 2 || splittedRule.length <= 0) { return []; }

      const doc = splittedName[0];
      const name = splittedName[1];
      const include = splittedRule.filter((rule) => !rule.startsWith("!"));
      const exclude = splittedRule.filter((rule) => rule.startsWith("!"))
                                  .map((r) => r.substring(1));
      return [{ [doc]: {name: name, show: include, exclude: exclude} }];
    }).reduce((prev, curr) => {
      return { ...prev, ...curr };
    }, {} as Record<string, LogConfig>);

    return targetLogs as Record<string, LogConfig>;
  }
  
  private registerShowLogCommand(): vscode.Disposable {
    const show = vscode.commands.registerCommand(brand.showOutputLog,
      async () => {
        this.lastCopiedText = await vscode.env.clipboard.readText();
  
        const logNames = Array
          .from(this.targetLogs.values())
          .map((log) => log.name);
        const selected = await window.showQuickPick(
          logNames, { title: "Choose the Output channel"}
        );
        if (!selected) { return; }
  
        await vscode.env.clipboard.writeText(selected);
        const openLog = vscode.commands.executeCommand(commands.showLogs);
        await vscode.commands.executeCommand(commands.clipboardPasteAction);
        await vscode.commands.executeCommand(commands.quickInputAccept);
        await vscode.env.clipboard.writeText(this.lastCopiedText);
        await openLog;
        await vscode.commands.executeCommand(commands.outputFocus);
        await new Promise((resolve) => setTimeout(resolve, 50));
        await vscode.commands.executeCommand(commands.clipboardCopyAction);
      }
    );
    this.context.subscriptions.push(show);

    return show;
  }
  
  private registerCopyCommand(): vscode.Disposable {
    const copy = vscode.commands.registerCommand(
      commands.clipboardCopyAction,
      async () => {
        const editor = window.activeTextEditor;
        if (!editor) { return; }
  
        this.closeNotification();
  
        const selection = editor.selection;
        const selected = editor.document.getText(selection);
        const target = this.getLogTarget(editor.document);
  
        if (target && selected === empty) {
          this.lastCopiedText = await vscode.env.clipboard.readText();
          this.pasteCommand.register();
          
          if (target as unknown as LogConfig) {
            const config = target as LogConfig;
            await this.sendToClipboardAndNotify(config);
          }
        } else {
          if (selected !== empty) {
            await vscode.env.clipboard.writeText(selected);
          }
        }
      }
    );
    this.context.subscriptions.push(copy);

    return copy;
  }

  private closeNotification() {
    this.dismissNotification?.();
    this.dismissNotification = undefined;
  }

  private async showCanOpenSettings(): Promise<void> {
    const yes = "Yes";
    const answer = await window.showInformationMessage(
      "You can check the rules in settings. Open settings?", yes, "No");
    if (answer === yes) {
      await ExtensionBrandResolver.openSettings();
    }
  }

  private simplifyLogConfig(config: LogConfig): string {
    const comma = ", ";
    const exclude = config.exclude.length > 0 && config.exclude[0].length > 0 ?
      `!${config.exclude.join(`${comma}!`)}` : empty;
    const include = config.show.join(comma);
    
    return [include, exclude].filter(Boolean).join(comma);
  }
  
  private async sendToClipboardAndNotify(config: LogConfig): Promise<void> {
    const text = this.simplifyLogConfig(config);
    await vscode.env.clipboard.writeText(text);
  
    return window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "You can paste the rule to the Filter in Output now.",
        cancellable: true
      }, async (_progress, token) => {
        const onCancel = token.onCancellationRequested(async () => {
          await this.showCanOpenSettings();
          onCancel.dispose();
        });
  
        return new Promise<void>((resolve) => {
            this.dismissNotification = resolve;
        });
    });
  }
  
  private getLogTarget(
    doc: vscode.TextDocument | undefined
  ): boolean | LogConfig {
    if (!doc) { return false; }
  
    if (this.targetLogs.has(doc.fileName)) {
      const config = this.targetLogs.get(doc.fileName);
      return config ?? true;
    }
    return false;
  }
}
