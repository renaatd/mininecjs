import { Antenna } from '@/models/Antenna';

export type Example = {
    name: string;
    antenna: Antenna;
};

export const examples: Example[] = [
    {name: "half-wave dipole in free space", antenna: new Antenna({
        hasGround: false,
        userNotes: 'Half wave dipole in free space. For reference: theoretical impedance of an ideal half-wave dipole antenna is 73 Ohm + j * 42.5 Ohm.',
        frequency: 299.8,
        wires: "-0.25,0,0, 0.25,0,0, 0.00001, 20",
        sources: "1,10,5.0,0",
    })}, 
    {name: "T-antenna", antenna: new Antenna({
        "hasGround": true,
        "hasIdealGround": true,
        "userNotes": "T-antenna, example from \"Technical document 516 - mininec: a mini-numerical electromagnetics code\", Alfredo J Julian, James C Logan and John W Rockway, 6 Sep 1982\nImpedance and far field values of this implementation match with the original MiniNEC implementation.",
        "frequency": 299.8,
        "wires": "0,0,0, 0,0,0.07958,0.008,8\n0,-0.170423,0.07958,0,0,0.07958,0.008,17\n0,0.170423,0.07958,0,0,0.07958,0.008,17\n",
        "sources": "1,0,1,0",
        "loads": "",
        "epsilonR": 13,
        "conductivity": 0.005,
        }
    )},
    {name: "Yagi, 15 el, 2 meter", antenna: new Antenna({
        "hasGround": false,
        "hasIdealGround": true,
        "userNotes": "Adapted from \"215DX-480.nec\", an example for mNEC500\nhttp://www.w8io.com/mininec.htm\n\n15-element Yagi, 2 meters\n16.35 dBi gain at 144.2\n21 dB F/R at 144.2\nBoom length = 27.5 feet (8.379m)\ndimensions in meters\nWB0DGF  1-28-06\n",
        "frequency": 144,
        "wires": "0, -0.501, 0, 0, 0.501, 0, 0.0048, 32\n0.416, -0.477, 0, 0.416, 0.477, 0, 0.01, 32\n0.603, -0.472, 0, 0.603, 0.472, 0, 0.0048, 32\n0.959, -0.468, 0, 0.959, 0.468, 0, 0.0048, 32\n1.413, -0.463, 0, 1.413, 0.463, 0, 0.0048, 32\n1.94, -0.459, 0, 1.94, 0.459, 0, 0.0048, 32\n2.524, -0.456, 0, 2.524, 0.456, 0, 0.0048, 32\n3.146, -0.452, 0, 3.146, 0.452, 0, 0.0048, 32\n3.813, -0.451, 0, 3.813, 0.451, 0, 0.0048, 32\n4.512, -0.448, 0, 4.512, 0.448, 0, 0.0048, 32\n5.239, -0.445, 0, 5.239, 0.445, 0, 0.0048, 32\n5.988, -0.443, 0, 5.988, 0.443, 0, 0.0048, 32\n6.763, -0.441, 0, 6.763, 0.441, 0, 0.0048, 32\n7.56, -0.439, 0, 7.56, 0.439, 0, 0.0048, 32\n8.379, -0.437, 0, 8.379, 0.437, 0, 0.0048, 32\n",
        "sources": "2,16,1,0",
        "loads": "",
        "epsilonR": 13,
        "conductivity": 0.005,
    })},
    {name: "Yagi, 18 el, 222 MHz", antenna: new Antenna({
        "hasGround": false,
        "hasIdealGround": true,
        "userNotes": "Adapted from \"W8IO-222-18-500.nec\", an example for mNEC500\nhttp://www.w8io.com/mininec.htm\n\nW8IO 18-element Yagi, 222 MHz\n18.14 dBi directivity at 222.1\n18.01 dBi power gain at 222.1\n30.9 dB F/R at 222.1, E-plane SLL= -20.1 dB\n28.7 dB F/R at 222.1, H-plane SLL= -18.4 dB\nBoomlength = 8.43m (27.6 ft) 6.24 wavelength\nDL6WU Gain = 17.61 dBi\nElement diameter = 0.188\" DE diameter = 0.375\"\ndimensions in meters\nW8IO  12-16-14",
        "frequency": 222,
        "wires": "0,-0.3255,0,0,0.3255,0,0.00476,28\n0.295,-0.322,0,0.295,0.322,0,0.00952,28\n0.403,-0.31,0,0.403,0.31,0,0.00476,28\n0.603,-0.3032,0,0.603,0.3032,0,0.00476,28\n0.959,-0.3,0,0.959,0.3,0,0.00476,28\n1.398,-0.296,0,1.398,0.296,0,0.00476,28\n1.897,-0.291,0,1.897,0.291,0,0.00476,28\n2.453,-0.287,0,2.453,0.287,0,0.00476,28\n3.036,-0.283,0,3.036,0.283,0,0.00476,28\n3.642,-0.279,0,3.642,0.279,0,0.00476,28\n4.263,-0.277,0,4.263,0.277,0,0.00476,28\n4.882,-0.274,0,4.882,0.274,0,0.00476,28\n5.508,-0.272,0,5.508,0.272,0,0.00476,28\n6.145,-0.269,0,6.145,0.269,0,0.00476,28\n6.772,-0.27,0,6.772,0.27,0,0.00476,26\n7.382,-0.271,0,7.382,0.271,0,0.00476,26\n7.9829,-0.2822,0,7.9829,0.2822,0,0.00476,26\n8.43,-0.2777,0,8.43,0.2777,0,0.00476,26\n",
        "sources": "2,14,1,0",
        "loads": "",
        "epsilonR": 13,
        "conductivity": 0.005,
    })},
    {name: "loads", antenna: new Antenna({
    "hasGround": false,
    "hasIdealGround": true,
    "userNotes": "Load impedance example: fixed load, 1 µH inductor, and 1 nF capacitor ",
    "frequency": 1,
    "wires": "0,0,0,  0.01,0,0,  0.001,  1\n0.01,0,0,  0,0.01,0,  0.001,  1\n0,0.01,0, 0,0,0,  0.001,  1",
    "sources": "2, 0, 100, 0",
    "loads": "2, 0, 10, 20\n3, 0, 1, 0, 0, 1e-6, 1\n3, 1, 0, 1, 1, 0, 1e-9",
    "epsilonR": 13,
    "conductivity": 0.005
    })}
];