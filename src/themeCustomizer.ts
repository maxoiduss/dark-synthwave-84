import * as vscode from "vscode";
import { window } from "vscode";
import { ConfigurationManager } from "./configurationManager";
import {
  backgroundDefault,
  brand,
  commands,
  ExtensionBrandResolver,
  foregroundDefault
} from "./extensionBrandResolver";

type Promises = Promise<void>;

const theme = "Dark SynthWave";

const tag = {
  get background() { return ExtensionBrandResolver.configuration2; },
  get foreground() { return ExtensionBrandResolver.configuration3; },
  scheme: {
    get background() { return ExtensionBrandResolver.objectProperty2; },
    get foreground() { return ExtensionBrandResolver.objectProperty3; }
  }
} as const;

const config = {
  backgroundNames: (): [string, string] =>
    [tag.background, tag.scheme.background],
  foregroundNames: (): [string, string] =>
    [tag.foreground, tag.scheme.foreground],
  fullName: (names: [string, string]): string => names.join(".")
};

export class ThemeCustomizer implements vscode.Disposable {
  private static readonly subscriptions: Map<number, vscode.Disposable> =
      new Map();
  private dismissNotification: (() => void) | undefined;
  
  private readonly configManager: ConfigurationManager =
       ConfigurationManager.getInstance(tag.background)
    && ConfigurationManager.getInstance(tag.foreground);

  private editMode: boolean | undefined = false;
  private previousTextEditor: vscode.TextEditor | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    const changedConfig = {
      first: this.configManager.onChangedConfiguration(tag.background,
        config.fullName(config.backgroundNames()),
        () => this.updateBackgroundConfiguration()
      ),
      second: this.configManager.onChangedConfiguration(tag.foreground,
        config.fullName(config.foregroundNames()),
        () => this.updateForegroundConfiguration()
      )
    };
    const changedTextEditor = window.onDidChangeActiveTextEditor((e) => {
      if (!this.previousTextEditor && e) {
        this.cleanRules();
      }
      this.previousTextEditor = e;
    });
    ThemeCustomizer.subscriptions.set(0, this.registerResetBackground());
    ThemeCustomizer.subscriptions.set(1, this.registerResetForeground());
    ThemeCustomizer.subscriptions.set(10, this.registerEditModeSetup());
    ThemeCustomizer.subscriptions.set(1000, changedConfig.first);
    ThemeCustomizer.subscriptions.set(10000, changedConfig.second);
    ThemeCustomizer.subscriptions.set(100000, changedTextEditor);
    
    this.subscribeConfigurationListeners(changedConfig);
  }

  public dispose() {
    try {
      ThemeCustomizer.subscriptions.forEach((subscription, _) => {
        subscription.dispose();
      });
      this.cleanRules();
    } finally {
      ThemeCustomizer.subscriptions.clear();
    }
  }
  
  private subscribeConfigurationListeners(
    didChangeConfigurationListeners?: {
      first: vscode.Disposable, second: vscode.Disposable
    }
  ) {
    if (didChangeConfigurationListeners) {
      const l = didChangeConfigurationListeners;
      this.context.subscriptions.push(l.first, l.second);
    }
  }

  private registerEditModeSetup(): vscode.Disposable {
    const editMode = vscode.commands.registerCommand(
      brand.enableEditMode,
      async () => await this.editModeSetup()
    );
    this.context.subscriptions.push(editMode);

    return editMode;
  }

  private registerResetBackground(): vscode.Disposable {
    const resetBackground = vscode.commands.registerCommand(
      brand.resetBackgroundColors,
      async () => await this.resetColors("background")
    );
    this.context.subscriptions.push(resetBackground);

    return resetBackground;
  }

  private registerResetForeground(): vscode.Disposable {
    const resetForeground = vscode.commands.registerCommand(
      brand.resetForegroundColors,
      async () => await this.resetColors("foreground")
    );
    this.context.subscriptions.push(resetForeground);

    return resetForeground;
  }
  
  private async cleanRules() {
    this.closeNotification();
    this.editMode = undefined;

    await this.configManager.cleanValue(
      tag.background, tag.scheme.background);
    await this.configManager.cleanValue(
      tag.foreground, tag.scheme.foreground);
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.editMode = false;
  }

  private async editModeSetup(): Promises {
    await this.fillRules("background");
    await this.fillRules("foreground");
    this.closeNotification();
    this.showNotification();
  }
  
  private closeNotification() {
    this.dismissNotification?.();
    this.dismissNotification = undefined;
  }

  private showNotification() {
    window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Setup is on. You can edit theme color rules now.",
        cancellable: true
      }, async (_progress, token) => {
        const onCancel = token.onCancellationRequested(async () => {
          await this.cleanRules();
          onCancel.dispose();
        });
        return new Promise<void>((resolve) => {
            this.dismissNotification = resolve;
        });
    });
  }

  private async updateBackgroundConfiguration(): Promises {
    if (this.editMode === undefined) { return; }
    
    await this.makeUpdate("background");
  }

  private async updateForegroundConfiguration(): Promises {
    if (this.editMode === undefined) { return; }

    await this.makeUpdate("foreground");
  }
  
  private async resetColors(on: "background" | "foreground"): Promises {
    const names: () => [string, string] = on === "background" ?
      config.backgroundNames : config.foregroundNames;
    const has = on === "background" ?
      backgroundDefault.contains : foregroundDefault.contains;
    let configTarget: vscode.ConfigurationTarget;
    let themesOverrides: any;

    await this.cleanRules();
    await this.configManager.makeUpdateConfiguration(names,
      async (target) => {
        configTarget = target;
        themesOverrides = this.configManager.getValue(
          undefined, commands.colorCustomizations, target
        );
        return undefined;
      }, (_) => this.updateValues(
        configTarget, has, themesOverrides
      )
    );
  }
  
  private async fillRules(where: "background" | "foreground"): Promises {
    const names: () => [string, string] = where === "background" ?
      config.backgroundNames : config.foregroundNames;
    const hasColorProperty = where === "background" ?
      backgroundDefault.contains : foregroundDefault.contains;
    let configTarget: vscode.ConfigurationTarget;
    this.editMode = true;

    await this.configManager.makeUpdateConfiguration(names,
      async (target) => {
        configTarget = target;
        const themesOverrides: any = this.configManager.getValue(
          undefined, commands.colorCustomizations, target
        );
        let themeOverrides: any;
        try {
          themeOverrides = themesOverrides[`[${theme}]`];
        } catch (error) { console.warn(`${theme}: no overrides found`); }
        if (!themeOverrides) { return {}; }

        const newRules: any = {};
        Object.keys(themeOverrides).forEach(color => {
          if (hasColorProperty(color)) {
            newRules[color] = themeOverrides[color];
          }
        });
        return newRules;
      }
    );
  }

  private async makeUpdate(what: "background" | "foreground"): Promises {
    const names: () => [string, string] = what === "background" ?
      config.backgroundNames : config.foregroundNames;
    const has = what === "background" ?
      backgroundDefault.contains : foregroundDefault.contains;
    let configTarget: vscode.ConfigurationTarget;
    let themesOverrides: any;
    if (!this.editMode) {
      await this.editModeSetup();
    }
    await this.configManager.makeUpdateConfiguration(names,
      async (target) => {
        configTarget = target;
        themesOverrides = this.configManager.getValue(
          undefined, commands.colorCustomizations, target
        );
        const currentRules: any = this.configManager.getValue(
          names()[0], names()[1], target
        );
        return currentRules;
      }, (rules) => this.updateValues(
        configTarget, has, themesOverrides, rules
      )
    );
  }

  private async updateValues(
    target: vscode.ConfigurationTarget,
    hasColor: (color: string) => boolean, 
    themesOverrides: any, 
    values?: {}
  ): Promises {
    const currentCustomizations = themesOverrides?.[`[${theme}]`] || {};
    const filteredCurrentCustomizations = Object.fromEntries(
      Object.entries(currentCustomizations)
            .filter(([color, _]) => !hasColor(color))
    );
    const updatedCustomizations = {
      ...themesOverrides,
      [`[${theme}]`]: {
        ...filteredCurrentCustomizations,
        ...values
      }
    };
    await this.configManager.setValue(undefined, 
      commands.colorCustomizations, target, updatedCustomizations
    );
  }
}
