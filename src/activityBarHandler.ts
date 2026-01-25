import * as vscode from "vscode";
import { brand } from "./hiddenExtensionsProvider";

const activityBarToggleIcon: string = "layout-sidebar-left-dock";

export class ActivityBarHandler {
  private static activityBarToggle: vscode.StatusBarItem | undefined;
  private static disposed: boolean = false;
  private static created: boolean = false;

  public static commandName: string;

  public static create() {
    this.commandName = `${brand}.showActivityBar`;

    if (this.created) { return; }
    
    this.activityBarToggle = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.activityBarToggle.text = `$(${activityBarToggleIcon})`;
    this.activityBarToggle.tooltip = "Show/Hide Activity Bar";
    this.activityBarToggle.command = this.commandName;
    this.activityBarToggle.show();

    this.created = true;
  }

  public static dispose() {
    if (this.disposed) { return; }
    
    this.activityBarToggle?.dispose();
    this.disposed = true;
  }
}