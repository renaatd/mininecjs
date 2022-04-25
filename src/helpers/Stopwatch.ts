export class Stopwatch {
    start: number;
    constructor() { this.start = Date.now(); }
    /** elapsed time since creation of stopwatch instance, in ms */
    elapsedMs() { return Date.now() - this.start; }
}