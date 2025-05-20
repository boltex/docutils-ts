import BaseWriter from '../writer.js';

/**
 * Writer class for POJOWriter
 */
class NoOpWriter extends BaseWriter {
    /**
     * Translate the document to plain old javascript object
     */
    public translate(): void {
        this.output = this.document;
    }
}

// NoOpWriter.settingsSpec = [
//     '"Docutils-js POJO" Writer Options',
//     null,
//     []];
export default NoOpWriter;
