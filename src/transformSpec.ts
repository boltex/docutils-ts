
import SettingsSpec from "./settingsSpec.js";
import { TransformType, LoggerType, ReferenceResolver } from "./types.js";

/**
 * Runtime transform specification base class.
 * 
 * TransformSpec subclass objects used by `docutils.transforms.Transformer`.
 */
class TransformSpec extends SettingsSpec {
    public unknownReferenceResolvers: ReferenceResolver[] = [];
    protected logger: LoggerType;

    public constructor(args: { logger: LoggerType }) {
        super();
        this.logger = args.logger;
    }

    /**
     * Get the transforms associated with the instance.
     * @returns {Array} array of Transform classes (not instances)
     */
    public getTransforms(): TransformType[] {
        return [];
    }

    public toString(): string {
        return `TransformSpec<${this.constructor.name}>`;
    }
}
export default TransformSpec;
