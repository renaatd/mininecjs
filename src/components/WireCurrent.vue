<template>
  <div id="current">
    <select v-model="activeWire">
      <option v-for="wireSelect in wireSelections" v-bind:value="wireSelect.index" v-bind:key="wireSelect.index">
        {{ wireSelect.text }}
      </option>
    </select>

    <div v-if="activeWire < noWires">
      <canvas ref="chartRef" width="700" height="450"></canvas>
      <p>Dots correspond with pulses. Pulses are placed between segments.</p>
      <table class="striped-table">
        <thead>
          <tr>
            <th class="text-right">Pulse</th>
            <th class="text-center" colspan="2">Current [A]</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in pulseCurrents[activeWire]" :key="index">
            <td class="text-right">{{ formatPulse(item.pulse) }}</td>
            <td class="text-right">{{ formatComplex(item.current) }}</td>
            <td class="text-right"><span v-html="formatPolarRaw(item.current)"></span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue';
import type { Complex } from 'mathjs';
import { Chart, Legend, LinearScale, LineElement, PointElement, ScatterController, Title } from 'chart.js';
import type { ChartConfiguration } from 'chart.js';

import _mininec from '@/models/Mininec';
import type { PulseCurrent } from '@/models/Mininec';

const noWires = ref(0);
const pulseCurrents = ref<PulseCurrent[][]>([]);
const activeWire = ref(0);

/** chart.js Chart object, defined at first update */
let chart: Chart | null = null;
/** reference to the DOM element chart */
const chartRef = ref(null);

/** array of index/description for the wire selection dropdown */
const wireSelections = computed<{index: number, text: string}[]>(() => {
    return Array(noWires.value).fill(1).map((_,i) => { return {"index": i, "text": 'Wire ' + (i+1).toString()}; });
});

function formatComplex(x: Complex): string {
    let imSign = (x.im >= 0.0) ? '+' : '';
    return x.re.toFixed(3).toString() + imSign + x.im.toFixed(3).toString() + "i";
}

function formatPolarRaw(x: Complex): string {
    let polar = x.toPolar();
    return "r=" + polar.r.toFixed(3).toString() + ", &#952;=" + (polar.phi * 180 / Math.PI).toFixed(1).toString() + "&deg;";
}

function formatPulse(pulse: number): number|string 
{
    if (pulse == -1) {
        return "open";
    }
    if (pulse == -2) {
        return "junction";
    }
    return pulse;
}

/** update noWires and pulseCurrents on creation */
function onSolutionChanged(): void {
    noWires.value = _mininec.getNoWires();
    if (activeWire.value >= noWires.value) {
        activeWire.value = 0;
    }

    // trigger reactive update array
    pulseCurrents.value = [];
    for (let i=0; i < noWires.value; i++) {
        let [statusOk, pulseCurrentsLocal] = _mininec.getPulseCurrents(i);
        (pulseCurrents.value)[i] = statusOk ? (pulseCurrentsLocal as PulseCurrent[]) : [];

        if (!statusOk) {
            console.log("Wire ", i, ": can't get current, error message: ", (pulseCurrentsLocal as string));
        }
    }
}

function createChartIfNeeded(): void {
  if (chart)
    return;

  if (!chartRef.value) {
    console.log("Error: can't create chart, no reference");
    return;
  }
  
  let ctx = (chartRef.value as HTMLCanvasElement).getContext('2d');
  if (ctx == null) {
    console.log("Error: can't create chart, no canvas");
    return;
  }

  const data = {
    datasets: [
      {
        label: 'real',
        data: [],
        backgroundColor: 'rgb(31, 119, 180)',
        borderColor: 'rgb(31, 119, 180)',
        stepped: 'middle'
      },
      {
        label: 'imag',
        data: [],
        backgroundColor: 'rgb(255, 127, 14)',
        borderColor: 'rgb(255, 127, 14)',
        stepped: 'middle'
      },
      {
        label: 'total',
        data: [],
        backgroundColor: 'rgb(44, 160, 44)',
        borderColor: 'rgb(44, 160, 44)',
        stepped: 'middle'
      },
    ],
  };

  const config = {
    type: 'line',
    data: data,
    options: {
      animation: false,
      plugins: {
        legend: {
          position: "top"
        },
        title: {
          display: true,
          text: 'Current in wire',
        },
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: 0,
          max: 1,
          title: {
            display: true,
            text: 'relative position along wire'
          }
        },
        y: {
          title: {
            display: true,
            text: 'current (A)'
          }
        }
      }
    }
  };

  chart = new Chart(ctx, config as ChartConfiguration);
}

/** update chart object */
function updateChart(): void {
    createChartIfNeeded();
    if (!chart) {
        return;
    }

    let currents = pulseCurrents.value[activeWire.value];
    let noPoints = currents.length;
    let current_real_xy = currents.map((x, index) => { return {x: index / (noPoints-1), y: x.current.re}; });
    let current_imag_xy = currents.map((x, index) => { return {x: index / (noPoints-1), y: x.current.im}; });
    let current_total_xy = currents.map((x, index) => { return {x: index / (noPoints-1), y: x.current.toPolar().r}; });

    chart.data.datasets[0].data = current_real_xy;
    chart.data.datasets[1].data = current_imag_xy;
    chart.data.datasets[2].data = current_total_xy;

    if (chart.options.plugins && chart.options.plugins.title) {
        chart.options.plugins.title.text = "Current in wire " + (activeWire.value+1).toString();
    }

    chart.update();
}

onMounted(() => {
    Chart.register(ScatterController, LinearScale, PointElement, LineElement, Legend, Title);
    onSolutionChanged();
    // can't call createChartIfNeeded here, can't find reference. Also not possible in beforeUpdate()
});

onUpdated(() => {
    // Update chart when the DOM is ready, don't try earlier.
    updateChart();
});
</script>

<style>
</style>