import MininNECModule from '@/assets/mininecjs.js'; 
import { Complex, complex } from 'mathjs';

type Observer = (() => void);

type SolveInfo = {
    elapsed_fill_matrix_us: number;
    elapsed_solve_matrix_us: number;
}
type Source = {
    voltage: Complex,
    current: Complex,
    impedance: Complex,
    power: number
}
type PulseCurrent = {
    pulse: number,
    current: Complex
}

type FarFieldDbi = {
    zenith: number,
    azimuth: number,
    horizontal: number,
    vertical: number,
    total: number
}

export type StepSequence = {
    init: number,
    step: number,
    count: number,
}

class State {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    module: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    engine: any = null;

    get VERSION(): string { return this.module.VERSION; }

    // startLoad: number = Date.now();
    observersInitialized: Observer[] = [];
    solveInfo: SolveInfo = { elapsed_fill_matrix_us: 0, elapsed_solve_matrix_us: 0};

    /** Register an observer which is called when mininec is initialized. If mininec is already initialized, the observer is called immediately. */
    addObserverInitialized(observer: Observer):void { 
        if (this.module == null)
            this.observersInitialized.push(observer); 
        else
            observer();
    }

    /** Set frequency, must be strict positive. [MHz] */
    setFrequency(frequencyMhz: number) { this.engine.setFrequency(frequencyMhz); }
    getFrequency() : number { return this.engine.frequency; }

    /** Get wavelength [m] */
    getWavelength(): number { return this.engine.wavelength; }

    getNoWires(): number { return this.engine.noWires; }
    getNoPulses(): number { return this.engine.noPulses; }

    /** Return segment length of a wire. Use 0-based wire no. [m] */
    getSegmentLength(wire: number): number { return this.engine.getSegmentLength(wire); }

    /** Return the list of pulses in a wire, -1 for unconnected. Wire and pulse no are 0-based. */
    getPulses(wire: number): number[] { return this.engine.getPulses(wire); }

    /** Return the load impedances as an array of phasors */
    getLoadImpedances(): Complex[] { 
        const result = this.engine.getLoadImpedances(); 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loadImpedances = result.map((x: any) => { return complex(x); });
        return loadImpedances;
    }

    private hasGround(): boolean { return this.engine.hasGround; }

    clearGroundMedia(): [boolean, string] {
        const error = this.engine.setGroundMedia(this.module.MediaBoundary.linear, 0, 0, []);
        return error ? [false, error.message] : [true, "OK"];
    }

    setGroundMedia(eps: number, conductivity: number): [boolean, string] {
        const error = this.engine.setGroundMedia(this.module.MediaBoundary.linear, 0, 0, [{eps: eps, conductivity: conductivity, height: 0, coord: 0}]);
        return error ? [false, error.message] : [true, "OK"];
    }

    setGeometry(withGround: boolean, geometry: number[][]): [boolean, string] {
        this.engine.initialize(withGround);
        // convert diameter to radius
        for (const line of geometry) {
            line[6] /= 2.0;
        }
        const error = this.engine.setGeometry(geometry);
        return error ? [false, error.message] : [true, "OK"];
    }

    /** Define sources, format "wire, segment, amplitude, phase". Use 1-based wire no */
    setSources(sources: number[][]): [boolean, string] {
        const sourceDefinitions: number[][] = [];
        const noWires = this.getNoWires();
        for (let i=0; i < sources.length; i++) {
            const source = sources[i];
            if (source.length != 4)
                return [false, "Source " + (i+1) + " must have 4 fields!"];

            const wire = source[0];
            if (!Number.isInteger(wire))
                return [false, "Source " + (i+1) + ": wire no must be an integer!"];
            if (wire < 1 || wire > noWires)
                return [false, "Source " + (i+1) + ": wire must be in range 1.." + noWires];

            const segment = source[1];
            if (!Number.isInteger(segment))
                return [false, "Source " + (i+1) + ": segment must be an integer!"];
            const pulses = this.getPulses(wire-1);
            if (segment < 0 || segment >= pulses.length)
                return [false, "Source " + (i+1) + ": segment must be in range 0.." + (pulses.length-1)];
            const pulse = pulses[segment];
            if (pulse < 0)
                return [false, "Source " + (i+1) + ": can't place the source in an unconnected end point"];

            sourceDefinitions.push([pulse, source[2], source[3]]);
        }

        const error = this.engine.setSources(sourceDefinitions);
        return error ? [false, error.message] : [true, "OK"];
    }

    /** Define loads, format "wire, segment, ...". Use 1-based wire no */
    setLoads(loads: number[][]): [boolean, string] {
        const loadDefinitions: number[][] = [];
        const noWires = this.getNoWires();
        for (let i=0; i < loads.length; i++) {
            const load = loads[i];
            if (load.length < 4)
                return [false, "Load " + (i+1) + " must have at least 4 fields!"];

            const wire = load[0];
            if (!Number.isInteger(wire))
                return [false, "Load " + (i+1) + ": wire no must be an integer!"];
            if (wire < 1 || wire > noWires)
                return [false, "Load " + (i+1) + ": wire must be in range 1.." + noWires];

            const segment = load[1];
            if (!Number.isInteger(segment))
                return [false, "Load " + (i+1) + ": segment must be an integer!"];
            const pulses = this.getPulses(wire-1);
            if (segment < 0 || segment >= pulses.length)
                return [false, "Load " + (i+1) + ": segment must be in range 0.." + (pulses.length-1)];
            const pulse = pulses[segment];
            if (pulse < 0)
                return [false, "Load " + (i+1) + ": can't place the source in an unconnected end point"];

            if (load.length > 4) {
                // S-domain load
                const order_numerator = load[2];
                if (!Number.isInteger(order_numerator))
                    return [false, "Load " + (i+1) + ": order of numerator must be an integer"];
                const order_denominator = load[3];
                if (!Number.isInteger(order_denominator))
                    return [false, "Load " + (i+1) + ": order of denominator must be an integer"];
                const expected_length = 4 + (1 + order_numerator) + (1 + order_denominator);
                if (load.length != expected_length)
                    return [false, "Load " + (i+1) + ": expecting " + expected_length + " fields"];
            }
            loadDefinitions.push([pulse, ...load.slice(2)]);
        }

        const error = this.engine.setLoads(loadDefinitions);
        return error ? [false, error.message] : [true, "OK"];
    }

    solve(): [boolean, string] {
        const result = this.engine.solve();
        if (result instanceof Error)
            return [false, result.message];

        this.solveInfo = result;
        return [true, ""];
    }

    getSourceCurrents(): [boolean, string | Source[]] {
        const result = this.engine.getSourceCurrents();
        if (result instanceof Error)
            return [false, result.message];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sources = result.map((x: any) => { 
          return {"voltage": complex(x.voltage), "current": complex(x.current), "impedance": complex(x.impedance), "power": x.power};
        });
        return [true, sources];
    }

    getPulseCurrents(wire: number): [boolean, string | PulseCurrent[]] {
        const result = this.engine.getPulseCurrents(wire);
        if (result instanceof Error)
            return [false, result.message];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pulseCurrents = result.map((x: any) => { 
          return {"pulse": x.pulse, "current": complex(x.current)};
        });
        return [true, pulseCurrents];
    }

    getFarFieldDbi(zenith: StepSequence, azimuth: StepSequence): [boolean, string | FarFieldDbi[]] {
        const result = this.engine.getFarFieldDbi(zenith, azimuth);
        if (result instanceof Error)
            return [false, result.message];
        return [true, result];
    }
}

const mininec = (function () {
    const state = new State();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new MininNECModule().then((myModule: { Engine: new () => any; }) => {
        state.module = myModule;
        state.engine = new myModule.Engine();
        //console.log("MiniNEC is initialized, elapsed ", Date.now() - state.startLoad, " ms.");
        state.observersInitialized.forEach(observer => { observer(); });
    });
    return state;
})();

export type { FarFieldDbi, PulseCurrent, Source };
export default mininec;