export default class TransitionCorrection extends Error {
    public stateName: string;
    public constructor(stateName: string) {
        super();
        this.stateName = stateName;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, TransitionCorrection);
        }
    }
}
