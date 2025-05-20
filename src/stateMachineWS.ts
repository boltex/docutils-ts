import { StateMachine } from './stateMachine.js';
import { Document, GetIndentedArgs, WhitespaceStatemachine } from "./types.js";
import StringList from "./stringList.js";

class StateMachineWS extends StateMachine implements WhitespaceStatemachine {
    public document?: Document;

    public matchTitles?: boolean;

    public getIndented(labeled: GetIndentedArgs): [StringList, number, number, boolean] {
        const cArgs = { ...labeled };
        if (typeof labeled.stripIndent === 'undefined') {
            cArgs.stripIndent = true;
        }
        let offset = this.absLineOffset() || 0;

        const [indented, indent, blankFinish] = this.inputLines.getIndented({
            start: this.lineOffset,
            untilBlank: cArgs.untilBlank,
            stripIndent: cArgs.stripIndent,
        });
        if (indented) {
            this.nextLine(indented.length - 1);
        }
        while (indented && indented.length && !(indented[0].trim())) {
            indented.trimStart();
            offset += 1;
        }
        return [indented, indent, offset, blankFinish];
    }

    public getKnownIndented(labeled: GetIndentedArgs): [StringList, number, boolean] {
        const cArgs: GetIndentedArgs = { ...labeled };
        if (typeof cArgs.stripIndent === 'undefined') {
            cArgs.stripIndent = true;
        }
        let offset = this.absLineOffset() || 0;

        const [indented, indent, blankFinish] = this.inputLines.getIndented({
            start: this.lineOffset,
            untilBlank: cArgs.untilBlank, stripIndent: cArgs.stripIndent, blockIndent:
                cArgs.indent,
        });
        this.nextLine(indented.length - 1);
        while (indented.length && !(indented[0].trim())) {
            indented.trimStart();
            offset += 1;
        }
        return [indented, offset, blankFinish];
    }

    public getFirstKnownIndented(args: GetIndentedArgs): [StringList, number, number, boolean] {
        const cArgs: GetIndentedArgs = { ...args };
        if (cArgs.stripIndent === undefined) {
            cArgs.stripIndent = true;
        }
        if (cArgs.stripTop === undefined) {
            cArgs.stripTop = true;
        }
        let offset = this.absLineOffset() || 0;
        const [indented, indent, blankFinish] = this.inputLines.getIndented({
            start: this.lineOffset,
            untilBlank: cArgs.untilBlank,
            stripIndent: cArgs.stripIndent,
            firstIndent: cArgs.indent,
        });
        this.nextLine(indented.length - 1);
        if (cArgs.stripTop) {
            while (indented.length && !(indented[0].trim())) {
                indented.trimStart();
                offset += 1;
            }
        }
        return [indented, indent, offset, blankFinish];
    }
}

export default StateMachineWS;
