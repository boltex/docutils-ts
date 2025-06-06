import { getLanguage } from "./languages/index.js";
import {
    CoreLanguage,
    Document,
    NodeInterface,
    TransformInterface,
    LoggerType,
} from "./types.js";


export default abstract class Transform implements TransformInterface {
    public document: Document;
    public startNode?: NodeInterface;
    public language?: CoreLanguage;
    public static defaultPriority: number;
    protected logger: LoggerType;
    public constructor(document: Document, startNode?: NodeInterface) {
        this.document = document;
        this.logger = document.logger;
        this.startNode = startNode;
        let languageCode = document.settings.languageCode;
        if (languageCode !== undefined) {
            this.language = getLanguage(languageCode, document.reporter);
        }
        this._init(document, startNode);
    }

    public _init(document: Document, startNode: NodeInterface | undefined): void {

    }

    public abstract apply(): void;
}
