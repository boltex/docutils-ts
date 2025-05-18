import StateMachineWS from "../../stateMachineWS.js";
import Inliner from "./inliner.js";
import {
    ContextKind,
    Document,
    StateMachineFactoryFunction,
} from "../../types.js";
import { InlinerInterface, RSTLanguage, RstMemo, Rststatemachine } from "./types.js";
import { getLanguage } from "./languages.js";
import StringList from "../../stringList.js";

/**
 * reStructuredText's master StateMachine.
 * 
 * The entry point to reStructuredText parsing is the `run()` method.
 */
class RSTStateMachine extends StateMachineWS implements Rststatemachine {
    public rstLanguage?: RSTLanguage;
    public memo?: RstMemo;
    public createNestedStateMachine?: StateMachineFactoryFunction<Rststatemachine>
    public createKnownIndentStateMachine?: StateMachineFactoryFunction<Rststatemachine>;
    public createIndentStateMachine?: StateMachineFactoryFunction<Rststatemachine>;
    private inliner?: InlinerInterface;

    public run(inputLines: StringList | string | string[],
        inputOffset: number,
        runContext?: ContextKind,
        inputSource?: {},
        initialState?: string,
        document?: Document,
        matchTitles: boolean = true,
        inliner?: InlinerInterface): (string | {})[] {
        if (document === undefined) {
            throw new Error('need document');
        }
        this.document = document;
        // @ts-ignore
        this.inputLines = inputLines;
        this.inputOffset = inputOffset;
        try {
            if (document.settings === undefined) {
                throw new Error('unexpected');
            }
            const languageCode = document.settings.languageCode;
            if (languageCode !== undefined) {
                this.rstLanguage = getLanguage(languageCode);
            }
        } catch (error) {
            console.log(error);
            throw error;
        }
        this.matchTitles = matchTitles;
        /* istanbul ignore next */
        if (inliner === undefined) {
            this.logger.silly('creating new inliner');
            this.inliner = new Inliner(document, this.logger);
        } else {
            this.inliner = inliner;
        }

        if (this.inliner !== undefined) {
            this.inliner.initCustomizations(document.settings);
        }
        this.memo = {
            document,
            reporter: document.reporter,
            language: this.rstLanguage,
            titleStyles: [],
            sectionLevel: 0,
            sectionBubbleUpKludge: false,
            inliner: this.inliner,
        };
        this.document = document;
        this.attachObserver(document.noteSource.bind(document));
        this.reporter = this.memo.reporter;
        this.node = document;
        const results = super.run(inputLines, inputOffset);

        /* istanbul ignore if */
        if (results.length !== 0) {
            throw new Error('should be empty array return from statemachine.run');
        }
        this.node = undefined;
        this.memo = undefined;

        return [];
    }
}

export default RSTStateMachine;
