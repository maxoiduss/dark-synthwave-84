import {
  commands,
  Disposable,
  ExtensionContext
} from "vscode";

type Voidable = void | Promise<void>;
type CallBack = (() => Voidable) | undefined;
type EnumLike<T> = T[keyof T];
type InterceptorType = EnumLike<typeof InterceptorType>;

// eslint-disable-next-line @typescript-eslint/naming-convention
export const InterceptorType = {
  Strong: "strong",
  Weak:   "weak"               } as const;

export class CommandInterceptor {
  private registered: Disposable | undefined;

  private get isStrong() {
    return this.type === InterceptorType.Strong;
  }

  constructor(
    private command: string,
    private type: InterceptorType,
    private context: ExtensionContext,
    private action: () => Voidable,
    private callback?: CallBack
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
