import * as vscode from "vscode";
import { brand } from "./extensionBrandResolver";

const activityBarToggleIcon: string = "layout-sidebar-left-dock";
const showHideActivityBarText: string = "Show/Hide Activity Bar";

export class ActivityBarHandler {
  private static activityBarToggle: vscode.StatusBarItem | undefined;
  private static disposed: boolean = false;
  private static created: boolean = false;

  public static create() {
    if (this.created) { return; }
    
    this.activityBarToggle = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.activityBarToggle.text = `$(${activityBarToggleIcon})`;
    this.activityBarToggle.tooltip = showHideActivityBarText;
    this.activityBarToggle.command = brand.showActivityBar;
    this.activityBarToggle.show();

    this.created = true;
  }

  public static dispose() {
    if (this.disposed) { return; }
    
    this.activityBarToggle?.dispose();
    this.disposed = true;
  }
}
