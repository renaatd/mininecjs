<template>
  <div id="geometry-input">
    <LoadAndSave v-on:updateGeometry="updateAntenna"/>
    <form @submit.prevent="handleSubmit">
      <label for="usernotes">User notes</label>
      <textarea id="usernotes" v-model="antenna.userNotes" placeholder="User notes for this design" rows="5"></textarea>

      <label for="freq">Frequency: <input id="freq" inputmode="decimal" :value="frequencyText" @input="onInputFrequency($event)" :class="{ 'is-success': frequencyOk}"> MHz</label>
      <p>Wavelength: {{ wavelength.toFixed(1) }} m</p>

      <label for="environment">Environment </label>
      <select id="environment" v-model="environment">
        <option value="free">Free space</option>
        <option value="ground">Ground plane at z=0</option>
      </select>
      <div v-if="isWithGround">Impedance and current calculations are always for ideal ground. Parameters for a non-ideal ground can be entered in the far field tab.</div>

      <label>Geometry - antenna wires</label>
      <p>Use one line per wire, format <code>x1, y1, z1, x2, y2, z2, d, n</code>. All dimensions are in meter.
      <ClickHelp>
        This is where you define the shape of the antenna. Every line defines one wire of the antenna. Wires are split in segments.
        <code>x,y,z</code> are the coordinates of wire begin and wire end, <code>d</code> is the wire diameter, and <code>n</code> is the number of segments.
        The antenna can have up to 500 segments. Between 2 segments is a pulse. MiniNEC calculates the current in each pulse, and assumes this current is the same
        in half the segment at each side. To place a source in the middle of a wire, use an even number of segments <code>n</code> with the source at segment <code>n/2</code>.
        For good convergence it is recommended to keep segment length below 1/10 * wavelength, 
        and to keep the segment length ratio below 2 when multiple wires are connected together. The table wire details below the calculate button can help to spot errors.
      </ClickHelp>
      </p>
      <textarea v-model="antenna.wires" placeholder="0,-5,3,0,5,3,0.01,10" :class="{ 'is-success': wiresOk}" rows="5"></textarea>
      <p>Geometry check: {{ wiresStatus }}</p>

      <label>Sources</label>
      <p>Use one line per source, format <code>wire, segment, amplitude, phase</code>. Wire numbering begins at 1. 
      <ClickHelp>The source is placed after the segment. Segment 0 is at the beginning of
      a wire. Sources can only be placed at a wire end if the wire is connected to an earlier 
      wire - 'connected' in the table wire details.  Amplitude is in Volt-peak [Vpk], phase in degrees [&deg;].</ClickHelp></p>
      <textarea v-model="antenna.sources" placeholder="3,0,20,90" :class="{ 'is-success': sourcesOk}" rows="3"></textarea>
      <p>Source check: {{ sourcesStatus }}</p>

      <label>Loads (optional)</label>
      <p>Use one line per load. There are two types of loads, simple and S-domain.
        <ClickHelp>For simple loads: specify per load resistance and reactance in the format <code>wire, segment, resistance, reactance</code>. 
        For S-domain loads: <code>wire, segment, n_num, n_den, num0, num1, ..., den0, den1, ...</code>. <code>n_num</code> is the order 
        of the numerator (min 0). <code>n_den</code> is the order of the denominator.  For wire and segment, the same rules as for sources apply.</ClickHelp></p>
      <textarea v-model="antenna.loads" placeholder="3,0,20,90" :class="{ 'is-success': loadsOk}" rows="3"></textarea>
      <p>Load check: {{ loadsStatus }}</p>

      <p v-if="calculatedStatus"><mark>Calculation error: {{ calculatedStatus }}</mark></p>
      <input type="submit" value="Calculate" :disabled="!allInputsOk" :class="{'muted-button': !allInputsOk}">
    </form>

    <div v-if="wiresOk">
      <h2>Wire details</h2>
      <table>
        <thead>
          <tr>
            <th>Wire no</th>
            <th>Segment lenght [m]</th>
            <th>Pulse begin</th>
            <th>Pulse end</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(detail, index) in wireDetails" :key="index">
            <td>{{index+1}}</td>
            <td>{{ detail.segmentLength.toFixed(3) }}</td>
            <td>{{ detail.pulseBegin }}</td>
            <td>{{ detail.pulseEnd }}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, reactive, ref, watch } from 'vue';
import { checkCsvNumbers, splitCsv } from '@/helpers/CsvHelpers';
import { isNumeric, filterPositiveNumeric } from '@/helpers/NumericHelpers';
import _debounce from 'lodash/debounce';

import { Antenna, antenna as antennaOriginal } from '@/models/Antenna';
import _mininec from '@/models/Mininec';

import ClickHelp from './ClickHelp.vue';
import LoadAndSave from './LoadAndSave.vue';

type WireDetail = {
  segmentLength: number,
  pulseBegin: string,
  pulseEnd: string
}

const emit = defineEmits(['setActive']);

// beware - antennaOriginal must not be changed directly by e.g. LoadAndSave.
// might consider using ref(), but this changes syntax in many places
const antenna = reactive(antennaOriginal);

/* ======================================================== */
const frequencyText = ref('');
const wavelength = ref(0.0);
const frequencyOk = computed(() => { return !isNaN(antenna.frequency) && antenna.frequency > 0.0; });

/** Update mininec and antenna model based on frequencyText */
function setMininecAntennaFrequency():void {
  if (isNumeric(frequencyText.value) && Number(frequencyText.value) > 0) {
    _mininec.setFrequency(Number(frequencyText.value));
    antenna.frequency = _mininec.getFrequency();
    wavelength.value = _mininec.getWavelength();
  } else {
    antenna.frequency = NaN;
    wavelength.value = NaN;
  }
}

function onInputFrequency(event: Event) {
  const target = event.target as HTMLInputElement;
  // filter non-numerical characters
  target.value = filterPositiveNumeric(target.value);
  // and assign it to frequencyText for updating wavelength
  frequencyText.value = target.value
}

watch(frequencyText, () => {
  updateCalculatedFlag(false);
  setMininecAntennaFrequency();
});

/* ======================================================== */
const environment = ref('');
const isWithGround = computed(() => { return environment.value == 'ground'; });

watch(environment, () => {
  updateCalculatedFlag(false);
  checkAll();
  antenna.hasGround = isWithGround.value;
});

/* ======================================================== */
// antenna.wires contains the wires as text
/** wire geometry split per row/field, as strings */
const wiresParsed = computed<string[][]>(() =>  splitCsv(antenna.wires));
/** array with per wire segmentlength, and index of first/last pulse */
const wireDetails = ref<WireDetail[]>([]);
const wiresStatus = ref('');
const wiresOk = ref(false);
const debouncedCheckAll = _debounce(checkAll, 500);

/** Update mininec model and all status messages */
function checkAll(): void {
  setMininecGeometry();
  setMininecSources();
  setMininecLoads();
  setMininecAntennaFrequency();
}

/** Set mininec geometry according to antenna.wires / isWithGround, and check if everything is OK  */
function setMininecGeometry(): void {
  wireDetails.value = [];
  [wiresOk.value, wiresStatus.value] = checkCsvNumbers(wiresParsed.value, 8);
  if (wiresOk.value) {
    let wiresAsNumbers = wiresParsed.value.map(line => line.map(val => Number(val)));
    [wiresOk.value, wiresStatus.value] = _mininec.setGeometry(isWithGround.value, wiresAsNumbers);
    if (wiresOk.value) {
      let noWires = _mininec.getNoWires();
      let noPulses = _mininec.getNoPulses();
      wiresStatus.value = "OK, geometry has " + noWires.toString() + " wires and " + noPulses.toString() + " pulses.";

      wireDetails.value = Array(noWires).fill(0).map((_, index): WireDetail => {
        let pulses = _mininec.getPulses(index);
        if (pulses.length < 2)
          return { segmentLength: 0, pulseBegin: 'error', pulseEnd: 'error'};
        let lastElement = pulses.slice(-1)[0];
        return {
          segmentLength: _mininec.getSegmentLength(index),
          pulseBegin: (pulses[0] >= 0) ? 'connected' : 'open',
          pulseEnd: (lastElement >= 0) ? 'connected' : 'open'
        };
      })
    }
  }
}

watch(() => antenna.wires, () => {
  updateCalculatedFlag(false);
  wiresStatus.value = "(you're typing)";
  wiresOk.value = false;
  debouncedCheckAll();
});

/* ======================================================== */
const sourcesStatus = ref('');
const sourcesOk = ref(false);
const sourcesParsed = computed<string[][]>(() => { return splitCsv(antenna.sources); });
const debouncedCheckSources = _debounce(setMininecSources, 500);

function setMininecSources(): void {
  if (sourcesParsed.value.length < 1) {
    sourcesOk.value = false;
    sourcesStatus.value = "Error, there must be at least 1 source !";
    return;
  }

  [sourcesOk.value, sourcesStatus.value] = checkCsvNumbers(sourcesParsed.value, 4);
  if (wiresOk.value && sourcesOk.value) {
    let sourcesAsNumbers = sourcesParsed.value.map(line => line.map(val => Number(val)));
    [sourcesOk.value, sourcesStatus.value] = _mininec.setSources(sourcesAsNumbers);
  }
}

watch(() => antenna.sources, () => {
  updateCalculatedFlag(false);
  sourcesStatus.value = "(you're typing)";
  sourcesOk.value = false;
  debouncedCheckSources();
});

/* ======================================================== */
const loadsStatus = ref('');
const loadsOk = ref(false);
const loadsParsed = computed<string[][]>(() => { return splitCsv(antenna.loads); });
const debouncedCheckLoads = _debounce(setMininecLoads, 500);

function setMininecLoads(): void {
  [loadsOk.value, loadsStatus.value] = checkCsvNumbers(loadsParsed.value);
  if (wiresOk.value && loadsOk.value) {
    let loadsAsNumbers = loadsParsed.value.map(line => line.map(val => Number(val)));
    [loadsOk.value, loadsStatus.value] = _mininec.setLoads(loadsAsNumbers);
  }
}

watch(() => antenna.loads, () => {
  updateCalculatedFlag(false);
  loadsStatus.value = "(you're typing)";
  loadsOk.value = false;
  debouncedCheckLoads();
});

/* ======================================================== */
/** true if mininec impedance calculations are done */
const calculated = ref(false);
const calculatedStatus = ref('');

const  allInputsOk = computed(() => { return frequencyOk.value && wiresOk.value && sourcesOk.value && loadsOk.value; });

function handleSubmit(): void {
  if (!allInputsOk.value) 
    return;

  let [success, message] = _mininec.solve();
  updateCalculatedFlag(success, message);
}

/* ======================================================== */
function updateAntenna(newValue: Antenna): void {
  antenna.copyFrom(newValue);
  setGuiStringsFromAntenna();
  updateCalculatedFlag(false);
}

function setGuiStringsFromAntenna(): void {
  frequencyText.value = antenna.frequency.toString();
  // note: setting environment.value triggers watcher, calls checkAll, does set antenna.frequency based on frequencyText -> first set frequency before setting environment
  environment.value = antenna.hasGround ? 'ground' : 'free';
}

/** Update calculated flag and status message, emit to parent */
function updateCalculatedFlag(newValue: boolean, newMessage = ''): void {
  calculatedStatus.value = newMessage;
  calculated.value = newValue;
  emit('setActive', newValue);
}

onBeforeMount(() => {
  // Note: MiniNEC engine must already be initialized. If not, this.checkAll() might cause a null dereference
  setGuiStringsFromAntenna();
  checkAll();
});
</script>

<style scoped>
</style>