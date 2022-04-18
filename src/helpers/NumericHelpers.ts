/** Return True if a string/number can be converted to a finite number, false on empty string, NaN, Infinity or if there are extra characters.
    Scientific notation is accepted. Leading/trailing whitespace is ignored. */
export function isNumeric(s: string | number): boolean {
    if (typeof s == 'number') {
        // OK
    } else if (typeof s == 'string') {
        s = s.trim();
        if (!s) {
            return false;
        }
    } else {
        return false;
    }
    const n = Number(s); 
    return !isNaN(n) && isFinite(n); 
}

/** Filter everything except . and digit from a string. Filter also a second . and all following characters */
export function filterNumeric(value: string): string {
    // https://stackoverflow.com/a/32320458
    // scientific notation or negative numbers can't be entered
    return value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
}

/** Wrap angle to interval ]-180,180] */
export function wrapAngle(angle: number): number {
    // javascript % gives the remainder, is negative for negative input -> do ((x % n) + n) % n
    return -((((-angle+180) % 360) + 360) % 360 - 180)
}