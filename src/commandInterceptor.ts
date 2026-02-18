import {
  commands,
  Disposable,
  ExtensionContext
} from "vscode";

type Voidable = void | Promise<void>;
type CallBack = (() => Voidable) | undefined;

export enum InterceptorType {
  Strong = "strong",
  Weak = "weak"
}

export class CommandInterceptor {
  private registered: Disposable | undefined;

  private get isStrong() {
    return this.type === InterceptorType.Strong;
  }

  constructor(
    private readonly command: string,
    private readonly type: InterceptorType,
    private readonly context: ExtensionContext,
    private readonly action: () => Voidable,
    private readonly callback?: CallBack
  ) {
    if (this.isStrong) {
      this.register();
    }
  }
  
  private create(command: string): Disposable {
    return commands.registerCommand(
      command,
      async () => {
        this.destroy();
        this.action();
        
        await commands.executeCommand(command);
        await this.callback?.();

        if (this.isStrong) {
          this.register();
        }
    });
  }

  public register() {
    if (this.registered) { return; }

    this.registered = this.create(this.command);
    this.context.subscriptions.push(
      this.registered
    );
  }

  public destroy() {
    if (this.registered) {
      this.registered.dispose();
      this.registered = undefined;
    }
  }
}
