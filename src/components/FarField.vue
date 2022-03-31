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
          <input id="eps" inputmode="decimal" v-model="epsilonRText" @input="epsilonRText = filterNumericInput(epsilonRText)">
        </div>
        <div class="flex-small">
          <label for="conductivty">Conductivity (S/m):</label>
          <input id="conductivity" inputmode="decimal" v-model="conductivityText" @input="conductivityText = filterNumericInput(conductivityText)">
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
        <input id="azimuth" type="number" min="-180" max="180" v-model="azimuthText">
      </div>
      <div v-if="!isElevationPlot">
        <label for="elevation_slider">Elevation (&deg;):</label>
        <input type="range" :min="elevationMin" max="90" class="slider" id="elevation_slider" v-model="elevationText">
        <input id="elevation" type="number" :min="elevationMin" max="90" v-model="elevationText">
      </div>
    </form>

    <div v-if="allInputsOk && errorMessage == ''">
      <PolarPlot v-bind:isElevation="isElevationPlot" 
        v-bind:angles="angles" v-bind:values="[horizontalValues, verticalValues, totalValues]" v-bind:maxValue="maxFieldDbi" v-bind:azimuth="Number(azimuthText)"
        width="800" height="400"/>

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
      Please enter valid positive numbers for the relative dielectric constant, conductivity and step angle.
    </div>
    <div v-else>
      Unexpected error: {{ errorMessage }}
    </div>
  </div>
</template>

<script lang="ts">
import { isNumeric, filterNumeric, wrapAngle } from '@/helpers/NumericHelpers';
import { antenna } from '@/models/Antenna';
import _mininec from '@/models/Mininec';
import type { FarFieldDbi, StepSequence } from '@/models/Mininec';
import PolarPlot from '@/components/PolarPlot.vue';
import { Component, Vue, Watch } from 'vue-property-decorator';

type FarFieldDbiElevation = {
    elevation: number,
    azimuth: number,
    horizontal: number,
    vertical: number,
    total: number
}

@Component({
  components: {
    PolarPlot
  }
})
export default class FarField extends Vue {
    public antenna = antenna;
    public plotType = 'azimuth';
    public azimuthText = '0';
    public elevationText = '0';
    public stepAngleText = '1';
    public farFieldDbi: FarFieldDbiElevation[] = [];
    public maxFieldDbi = -999;

    public groundType = '';
    public epsilonRText = '';
    public conductivityText = '';

    public errorMessage = '';

    public filterNumericInput = filterNumeric;

    // convert user selection to boolean
    get isElevationPlot(): boolean { return this.plotType == 'elevation'; }

    // convert user input to number
    get azimuth(): number { return Number(this.azimuthText); }
    get elevation(): number { return Number(this.elevationText); }

    // check if all inputs are valid
    get epsilonROK(): boolean { return !this.antenna.hasGround || this.antenna.hasIdealGround || (isNumeric(this.epsilonRText) && this.antenna.epsilonR > 0); }
    get conductivityOK(): boolean { return !this.antenna.hasGround || this.antenna.hasIdealGround || (isNumeric(this.conductivityText) && this.antenna.conductivity > 0); }
    get azimuthOk(): boolean { return !this.isElevationPlot || isNumeric(this.azimuthText); }
    get elevationOk(): boolean { return this.isElevationPlot || isNumeric(this.elevationText); }
    get stepAngleOk(): boolean { return isNumeric(this.stepAngleText); }
    get allInputsOk(): boolean { return this.epsilonROK && this.conductivityOK && this.azimuthOk && this.elevationOk && this.stepAngleOk; }

    // update input range based on environment
    get elevationMin(): number { return this.antenna.hasGround ? 0 : -90; }

    // calculate min/max values
    get horizontalValues(): number[] { return this.farFieldDbi.map(x => x.horizontal); }
    get verticalValues(): number[] { return this.farFieldDbi.map(x => x.vertical); }
    get totalValues(): number[] { return this.farFieldDbi.map(x => x.total); }
    get angles(): number[] { return this.isElevationPlot ? this.farFieldDbi.map(x => x.elevation) : this.farFieldDbi.map(x => x.azimuth); }

    get horizontalRange(): number[] { return this.getRange(this.horizontalValues); }
    get verticalRange(): number[] { return this.getRange(this.verticalValues); }
    get totalRange(): number[] { return this.getRange(this.totalValues); }

    get maxAngle(): number { return this.angles[this.totalValues.indexOf(this.totalRange[1])]; }

    public formatDbi(x: number): string {
      return x.toFixed(3).toString().padStart(8);
    }

    private getFarFieldDbi(): void {
      // trigger reactive update array
      this.farFieldDbi = [];
      this.errorMessage = '';

      if (!this.allInputsOk)
        return;

      if (this.antenna.hasGround) {
        let statusOk: boolean;
        let message: string;

        if (this.antenna.hasIdealGround)
          [statusOk, message] = _mininec.clearGroundMedia();
        else
          [statusOk, message] = _mininec.setGroundMedia(this.antenna.epsilonR, this.antenna.conductivity);
        if (!statusOk) {
          this.errorMessage = "SetGroundMedia error: " + message;
          return;
        }
      } 

      let stepAngle = Number(this.stepAngleText);
      if (stepAngle <= 0.1)
        stepAngle = 0.1;
      const noSteps = (this.isElevationPlot && this.antenna.hasGround) ? Math.ceil(180/stepAngle) : Math.ceil(360/stepAngle);

      let statusOk: boolean;
      let result: string | FarFieldDbi[];
      if (this.isElevationPlot) {
        const zenith: StepSequence = {init: 90, step: -stepAngle, count: noSteps};
        const azimuth: StepSequence = {init: this.azimuth, step: 0, count: 1};
        [statusOk, result] = _mininec.getFarFieldDbi(zenith, azimuth);
      } else {
        const zenith: StepSequence = {init: 90-this.elevation, step: 0, count: 1};
        const azimuth: StepSequence = {init: 0, step: stepAngle, count: noSteps};
        [statusOk, result] = _mininec.getFarFieldDbi(zenith, azimuth);
      }

      if (!statusOk) {
        this.errorMessage = result as string;
        return;
      }
      this.farFieldDbi = (result as FarFieldDbi[]).map(x => { return {
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
      });

      let totalValues = this.farFieldDbi.map(x => x.total);
      let maxValue = Math.max(...totalValues);
      if (maxValue > this.maxFieldDbi)
        this.maxFieldDbi = maxValue;
    }

    private getRange(values: number[]) {
      let maxValue = Math.max(...values);
      let minValue = Math.min(...values);
      return [minValue, maxValue];
    }

    private updateInputsFromAntenna(): void {
      this.groundType = antenna.hasIdealGround ? 'ideal' : 'non-ideal';
      this.epsilonRText = antenna.epsilonR.toString();
      this.conductivityText = antenna.conductivity.toString();
    }

    @Watch('epsilonRText')
    private onChangedEpsilonR() {
      this.antenna.epsilonR = Number(this.epsilonRText);
    }

    @Watch('conductivityText')
    private onChangedConductivity() {
      this.antenna.conductivity = Number(this.conductivityText);
    }

    @Watch('groundType')
    private onChangedGroundType() {
      this.antenna.hasIdealGround = this.groundType == 'ideal';
    }

    @Watch('antenna.conductivity')
    @Watch('antenna.epsilonR')
    @Watch('antenna.hasIdealGround')
    private onSolutionChanged(): void {
      this.maxFieldDbi = -999;
      this.getFarFieldDbi();
    }

    @Watch('plotType')
    @Watch('stepAngleText')
    @Watch('elevation')
    @Watch('azimuth')
    private onAngleChanged(): void {
      this.getFarFieldDbi();
    }

    created():void {
      this.updateInputsFromAntenna();
      this.onSolutionChanged();
    }
}
</script>

<style scoped>
.ordinal {
  font-variant-numeric: tabular-nums;
}
</style>