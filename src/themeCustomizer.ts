import * as vscode from "vscode";
import { commands } from "./extensionBrandResolver";

const theme = "Dark SynthWave 84";
/*
enum background {
  activity
  button
  debug 
  editor
  focus 
  group 
  menu 
  notification
  panel 
  side 
  status 
  tab 
  title
}

enum foreground {
  activity
  foreground
  notification
  panel
  side
  status
  tab
  title 
}*/

export class ThemeCustomizer {
  private async updateBackgroundValues(values: Map<string, string>) {
    const config = vscode.workspace.getConfiguration();
    const currentCustomizations: any =
      config.get(commands.colorCustomizations) || {};
    const updatedCustomizations = {
      ...currentCustomizations,
      [`[${theme}]`]: {
        ...currentCustomizations[`[${theme}]`],
        /*[background.activity]: newColor,
        [background.button]: newColor,
        [background.debug]: newColor,
        [background.editor]: newColor,
        [background.focus]: newColor,
        [background.group]: newColor,
        [background.menu]: newColor,
        [background.notification]: newColor,
        [background.panel]: newColor,
        [background.side]: newColor,
        [background.status]: newColor,
        [background.tab]: newColor,
        [background.title]: newColor*/
      }
    };
    await config.update(
        commands.colorCustomizations, 
        updatedCustomizations,
        vscode.ConfigurationTarget.Global // Or .Workspace for project-only
    );
  }
}