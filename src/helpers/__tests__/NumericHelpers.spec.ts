import { describe, expect, it } from 'vitest';
import { isNumeric, filterNumeric, wrapAngle } from '@/helpers/NumericHelpers';

describe('isNumeric tests', () => { // the tests container
    it('should return true on valid numbers', () => {
        expect(isNumeric(0)).toBe(true);
        expect(isNumeric(-1)).toBe(true);
        expect(isNumeric(1)).toBe(true);
    });
    it('should return false on invalid numbers', () => {
        expect(isNumeric(NaN)).toBe(false);
        expect(isNumeric(Infinity)).toBe(false);
        expect(isNumeric(-Infinity)).toBe(false);
    });
    it('should return true on valid strings', () => {
        expect(isNumeric('0')).toBe(true);
        expect(isNumeric('-1')).toBe(true);
        expect(isNumeric('1e7')).toBe(true);
        expect(isNumeric('-.3')).toBe(true);
        expect(isNumeric(' -.3 ')).toBe(true);
        expect(isNumeric('.3e1')).toBe(true);
    });
    it('should return false on invalid strings', () => {
        expect(isNumeric('')).toBe(false);
        expect(isNumeric(' ')).toBe(false);
        expect(isNumeric('a 0')).toBe(false);
        expect(isNumeric('0 a')).toBe(false);
        expect(isNumeric('e3')).toBe(false);
        expect(isNumeric('.')).toBe(false);
        expect(isNumeric('.3e')).toBe(false);
    });
});
describe('filterNumeric tests', () => {
    it('should return numbers unmodified', () => {
        expect(filterNumeric('123.4')).toBe('123.4');
        expect(filterNumeric('456')).toBe('456');
    });
    it('should filter all spaces', () => {
        expect(filterNumeric(' 1 2 ')).toBe('12');
    });
    it('should remove double .', () => {
        expect(filterNumeric('123.4.5.6')).toBe('123.4');
    });
    it('should remove all characters', () => {
        expect(filterNumeric('abc123e4z')).toBe('1234');
    });
    it('should remove -', () => {
        expect(filterNumeric('-1')).toBe('1');
    });
});

describe('wrapAngle tests', () => {
    it('should not change in range ]-180,180[', () => {
        expect(wrapAngle(-179)).toBeCloseTo(-179);
        expect(wrapAngle(0)).toBeCloseTo(0);
        expect(wrapAngle(179)).toBeCloseTo(179);
    });
    it('should accept 180', () => {
        expect(wrapAngle(180)).toBeCloseTo(180);
    });
    it('should wrap -180', () => {
        expect(wrapAngle(-180)).toBeCloseTo(180);
    });
    it('should wrap negative angles', () => {
        expect(wrapAngle(-181)).toBeCloseTo(179);
        expect(wrapAngle(-200)).toBeCloseTo(160);
        expect(wrapAngle(-560)).toBeCloseTo(160);
    });
    it('should wrap positive angles', () => {
        expect(wrapAngle(181)).toBeCloseTo(-179);
        expect(wrapAngle(360)).toBeCloseTo(0);
        expect(wrapAngle(720)).toBeCloseTo(0);
    });
});