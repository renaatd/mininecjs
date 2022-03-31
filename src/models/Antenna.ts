export class Antenna {
    public static readonly ATTRIBUTES = ["hasGround", "hasIdealGround", "userNotes", "frequency", "wires", "sources", "loads", "epsilonR", "conductivity"];

    public constructor(init?: Partial<Antenna>) {
        // constructor with partial definition used for examples in LoadAndSave.vue
        // https://stackoverflow.com/a/37682352
        Object.assign(this, init);
    }

    // Copy all properties from another antenna, without completely replacing them - replacing properties _mininec.antenna kills Vue reactivity
    public copyFrom(source: Antenna): void {
        for (const key of Antenna.ATTRIBUTES) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this[key] = source[key];
        }
    }

    hasGround = false;
    hasIdealGround = true;
    userNotes = '';
    frequency = 299.8;
    wires = '';
    sources = '';
    loads = '';
    epsilonR = 13;
    conductivity = 0.005;
}

// The antenna description is global state. Define it here to have it available in all components.
export const antenna = new Antenna();