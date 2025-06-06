import { Action, ArgumentParser, Namespace, ActionConstructorOptions } from 'argparse';

export interface CallbackSignature {
    (parser: ArgumentParser, namespace: Namespace, values: any[], optionString: string | null, callbackArgs?: any): void;
}

export class ActionCallback extends Action {
    private callback?: CallbackSignature;
    private callbackArgs?: any[];
    public constructor(options: ActionConstructorOptions & { callback: CallbackSignature; callbackArgs?: any[] }) {
        super(options);
        this.callback = typeof options.callback !== 'undefined' ? options.callback : undefined;
        this.callbackArgs = typeof options.callbackArgs !== 'undefined' ? options.callbackArgs : undefined;
    }

    public call(parser: ArgumentParser, namespace: Namespace, values: any[],
        optionString: (string | null)): void {
        if (this.callback === undefined) {
            return;
        }
        this.callback(parser, namespace, values, optionString, this.callbackArgs);
    }
}
