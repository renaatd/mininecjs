import { beforeAll, describe, expect, test } from 'vitest';
import mininec from '@/models/Mininec';

describe('mininec tests', () => {
    beforeAll(() => {
        // Wait till mininec is fully initialized before running the tests
        // mininec uses a callback for init , convert it to a promise
        // https://stackoverflow.com/a/22519785
        return new Promise((resolve, ) => {
            mininec.addObserverInitialized(<() => void>resolve);
        })

    });
    test('module has a specific version', () => {
        expect(mininec.VERSION).toBe("1.0.0");
    });
    test('setFrequency/getFrequency work together', () => {
        mininec.setFrequency(100.0);
        expect(mininec.getFrequency()).toBe(100.0);
    });
    test('setGeometry accepts simple geometry and parameters can be read', () => {
        const geometry = [
            [0,0,0, 1,0,0, 0.01, 5]
        ];
        const [isSuccess, message] = mininec.setGeometry(false, geometry);
        expect(isSuccess).toBe(true);
        expect(message).toBe("OK");
        expect(mininec.getNoWires()).toBe(1);
        expect(mininec.getNoPulses()).toBe(4);
        expect(mininec.getSegmentLength(0)).toBe(0.2);
        expect(mininec.getPulses(0)).toEqual([-1, 0, 1, 2, 3, -1]);
    });
    test('setGeometry return false on invalid parameter', () => {
        const geometry = [
            [0,0,0, 1,0,0, 0.01, -10]
        ];
        const [isSuccess, message] = mininec.setGeometry(false, geometry);
        expect(isSuccess).toBe(false);
        expect(message).toContain("wire 1");
    });
    test('S-domain loadImpedances work correctly', () => {
        const geometry = [
            [0,0,0,    0.01,0,0, 0.001, 1],
            [0.01,0,0, 0,0.01,0, 0.001, 1],
            [0,0.01,0, 0,0,0,    0.001, 1],
        ]
        const [isSuccessSetGeometry, ] = mininec.setGeometry(false, geometry);
        expect(isSuccessSetGeometry).toBe(true);
        mininec.setFrequency(1);
        const loads = [
            [2, 0, 10, 20], // begin of second wire: fixed impedance 10 + j * 20
            [3, 0, 1, 0, 0, 1e-6, 1], // begin of third wire: inductor 1 µH
            [3, 1, 0, 1, 1, 0, 1e-9], // end of third wire: capacitor 1 nF
        ]
        const [isSuccessSetLoads, ] = mininec.setLoads(loads);
        expect(isSuccessSetLoads).toBe(true);

        const loadImpedances = mininec.getLoadImpedances();
        expect(loadImpedances.length).toBe(3);
        expect(loadImpedances[0].re).toBe(10);
        expect(loadImpedances[0].im).toBe(20);
        expect(loadImpedances[1].re).toBeCloseTo(0, 4);
        expect(loadImpedances[1].im).toBeCloseTo(6.2832, 4);
        expect(loadImpedances[2].re).toBeCloseTo(0, 4);
        expect(loadImpedances[2].im).toBeCloseTo(-159.1549, 4);
    });
});