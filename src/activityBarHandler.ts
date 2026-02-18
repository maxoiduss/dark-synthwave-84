import * as vscode from "vscode";
import { brand, commands } from "./extensionBrandResolver";

const unknownBarToggleIcon: string = "question";
const activityBarToggleIcon: string = "layout-sidebar-left-dock";
const unknownActivityBarText: string = "Toggle Activity Bar or ...";
const showHideActivityBarText: string = "Show/Hide Activity Bar";
const toggleSideBarCommand: string = "Toggle Side Bar";
const toggleFullScreenCommand: string = "Toggle Fullscreen";
const toggleActivityBarCommand: string = "Toggle Activity Bar";

export class ActivityBarHandler {
  private static activityBarToggle: vscode.StatusBarItem | undefined;
  private static disposed: boolean = false;
  private static created: boolean = false;

  private static readonly timeGap: number = 200;

  private static changeIconTo(state: { unknown: boolean }) {
    const codicon = state.unknown ?
      unknownBarToggleIcon
    : activityBarToggleIcon;
    this.activityBarToggle!.text = `$(${codicon})`;
  }

  private static changeTooltipTo(state: { unknown: boolean }) {
    const tooltip = state.unknown ?
      unknownActivityBarText
    : showHideActivityBarText;
    this.activityBarToggle!.tooltip = tooltip;
  }
  
  private static async toggleFullscreenOrActivityBar() {
    this.changeIconTo({ unknown: true });
    this.changeTooltipTo({ unknown: true });

    const picked = await vscode.window.showQuickPick([
      toggleFullScreenCommand,
      toggleSideBarCommand,
      toggleActivityBarCommand
      ], { title: "What to toggle?", canPickMany: false }
    );
    if (picked === toggleFullScreenCommand) {
      vscode.commands.executeCommand(
        commands.toggleFullScreen
      );
    } else
    if (picked === toggleActivityBarCommand) {
      this.toggleActivityBar();
    } else
    if (picked === toggleSideBarCommand) {
      vscode.commands.executeCommand(
        commands.toggleSideBarVisibility
      );
    }
    this.changeIconTo({ unknown: false });
    this.changeTooltipTo({ unknown: false });
  }

  private static toggleActivityBar() {
    vscode.commands.executeCommand(
      commands.toggleActivityBarVisibility
    );
  }

  public static create(): vscode.Disposable | undefined {
    if (this.created) { return; }
    
    this.activityBarToggle = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.changeIconTo({ unknown: false });
    this.changeTooltipTo({ unknown: false });
    this.activityBarToggle.command = brand.showActivityBar;
    this.activityBarToggle.show();
    this.created = true;

    let callCount = 0;
    let timeout: number;
    const activityBarToggle = vscode.commands.registerCommand(
      brand.showActivityBar,
      () => {
        callCount++;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          callCount > 1 ?
            this.toggleFullscreenOrActivityBar()
          : this.toggleActivityBar();
          callCount = 0;
        }, this.timeGap);
      }
    );
    return activityBarToggle;
  }

  public static dispose() {
    if (this.disposed) { return; }
    
    this.activityBarToggle?.dispose();
    this.disposed = true;
  }
}
