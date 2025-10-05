export interface FileSystem {
    writeFile(path: string, data: string | Uint8Array, options?: any): Promise<void>;
    readFile(path: string): Promise<string | Uint8Array>;
}
// Default implementation that warns about missing implementation
const defaultFileSystem: FileSystem = {
    async writeFile(path: string, data: string | Uint8Array, options?: any): Promise<void> {
        console.warn('fileSystem.writeFile is not implemented in this environment.');
    },
    async readFile(path: string, options?: any): Promise<string | Uint8Array> {
        console.warn('fileSystem.readFile is not implemented in this environment.');
        return '';
    }
};

// Singleton instance that can be replaced
let _fileSystemInstance: FileSystem = defaultFileSystem;

// Public API
export const fileSystem = {
    // Method implementations that delegate to the current instance
    writeFile: (path: string, data: string | Uint8Array, options?: any): Promise<void> =>
        _fileSystemInstance.writeFile(path, data),

    readFile: (path: string, options?: any): Promise<string | Uint8Array> =>
        _fileSystemInstance.readFile(path),

    // Method to configure a custom implementation
    setImplementation: (implementation: FileSystem): void => {
        _fileSystemInstance = implementation;
    },

    // Method to reset to default implementation
    resetToDefault: (): void => {
        _fileSystemInstance = defaultFileSystem;
    }
};