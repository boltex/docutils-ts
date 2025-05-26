import { document } from "./nodes.js";
import {
    ComponentInterface,
    Components,
    Document,
    NodeInterface,
    TransformerInterface,
    TransformType,
    LoggerType,
    ReferenceResolver,
} from "./types.js";
import { ApplicationError } from "./exceptions.js";

function leftPad(num: number, len: number, pad: string): string {
    return pad.repeat(len - num.toString().length) + num.toString();
}

/**
 * Transformer class responsible for transforming document output
 */
class Transformer implements TransformerInterface {
    private logger: LoggerType;
    public transforms: [string, TransformType, NodeInterface | null, Record<string, any>][];
    public unknownReferenceResolvers: ReferenceResolver[];
    public document: Document;
    // this.applied.push([priority, TransformClass, pending, kwargs]);

    public applied: [string, TransformType, NodeInterface | null, Record<string, any>][];
    public sorted: number;
    public components: Components;
    public serialno: number;

    /**
     * Create transformer class
     * @param {nodes.myDoc} myDoc - document to transform
     */
    public constructor(myDoc: document, logger: LoggerType) {
        this.logger = logger;
        this.transforms = [];
        this.unknownReferenceResolvers = [];
        this.document = myDoc;
        this.applied = [];
        this.sorted = 0;
        this.components = {};
        this.serialno = 0;
    }

    /**
     * populateFromComponents
     */
    public populateFromComponents(...components: ComponentInterface[]): void {
        this.logger.silly('populateFromComponents');
        for (const component of components) {
            if (!component) {
                this.logger.warn('component is undefined');
                continue;
            }
            this.logger.silly(`processing ${component.toString()} ${component.componentType}`);
            const transforms = component.getTransforms() || [];
            transforms.forEach((t): void => {
                if (typeof t === 'undefined') {
                    throw new Error(`got invalid transform from ${component}`);
                }
            });

            if (transforms.filter((x): boolean => typeof x === 'undefined').length !== 0) {
                throw new Error(`got invalid transform from ${component}`);
            }

            this.logger.silly('adding transforms for component');
            this.addTransforms(transforms);
            // check for existing key?
            this.components[component.componentType] = component;
        }
        this.sorted = 0;
        const urr: ReferenceResolver[] = [];
        for (const i of components) {
            if (i !== undefined) {
                this.logger.silly(`collecting unknownReferenceResolver from component ${i}`);
                if (i.unknownReferenceResolvers) {

                    urr.push(...i.unknownReferenceResolvers);
                }
            } else {
                //              console.log('component is undefined. fixme');
            }
        }

        for (const f of urr) {
            if (typeof f === 'undefined') {
                throw new ApplicationError('Unexpected undefined value in ist of unknown reference resolvers');
            }
        }
        const decoratedList = urr.map((f): [number, ReferenceResolver] => [f.priority, f]);
        decoratedList.sort();
        this.unknownReferenceResolvers.push(...decoratedList.map((f): ReferenceResolver => f[1]));
    }

    /**
     * apply the transforms
     */
    public applyTransforms(): void {
        this.document.reporter.attachObserver(
            this.document.noteTransformMessage
                .bind(this.document),
        );
        while (this.transforms.length) {
            if (!this.sorted) {
                this.transforms.sort((el1, el2): number => {

                    if (el1[0] < el2[0]) {
                        return -1;
                    }

                    if (el1[0] > el2[0]) {
                        return 1;
                    }
                    return 0;
                });
                this.transforms.reverse();
                this.sorted = 1;
            }
            const t = this.transforms.pop()!;

            const [priority, TransformClass, pending, kwargs] = t;
            try {
                const transform = new TransformClass(this.document, pending);
                this.logger.info('applying transfomer class', { value: typeof TransformClass });
                transform.apply(kwargs);
            } catch (error) {
                throw error;
            }
            this.applied.push([priority, TransformClass, pending, kwargs]);
        }
    }

    /**
     * Store multiple transforms, with default priorities.
     * @param {Array} transformList - Array of transform classes (not instances).
     */
    public addTransforms(transformList: TransformType[]): void {
        transformList.forEach((transformClass): void => {
            if (!transformClass) {
                throw new Error('invalid argument');
            }
            const priorityString = this.getPriorityString(
                transformClass, transformClass.defaultPriority);
            //          console.log(`priority string is ${priorityString}`);
            //          console.log(`I have ${transformClass}`);
            this.transforms.push(
                [priorityString, transformClass, null, {}],
            );
            this.sorted = 0;
        });
    }

    /**
     *
     * Return a string, `priority` combined with `self.serialno`.
     *
     * This ensures FIFO order on transforms with identical priority.
     */
    public getPriorityString(class_: {}, priority: number): string {
        if (typeof class_ === 'undefined') {
            throw new Error('undefined');
        }

        this.serialno += 1;
        return `${leftPad(priority, 3, '0')}-${leftPad(this.serialno, 3, '0')}`;
    }

    public addPending(pending: NodeInterface, priority: number): void {
        // fixme implement
    }
}

export default Transformer;
