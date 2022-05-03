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
          <input id="eps" type="text" inputmode="decimal" v-model="epsilonRText">
        </div>
        <div class="flex-small">
          <label for="conductivty">Conductivity (S/m):</label>
          <input id="conductivity" type="text" inputmode="decimal" v-model="conductivityText">
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
        <input id="azimuth" type="text" inputmode="numeric" :value="azimuthText" @input="onInputAzimuth($event)">
      </div>
      <div v-if="!isElevationPlot">
        <label for="elevation_slider">Elevation (&deg;):</label>
        <input type="range" :min="elevationMin" max="90" class="slider" id="elevation_slider" v-model="elevationText">
        <input id="elevation" type="text" inputmode="numeric" :value="elevationText" @input="onInputElevation($event)">
      </div>

      <label for="table_checkbox"><input type="checkbox" id="table_checkbox" v-model="showTable"/> Show table</label>
    </form>

    <div v-if="allInputsOk && errorMessage == ''">
      <PolarPlot v-bind:isElevation="isElevationPlot" 
        v-bind:angles_values="angles_values" v-bind:maxValue="maxFieldDbi" v-bind:azimuth="Number(azimuthText)"
        radiiSuffix=" dBi"
        :width="800" :height="400"/>

      <pre>
        Horizontal: {{ formatDbi(horizontalRange[0]) }}...{{ formatDbi(horizontalRange[1]) }} dBi
        Vertical:   {{ formatDbi(verticalRange[0])   }}...{{ formatDbi(verticalRange[1])   }} dBi
        Total:      {{ formatDbi(totalRange[0])      }}...{{ formatDbi(totalRange[1])      }} dBi
        Max gain at {{ isElevationPlot ? "elevation" : "azimuth" }} {{ maxAngle.toFixed(0) }}&deg;
      </pre>

      <table v-if="showTable" class="striped-table">
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
import { isNumeric, filterNumeric, wrapAngle } from '@/helpers/NumericHelpers';
import _throttle from 'lodash/throttle';

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

function formatDbi(x: number): string {
    return ("        " + x.toFixed(3).toString()).slice(-8);
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
watch(() => epsilonRText.value, () => { antenna.epsilonR = Number(epsilonRText.value); });

/* ======================================================== */
const conductivityText = ref('');
const conductivityOK = computed(() => { return !antenna.hasGround || antenna.hasIdealGround || (isNumeric(conductivityText.value) && antenna.conductivity > 0); });
watch(() => conductivityText.value, () => { antenna.conductivity = Number(conductivityText.value); });

/* ======================================================== */
const showTable = ref(false);

/* ======================================================== */
const errorMessage = ref('');

/** true if all inputs are valid */
const allInputsOk = computed(() => { return epsilonROK.value && conductivityOK.value && azimuthOk.value && elevationOk.value && stepAngleOk.value; });

/* ======================================================== */
const farFieldDbi = reactive<FarFieldDbiElevation[]>([]);
const maxFieldDbi = ref(-999);

const angles_values = ref<[number[], number[], number[], number[]]>([[],[],[],[]]);

const horizontalRange = ref<number[]>([]);
const verticalRange = ref<number[]>([]);
const totalRange = ref<number[]>([]);
const maxAngle = ref(NaN);

/** When playing with parameters: update plot at most every 100 ms, but certainly at end, when parameters no longer change */
const throttledUpdateFarFieldValues = _throttle(updateFarFieldValues, 100, {leading: false, trailing: true});

/** update FarFieldDbi and the derived variables at once */
function updateFarFieldValues() {
  const rawFarFieldDbi = getFarFieldDbi();

  // Updating the derived values here and creating one composed angles_values avoids triggering 2 updates of PolarPlot
  // When calculating angles/horizontal/vertical/total here, but passing [angles, ...] to PolarPlot, there were each time 2 updates.
  const horizontalValues = rawFarFieldDbi.map(x => x.horizontal);
  const verticalValues = rawFarFieldDbi.map(x => x.vertical);
  const totalValues = rawFarFieldDbi.map(x => x.total);
  const angles = isElevationPlot.value ? rawFarFieldDbi.map(x => x.elevation) : rawFarFieldDbi.map(x => x.azimuth);
  angles_values.value = [angles, horizontalValues, verticalValues, totalValues];

  const maxValue = Math.max(...totalValues);
  if (maxValue > maxFieldDbi.value)
    maxFieldDbi.value = maxValue;

  horizontalRange.value = getRange(horizontalValues);
  verticalRange.value = getRange(verticalValues);
  totalRange.value = getRange(totalValues);
  maxAngle.value = angles[totalValues.indexOf(totalRange.value[1])] ?? NaN;

  // only store the data in a reactive<> at the very end, to keep calculations as fast as possible
  // replace contents farfieldDbi: first clear data, followed by push(... new_data), or splice(0, x.length, ...new_data)
  farFieldDbi.splice(0, farFieldDbi.length, ... rawFarFieldDbi);
}

function getFarFieldDbi(): FarFieldDbiElevation[] {
  // performance measurement on large antenna (> 450 pulses) with step angle 0.1°: approx 200 ms for _mininec, < 40 ms for sorting/filtering
  // trigger reactive update array
  errorMessage.value = '';

  if (!allInputsOk.value) {
    return [];
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
      return [];
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
    return [];
  }

  const sortedConvertedResult = (result as FarFieldDbi[])
    .map(x => { return {
      elevation: wrapAngle(90 - x.zenith),
      azimuth: wrapAngle(x.azimuth),
      horizontal: x.horizontal,
      vertical: x.vertical,
      total: x.total
    } as FarFieldDbiElevation})
    .sort((a, b) => { 
      const diffElevation = a.elevation - b.elevation;
      if (diffElevation == 0)
        return a.azimuth - b.azimuth;
      return diffElevation;
    });
  return sortedConvertedResult;
}

/** Return min and max value in an array */
function getRange(values: number[]) {
    let maxValue = Math.max(...values);
    let minValue = Math.min(...values);
    return [minValue, maxValue];
}

function onSolutionChanged() {
    maxFieldDbi.value = -999;
    updateFarFieldValues();
}

watch([() => antenna.conductivity, () => antenna.epsilonR, () => antenna.hasIdealGround], 
    () => onSolutionChanged()
);

watch([plotType, stepAngleText, elevation, azimuth], 
    () => throttledUpdateFarFieldValues()
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