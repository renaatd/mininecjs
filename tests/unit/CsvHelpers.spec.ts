import * as Csv from "@/helpers/CsvHelpers";

describe('splitLines tests', () => {
    it('should split strings with \\n', () => {
        expect(Csv.splitLines('a\nb')).toEqual(['a','b']);
    });
    it('should split strings with \\r\\n mixed with \\n', () => {
        expect(Csv.splitLines('a\r\nb\nc')).toEqual(['a', 'b', 'c']);
    });
    it('should have empty string if it ends with \n', () => {
        expect(Csv.splitLines('a\nb\n')).toEqual(['a', 'b', '']);
        expect(Csv.splitLines('a\nb\r\n')).toEqual(['a', 'b', '']);
    });
    it('should pass empty lines', () => {
        expect(Csv.splitLines('a\n\nb')).toEqual(['a', '', 'b']);
    });
    it('should accept empty strings', () => {
        expect(Csv.splitLines('')).toEqual(['']);
    });
});

describe('splitCsv tests', () => {
    it('should split at \n and ,', () => {
        expect(Csv.splitCsv('a,b\nc,d')).toEqual([['a','b'],['c','d']]);
    });
    it('should remove empty trailing lines', () => {
        expect(Csv.splitCsv('a,b\n\n')).toEqual([['a','b']]);
    });
    it('should accept empty lines and various lengths', () => {
        expect(Csv.splitCsv('a\n\nb,c')).toEqual([['a'], [''], ['b', 'c']]);
    });
    it('should accept ,, or , at end', () => {
        expect(Csv.splitCsv('a,,c,')).toEqual([['a', '', 'c', '']]);
    });
})

describe('checkCsvNumbers tests', () => {
    it('should accept all numerics', () => {
        expect(Csv.checkCsvNumbers([['1', '-1.3e4', '.4e5']])).toEqual([true, "OK"]);
    });
    it('should accept by default multiple widths', () => {
        expect(Csv.checkCsvNumbers([['1'],['123', '45']])).toEqual([true, "OK"]);
    });
    it('should check width if requested', () => {
        let result = Csv.checkCsvNumbers([['1'],['123', '45']], 2);
        expect(result[0]).toBe(false);
        expect(result[1]).toContain('line 1');

        result = Csv.checkCsvNumbers([['1'],['123', '45']], 1);
        expect(result[0]).toBe(false);
        expect(result[1]).toContain('line 2');
    });
    it('should reject non-numerics', () => {
        const result = Csv.checkCsvNumbers([['a']]);
        expect(result[0]).toBe(false);
    });
    it('should reject empty strings', () => {
        const result = Csv.checkCsvNumbers([['']]);
        expect(result[0]).toBe(false);
    });
})