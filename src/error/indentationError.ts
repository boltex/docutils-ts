class IndentationError extends Error {
    public constructor(message: string) {
        super();
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, IndentationError);
        }
        this.message = message;
    }
}
export default IndentationError;
