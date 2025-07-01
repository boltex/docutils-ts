import * as RSTStates from './rstStates.js';
import {
    Statefactory,
    StatemachineInterface,
    StateConstructor,
    LoggerType,
    StateInterface,
} from "../../types.js";
import RSTStateMachine from './rstStateMachine.js';

class StateFactory implements Statefactory {
    private stateClasses: StateConstructor[] = [];
    private args: any | undefined;
    private logger: LoggerType;
    public constructor(args: { logger: LoggerType; stateClasses?: StateConstructor[] }) {
        this.logger = args.logger;
        this.logger.silly('constructor');
        this.args = args;
        if (args && args.stateClasses && args.stateClasses.length) {
            this.stateClasses = args.stateClasses;
        } else {
            this.stateClasses = [
                RSTStates.Body,
                RSTStates.BulletList,
                RSTStates.DefinitionList,
                RSTStates.EnumeratedList,
                RSTStates.FieldList,
                RSTStates.OptionList,
                RSTStates.LineBlock,
                RSTStates.ExtensionOptions,
                RSTStates.Explicit,
                RSTStates.Text,
                RSTStates.Definition,
                RSTStates.Line,
                RSTStates.SubstitutionDef
            ];
        }
    }

    public createBody(): any {
        return this.createState('Body');
    }

    public createBulletList(): any {
        return this.createState('BulletList');
    }

    public createDefinition(): any {
        return this.createState('Definition');
    }

    public createDefinitionList(): any {
        return this.createState('DefinitionList');
    }

    public createEnumeratedList(): any {
        return this.createState('EnumeratedList');
    }

    public createExplicit(): any {
        return this.createState('Explicit');
    }

    public createExtensionOptions(): any {
        return this.createState('ExtensionOptions');
    }

    public createFieldList(): any {
        return this.createState('FieldList');
    }

    public createLineBlock(): any {
        return this.createState('LineBlock');
    }

    public createLine(): any {
        return this.createState('Line');
    }

    public createOptionList(): any {
        return this.createState('OptionList');
    }

    public createQuotedLiteralBlock(): any {
        return this.createState('QuotedLiteralBlock');
    }

    public createSpecializedBody(): any {
        return this.createState('SpecializedBody');
    }

    public createSpecializedText(): any {
        return this.createState('SpecializedText');
    }

    public createText(): any {
        return this.createState('Text');
    }

    public createState(stateName: string, stateMachine?: StatemachineInterface): any {
        //this.logger.silly('createState', { value:stateName});
        if (typeof stateName === 'undefined') {
            throw new Error('Need argument stateName');
        }

        if (typeof stateMachine === 'undefined') {
            throw new Error('Need argument stateMAchine');
        }

        if (!Object.prototype.hasOwnProperty.call(RSTStates, stateName)) {
            throw new Error(`Unknown state ${stateName}`);
        }


        const StateClass = RSTStates[stateName as keyof typeof RSTStates];
        let state = new StateClass(stateMachine as RSTStateMachine, false);

        // This has to be done post-construction due to how instance property initiailization order

        (state as any).addInitialTransitions(); // state is StateInterface

        // this.logger.silly('createState finish', { value:stateName});
        return state;
    }

    public getStateClasses(): StateConstructor[] {
        return this.stateClasses;
    }

    public withStateClasses(stateClasses: StateConstructor[]): this {
        // @ts-ignore
        return new StateFactory({ stateClasses, logger: this.logger });
    }
}

export default StateFactory;
