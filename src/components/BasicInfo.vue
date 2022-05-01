<template>
  <div id="impedance">
    <h2>Info</h2>
    <table class="striped-table">
      <thead> <tr> <th>Parameter</th> <th>Value</th> <th>Unit</th> </tr> </thead>
      <tbody>
        <tr> <td>MininecJS engine</td> <td>{{ mininec_version }}</td> <td> </td></tr>
        <tr> <td>MininecJS UI git hash</td> <td>{{ ui_git_hash }}</td> <td> </td></tr>
        <tr> <td>MininecJS UI build date</td> <td>{{ ui_build_date }}</td> <td> </td></tr>
        <tr> <td>Time to fill impedance matrix</td> <td>{{ elapsed_fill_matrix_ms.toFixed(0) }}</td> <td>ms</td></tr>
        <tr> <td>Time to solve equations</td> <td>{{ elapsed_solve_matrix_ms.toFixed(0) }}</td> <td>ms</td> </tr>
      </tbody>
    </table>

    <h2>Input parameters</h2>
    <table class="striped-table">
      <thead>
        <tr> <th>Parameter</th> <th>Value</th> <th>Unit</th> </tr>
      </thead>
      <tbody>
        <tr> <td>Frequency</td> <td>{{ frequency }}</td> <td>MHz</td> </tr>
        <tr> <td>Wavelength</td> <td>{{ wavelength.toFixed(1) }}</td> <td>m</td> </tr>
        <tr> <td>No of wires</td> <td>{{ noWires }}</td> <td>-</td> </tr>
        <tr> <td>No of pulses</td> <td>{{ noPulses }}</td> <td>-</td> </tr>
      </tbody>
    </table>

    <h2>Sources</h2>
    <table class="striped-table">
      <thead>
        <tr>
          <th>Source</th>
          <th colspan="2">Voltage [V]</th>
          <th colspan="2">Current [A]</th>
          <th colspan="2">Impedance [Ohm]</th>
          <th>Power [W]</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(source, index) in sources" :key="index">
          <td>{{index+1}}</td>
          <td>{{formatComplex(source.voltage)}}</td>
          <td><span v-html="formatPolarRaw(source.voltage)"></span></td>
          <td>{{formatComplex(source.current)}}</td>
          <td><span v-html="formatPolarRaw(source.current)"></span></td>
          <td>{{formatComplex(source.impedance)}}</td>
          <td><span v-html="formatPolarRaw(source.impedance)"></span></td>
          <td>{{source.power.toFixed(3)}}</td>
        </tr>
      </tbody>
    </table>

    <div v-if="loadImpedances.length > 0">
      <h2>Loads</h2>
      <table class="striped-table">
        <thead>
          <tr>
            <th>Load</th>
            <th colspan="2">Impedance [Ohm]</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(load, index) in loadImpedances" :key="index">
            <td>{{index+1}}</td>
            <td>{{formatComplex(load)}}</td>
            <td><span v-html="formatPolarRaw(load)"></span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Complex } from 'mathjs';

import _mininec from '@/models/Mininec';
import type { Source } from '@/models/Mininec';

const ui_build_date = import.meta.env.VITE_UI_BUILD_DATE;
const ui_git_hash = import.meta.env.VITE_UI_GIT_HASH;
const mininec_version = _mininec.VERSION;

const frequency = ref(0.0);
const wavelength = ref(0.0);
const noPulses = ref(0);
const noWires = ref(0);
const elapsed_fill_matrix_ms = ref(0);
const elapsed_solve_matrix_ms = ref(0);
const loadImpedances = ref<Complex[]>([]);
const sources = ref<Source[]>([]);

function formatComplex(x: Complex): string {
    let imSign = (x.im >= 0.0) ? '+' : '';
    return x.re.toFixed(3).toString() + imSign + x.im.toFixed(3).toString() + "i";
}

function formatPolarRaw(x: Complex): string {
    let polar = x.toPolar();
    return "r=" + polar.r.toFixed(3).toString() + ", &#952;=" + (polar.phi * 180 / Math.PI).toFixed(1).toString() + "&deg;";
}

function update(): void {
    wavelength.value = _mininec.getWavelength();
    frequency.value = _mininec.getFrequency();
    noPulses.value = _mininec.getNoPulses();
    noWires.value = _mininec.getNoWires();

    let [statusOk, sourcesLocal] = _mininec.getSourceCurrents();
    sources.value = statusOk ? (sourcesLocal as Source[]) : [];
    loadImpedances.value = _mininec.getLoadImpedances();

    elapsed_fill_matrix_ms.value = _mininec.solveInfo.elapsed_fill_matrix_us / 1000;
    elapsed_solve_matrix_ms.value = _mininec.solveInfo.elapsed_solve_matrix_us / 1000;
}

// on creation
update();
</script>

<style>
</style>