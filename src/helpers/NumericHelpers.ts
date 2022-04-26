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
export function filterPositiveNumeric(value: string): string {
    // https://stackoverflow.com/a/32320458
    // scientific notation or negative numbers can't be entered
    return value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
}

/** Filter everything except - . and digit from a string. Filter also a second . and all following characters or incorrectly placed - */
export function filterNumeric(value: string): string {
    // https://stackoverflow.com/a/32320458
    // scientific notation or negative numbers can't be entered

    // filter non-numerical characters (everything except - . 0123456789)
    // filter a - preceded by other characters and everything after it
    // filter a second . and everything after it
    return value.replace(/[^0-9-.]/g, "").replace(/(.+)-.*/g,"$1").replace(/(\..*?)\..*/g, "$1");
}

/** Wrap angle to interval ]-180,180] */
export function wrapAngle(angle: number): number {
    // javascript % gives the remainder, is negative for negative input -> do ((x % n) + n) % n
    return -((((-angle+180) % 360) + 360) % 360 - 180)
}

/** Calculate statistics incrementally using Welford's algorithm */
export class Statistics {
    private _count = 0;
    private _mean = 0;
    private _m2 = 0;
    private _min = 0;
    private _max = 0;

    update(value : number) {
        // use Welford's algorithm to keep errors low when there is a large offset
        if (this._count == 0) {
            this._min = value;
            this._max = value;
        } else {
            if (value < this._min)
                this._min = value;
            if (value > this._max)
                this._max = value;
        }

        this._count++;

        const delta = value - this._mean;
        this._mean += delta / this._count;

        const delta2 = value - this._mean;
        this._m2 += delta * delta2;
    }

    count() { return this._count; }

    min() { return (this._count == 0) ? NaN : this._min; }
    mean() { return (this._count == 0) ? NaN : this._mean; }
    max() { return (this._count == 0) ? NaN : this._max; }

    /** variance of a population */
    variance() { return (this._count < 2) ? NaN : (this._m2 / this._count); }
    /** standard deviation of a population */
    stddev() { return Math.sqrt(this.variance()); }

    /** variance of a sample from a population */
    sample_variance() { return (this._count < 2) ? NaN : (this._m2 / (this._count - 1)); }
    /** standard deviation of a sample of a population */
    sample_stddev() { return Math.sqrt(this.sample_variance()); }

    toString(formatter: (n: number) => string = x => x.toString()) {
        return `count(${this.count()}) min(${formatter(this.min())}), mean(${formatter(this.mean())}), max(${formatter(this.max())}), stddev(${formatter(this.stddev())}), sample_stddev(${formatter(this.sample_stddev())})`;
    }
}
