<template>
  <div id="farfield">
    <form @submit.prevent="">
      <div v-if="antenna.hasGround">
        <label for="ground">Ground plane:</label>
        <select id="ground" v-model="groundType">
          <option value="ideal" selected>ideal ground</option>
          <option value="non-ideal">non-ideal ground</option>
        </select>
      </div>

      <div class="flex-row" v-if="antenna.hasGround && !antenna.hasIdealGround">
        <div class="flex-small">
          <label for="eps">Relative dielectric constant (&epsilon;<sub>r</sub>):</label>
          <input id="eps" inputmode="decimal" :value="epsilonRText" @input="event => onInputPositiveNumeric(event, ref(epsilonRText))">
        </div>
        <div class="flex-small">
          <label for="conductivty">Conductivity (S/m):</label>
          <input id="conductivity" inputmode="decimal" :value="conductivityText" @input="event => onInputPositiveNumeric(event, ref(conductivityText))">
        </div>
      </div>

      <div class="flex-row">
        <div class="flex-large">
          <label for="plotType">Plot type:</label>
          <select id="plotType" v-model="plotType">
            <option value="elevation" selected>elevation - specify azimuth &#632;</option>
            <option value="azimuth">azimuth - specify elevation</option>
          </select>
        </div>
        <div class="flex-large">
          <label for="step">Step (&deg;):</label>
          <input id="step" type="number" min="1" max="5" v-model="stepAngleText">
        </div>
      </div>

      <div v-if="isElevationPlot">
        <label for="azimuth_slider">Azimuth (&deg;):</label>
        <input type="range" min="-180" max="180" class="slider" id="azimuth_slider" v-model="azimuthText">
        <input id="azimuth" type="text" :value="azimuthText" @input="onInputAzimuth($event)">
      </div>
      <div v-if="!isElevationPlot">
        <label for="elevation_slider">Elevation (&deg;):</label>
        <input type="range" :min="elevationMin" max="90" class="slider" id="elevation_slider" v-model="elevationText">
        <input id="elevation" type="text" :value="elevationText" @input="onInputElevation($event)">
      </div>
    </form>

    <div v-if="allInputsOk && errorMessage == ''">
      <PolarPlot v-bind:isElevation="isElevationPlot" 
        v-bind:angles="angles" v-bind:values="[horizontalValues, verticalValues, totalValues]" v-bind:maxValue="maxFieldDbi" v-bind:azimuth="Number(azimuthText)"
        radiiSuffix=" dBi"
        :width="800" :height="400"/>

      <pre>
        Horizontal: {{ formatDbi(horizontalRange[0]) }}...{{ formatDbi(horizontalRange[1]) }} dBi
        Vertical:   {{ formatDbi(verticalRange[0])   }}...{{ formatDbi(verticalRange[1])   }} dBi
        Total:      {{ formatDbi(totalRange[0])      }}...{{ formatDbi(totalRange[1])      }} dBi
        Max gain at {{ isElevationPlot ? "elevation" : "azimuth" }} {{ maxAngle.toFixed(0) }}&deg;
      </pre>

      <table class="striped-table">
        <thead>
            <tr>
              <th class="text-right">elevation (&deg;)</th>
              <th class="text-right">azimuth (&deg;)</th>
              <th class="text-right">horizontal (dBi)</th>
              <th class="text-right">vertical (dBi)</th>
              <th class="text-right">total (dBi)</th>
            </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in farFieldDbi" :key="index">
            <td class="text-right">{{ item.elevation }}</td>
            <td class="text-right">{{ item.azimuth }}</td>
            <td class="text-right">{{ formatDbi(item.horizontal) }}</td>
            <td class="text-right">{{ formatDbi(item.vertical) }}</td>
            <td class="text-right">{{ formatDbi(item.total) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="!allInputsOk">
      Parameter error ! Elevation and azimuth angle must be valid numbers. Relative dielectric constant, conductivity and step angle must be positive numbers.
    </div>
    <div v-else>
      Unexpected error: {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, reactive, ref, watch } from 'vue';
import type { Ref } from 'vue';
import { isNumeric, filterNumeric, filterPositiveNumeric, wrapAngle } from '@/helpers/NumericHelpers';

import { antenna as antennaOriginal } from '@/models/Antenna';
import _mininec from '@/models/Mininec';
import type { FarFieldDbi, StepSequence } from '@/models/Mininec';

import PolarPlot from '@/components/PolarPlot.vue';

type FarFieldDbiElevation = {
    elevation: number,
    azimuth: number,
    horizontal: number,
    vertical: number,
    total: number
}

/** reactive antenna model */
const antenna = reactive(antennaOriginal);

/** filter input events on text field to accept only numeric values, limit values to a certain range */
function onInputNumericRange(event: Event, field: Ref<string | number>, minValue: number, maxValue: number) {
    const target = event.target as HTMLInputElement;
    let filtered = filterNumeric(target.value);
    // filtered can be a non-numerical value when entering, e.g. "-" or ".". Only do range checking when it is a numeric value
    if (isNumeric(filtered)) {
        const n = Number(filtered);
        if (n < minValue) {
            filtered = String(minValue);
        } else if (n > maxValue) {
            filtered = String(maxValue);
        }
    }
    if (filtered !== target.value) {
        target.value = filtered;
    }
    field.value = filtered;
}

/** filter input events on text field to accept only positive numbers */
function onInputPositiveNumeric(event: Event, field: Ref<string | number>) {
    const target = event.target as HTMLInputElement;
    target.value = filterPositiveNumeric(target.value);
    field.value = String(target.value);
}

function formatDbi(x: number): string {
    return ("00000000" + x.toFixed(3).toString()).slice(-8);
    // ES2017: x.toFixed(3).toString().padStart(8);
}

/* ======================================================== */
const plotType = ref('azimuth');
const isElevationPlot = computed(() => { return plotType.value == 'elevation'; });

/* ======================================================== */
const azimuthText = ref<string|number>('0');
const azimuth = computed(() => { return Number(azimuthText.value); });
const azimuthOk = computed(() => { return !isElevationPlot.value || isNumeric(azimuthText.value); });
function onInputAzimuth(event: Event) { onInputNumericRange(event, azimuthText, -180, 180); }

/* ======================================================== */
const elevationText = ref<string|number>('0');
const elevation = computed(() => { return Number(elevationText.value); });
const elevationOk = computed(() => { return isElevationPlot.value || isNumeric(elevationText.value); });
function onInputElevation(event: Event) { onInputNumericRange(event, elevationText, elevationMin.value, 90); }

/** Minimum value for elevation, depends on ground type */
const elevationMin = computed(() => { return antenna.hasGround ? 0 : -90; });

/* ======================================================== */
const stepAngleText = ref<string|number>('1');
const stepAngleOk = computed(() => { return isNumeric(stepAngleText.value); });

/* ======================================================== */
const groundType = ref('');
watch(groundType, () => { antenna.hasIdealGround = groundType.value == 'ideal'; });

/* ======================================================== */
const epsilonRText = ref('');
const epsilonROK = computed(() => { return !antenna.hasGround || antenna.hasIdealGround || (isNumeric(epsilonRText.value) && antenna.epsilonR > 0); });
watch(epsilonRText, () => { antenna.epsilonR = Number(epsilonRText.value); });

/* ======================================================== */
const conductivityText = ref('');
const conductivityOK = computed(() => { return !antenna.hasGround || antenna.hasIdealGround || (isNumeric(conductivityText.value) && antenna.conductivity > 0); });
watch(conductivityText, () => { antenna.conductivity = Number(conductivityText.value); });

const errorMessage = ref('');

/** true if all inputs are valid */
const allInputsOk = computed(() => { return epsilonROK.value && conductivityOK.value && azimuthOk.value && elevationOk.value && stepAngleOk.value; });

/* ======================================================== */
const farFieldDbi = reactive<FarFieldDbiElevation[]>([]);
const maxFieldDbi = ref(-999);

const horizontalValues = computed(() => { return farFieldDbi.map(x => x.horizontal); });
const verticalValues = computed(() => { return farFieldDbi.map(x => x.vertical); });
const totalValues = computed(() => { return farFieldDbi.map(x => x.total); });
const angles = computed(() => { return isElevationPlot.value ? farFieldDbi.map(x => x.elevation) : farFieldDbi.map(x => x.azimuth); });

const horizontalRange = computed(() => { return getRange(horizontalValues.value); });
const verticalRange = computed(() => { return getRange(verticalValues.value); });
const totalRange = computed(() => { return getRange(totalValues.value); });

const maxAngle = computed(() => { return angles.value[totalValues.value.indexOf(totalRange.value[1])] ?? NaN; });

function getFarFieldDbi(): void {
  // trigger reactive update array
  farFieldDbi.length = 0;
  errorMessage.value = '';

  if (!allInputsOk.value) {
    return;
  }

  if (antenna.hasGround) {
    let statusOk: boolean;
    let message: string;

    if (antenna.hasIdealGround)
      [statusOk, message] = _mininec.clearGroundMedia();
    else
      [statusOk, message] = _mininec.setGroundMedia(antenna.epsilonR, antenna.conductivity);
    if (!statusOk) {
      errorMessage.value = "SetGroundMedia error: " + message;
      return;
    }
  } 

  let stepAngle = Number(stepAngleText.value);
  if (stepAngle <= 0.1)
    stepAngle = 0.1;
  const noSteps = (isElevationPlot.value && antenna.hasGround) ? Math.ceil(180/stepAngle) : Math.ceil(360/stepAngle);

  let statusOk: boolean;
  let result: string | FarFieldDbi[];
  if (isElevationPlot.value) {
    const zenithStep: StepSequence = {init: 90, step: -stepAngle, count: noSteps};
    const azimuthStep: StepSequence = {init: azimuth.value, step: 0, count: 1};
    [statusOk, result] = _mininec.getFarFieldDbi(zenithStep, azimuthStep);
  } else {
    const zenithStep: StepSequence = {init: 90-elevation.value, step: 0, count: 1};
    const azimuthStep: StepSequence = {init: 0, step: stepAngle, count: noSteps};
    [statusOk, result] = _mininec.getFarFieldDbi(zenithStep, azimuthStep);
  }

  if (!statusOk) {
    errorMessage.value = result as string;
    return;
  }
  // ugly hack to replace contents farfieldDbi: first clear data, followed by push(... new_data). Could also do splice(0, x.length, ...new_data)
  farFieldDbi.push (... (result as FarFieldDbi[]).map(x => { return {
    elevation: wrapAngle(90 - x.zenith),
    azimuth: wrapAngle(x.azimuth),
    horizontal: x.horizontal,
    vertical: x.vertical,
    total: x.total
  } as FarFieldDbiElevation}).sort((a, b) => { 
    const diffElevation = a.elevation - b.elevation;
    if (diffElevation == 0)
      return a.azimuth - b.azimuth;
    return diffElevation;
  }) );

  let totalValues = farFieldDbi.map(x => x.total);
  const maxValue = Math.max(...totalValues);
  if (maxValue > maxFieldDbi.value)
    maxFieldDbi.value = maxValue;
}

/** Return min and max value in an array */
function getRange(values: number[]) {
    let maxValue = Math.max(...values);
    let minValue = Math.min(...values);
    return [minValue, maxValue];
}

function onSolutionChanged() {
    maxFieldDbi.value = -999;
    getFarFieldDbi();
}

watch([() => antenna.conductivity, () => antenna.epsilonR, () => antenna.hasIdealGround], 
    () => onSolutionChanged()
);

watch([plotType, stepAngleText, elevation, azimuth], 
    () => getFarFieldDbi()
);

onBeforeMount(() => {
  updateInputsFromAntenna();
  onSolutionChanged();
});

/** copy parameters from antenna model to UI */
function updateInputsFromAntenna(): void {
    groundType.value = antenna.hasIdealGround ? 'ideal' : 'non-ideal';
    epsilonRText.value = antenna.epsilonR.toString();
    conductivityText.value = antenna.conductivity.toString();
}
</script>

<style scoped>
.ordinal {
  font-variant-numeric: tabular-nums;
}
</style>