<template>
  <div id="current">
    <select v-model="activeWire">
      <option v-for="wireSelect in wireSelections" v-bind:value="wireSelect.index" v-bind:key="wireSelect.index">
        {{ wireSelect.text }}
      </option>
    </select>

    <div v-if="activeWire < noWires">
      <canvas ref="chart" width="700" height="450"></canvas>
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

<script lang="ts">
import _mininec from '@/models/Mininec';
import type { PulseCurrent } from '@/models/Mininec';
import { Component, Vue } from 'vue-property-decorator';
import { Complex } from 'mathjs';
import { Chart, ChartConfiguration, Legend, LinearScale, LineElement, PointElement, ScatterController, Title } from 'chart.js';

@Component
export default class WireCurrent extends Vue {
    public noWires = 0;
    public pulseCurrents: PulseCurrent[][] = [];
    public activeWire = 0;
    private chart: Chart | null = null;

    get wireSelections(): {index: number, text: string}[] {
      return Array(this.noWires).fill(1).map((_,i) => { return {"index": i, "text": 'Wire ' + (i+1).toString()}; });
    }

    public formatComplex(x: Complex): string {
      let imSign = (x.im >= 0.0) ? '+' : '';
      return x.re.toFixed(3).toString() + imSign + x.im.toFixed(3).toString() + "i";
    }

    public formatPolarRaw(x: Complex): string {
      let polar = x.toPolar();
      return "r=" + polar.r.toFixed(3).toString() + ", &#952;=" + (polar.phi * 180 / Math.PI).toFixed(1).toString() + "&deg;";
    }

    public formatPulse(pulse: number): number|string 
    {
      if (pulse == -1)
        return "open";
      if (pulse == -2)
        return "junction";
      return pulse;
    }

    private onSolutionChanged(): void {
      this.noWires = _mininec.getNoWires();
      if (this.activeWire >= this.noWires)
        this.activeWire = 0;
      this.setPulseCurrents();
    }

    private setPulseCurrents(): void {
      // trigger reactive update array
      this.pulseCurrents = [];
      for (let i=0; i < this.noWires; i++) {
        let [statusOk, pulseCurrents] = _mininec.getPulseCurrents(i);
        this.pulseCurrents[i] = statusOk ? (pulseCurrents as PulseCurrent[]) : [];

        if (!statusOk)
          console.log("Wire ", i, ": can't get current, error message: ", (pulseCurrents as string));
      }
    }

    private createChartIfNeeded(): void {
      if (this.chart)
        return;

      if (!this.$refs.chart) {
        console.log("Error: can't create chart, no reference");
        return;
      }
      
      let ctx = (this.$refs.chart as HTMLCanvasElement).getContext('2d');
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

      this.chart = new Chart(ctx, config as ChartConfiguration);
    }

    private updateChart(): void {
      this.createChartIfNeeded();
      if (!this.chart) {
        return;
      }

      let currents = this.pulseCurrents[this.activeWire];
      let noPoints = currents.length;
      let current_real_xy = currents.map((x, index) => { return {x: index / (noPoints-1), y: x.current.re}; });
      let current_imag_xy = currents.map((x, index) => { return {x: index / (noPoints-1), y: x.current.im}; });
      let current_total_xy = currents.map((x, index) => { return {x: index / (noPoints-1), y: x.current.toPolar().r}; });

      this.chart.data.datasets[0].data = current_real_xy;
      this.chart.data.datasets[1].data = current_imag_xy;
      this.chart.data.datasets[2].data = current_total_xy;

      if (this.chart.options.plugins && this.chart.options.plugins.title)
        this.chart.options.plugins.title.text = "Current in wire " + (this.activeWire+1).toString();

      this.chart.update();
    }

    mounted(): void {
      Chart.register(ScatterController, LinearScale, PointElement, LineElement, Legend, Title);
      this.onSolutionChanged();
      // can't call createChartIfNeeded here, can't find reference. Also not possible in beforeUpdate()
    }

    updated(): void {
      // Update chart when the DOM is ready, don't try earlier.
      this.updateChart();
    }
}
</script>

<style>
</style>