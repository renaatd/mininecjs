<template>
  <div id="geometry-input">
    <LoadAndSave v-on:loadedGeometry="updateInputsFromAntenna"/>
    <form @submit.prevent="handleSubmit">
      <label for="usernotes">User notes</label>
      <textarea id="usernotes" v-model="antenna.userNotes" placeholder="User notes for this design" rows="5"></textarea>

      <label for="freq">Frequency: <input id="freq" inputmode="decimal" v-model="frequencyText" @input="frequencyText = filterNumericInput(frequencyText)" :class="{ 'is-success': frequencyOk}"> MHz</label>
      <p>Wavelength: {{ wavelength.toFixed(1) }} m</p>

      <label for="environment">Environment </label>
      <select id="environment" v-model="environment" :class="[environmentOk ? 'is-success': '']">
        <option value="free">Free space</option>
        <option value="ground">Ground plane at z=0</option>
      </select>
      <div v-if="isWithGround">Impedance and current calculations are with ideal ground. Parameters for a non-ideal ground can be entered in the far field tab.</div>

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

<script lang="ts">
  import { antenna } from '@/models/Antenna';
  import _mininec from '@/models/Mininec';
  import { checkCsvNumbers, splitCsv } from '@/helpers/CsvHelpers';
  import { isNumeric, filterNumeric } from '@/helpers/NumericHelpers';
  import ClickHelp from './ClickHelp.vue';
  import LoadAndSave from './LoadAndSave.vue';
  import _debounce from 'lodash/debounce';
  import { Component, Vue, Watch } from 'vue-property-decorator';

  type WireDetail = {
    segmentLength: number,
    pulseBegin: string,
    pulseEnd: string
  }

  @Component({
    components: {
      ClickHelp,
      LoadAndSave
    }
  })
  export default class GeometryInput extends Vue {
    public antenna = antenna;
    public frequencyText = '';
    public wavelength = 0.0;
    public environment = '';

    public wiresStatus = '';
    public wiresOk = false;

    public sourcesStatus = '';
    public sourcesOk = false;

    public loadsStatus = '';
    public loadsOk = false;

    public calculatedStatus = '';
    public calculated = false;
    public wireDetails: WireDetail[] = [];

    public filterNumericInput = filterNumeric;

    private debouncedCheckAll = _debounce(this.checkAll, 500);
    private debouncedCheckSources = _debounce(this.setSources, 500);
    private debouncedCheckLoads = _debounce(this.setLoads, 500);
    // old solution: initialize with empty function - override in created() - https://stackoverflow.com/a/48659047
    // private debouncedCheckAll: () => void = () => void 0;

    // computed
    get  frequencyOk(): boolean { return !isNaN(this.antenna.frequency) && this.antenna.frequency > 0.0; }
    get  environmentOk(): boolean { return this.environment == 'free' || this.environment == 'ground'; }
    get  wiresParsed(): string[][] { return splitCsv(this.antenna.wires); }
    get  sourcesParsed(): string[][] { return splitCsv(this.antenna.sources); }
    get  loadsParsed(): string[][] { return splitCsv(this.antenna.loads); }
    get  allInputsOk(): boolean { return this.frequencyOk && this.environmentOk && this.wiresOk && this.sourcesOk && this.loadsOk; }
    get  isWithGround(): boolean { return this.environment == 'ground'; }

    // methods
    public updateInputsFromAntenna(): void {
       this.environment = antenna.hasGround ? 'ground' : 'free';
       this.frequencyText = antenna.frequency.toString();
       this.updateCalculated(false);
    }

    public handleSubmit(): void {
      if (!this.allInputsOk) 
        return;

      let [success, message] = _mininec.solve();
      this.updateCalculated(success, message);
    }

    /** Update calculated flag and status message, emit to parent */
    public updateCalculated(newValue: boolean, newMessage = ''): void {
      this.calculatedStatus = newMessage;
      this.calculated = newValue;
      this.$emit('setActive', newValue);
    }

    public checkAll(): void {
      this.setGeometry();
      this.setSources();
      this.setLoads();
      this.setFrequency();
    }

    public setGeometry(): void {
      this.wireDetails = [];
      [this.wiresOk, this.wiresStatus] = checkCsvNumbers(this.wiresParsed, 8);
      if (this.wiresOk) {
        if (this.environmentOk) {
          let wiresAsNumbers = this.wiresParsed.map(line => line.map(val => Number(val)));
          [this.wiresOk, this.wiresStatus] = _mininec.setGeometry(this.isWithGround, wiresAsNumbers);
          if (this.wiresOk) {
            let noWires = _mininec.getNoWires();
            let noPulses = _mininec.getNoPulses();
            this.wiresStatus = "OK, geometry has " + noWires.toString() + " wires and " + noPulses.toString() + " pulses.";

            this.wireDetails = Array(noWires).fill(0).map((_, index): WireDetail => {
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
        } else {
          this.wiresOk = false;
          this.wiresStatus = "Set the environment first to complete the geometry check";
        }
      }
    }

    public setSources(): void {
      if (this.sourcesParsed.length < 1) {
        this.sourcesOk = false;
        this.sourcesStatus = "Error, there must be at least 1 source !";
        return;
      }

      [this.sourcesOk, this.sourcesStatus] = checkCsvNumbers(this.sourcesParsed, 4);
      if (this.wiresOk && this.sourcesOk) {
        let sourcesAsNumbers = this.sourcesParsed.map(line => line.map(val => Number(val)));
        [this.sourcesOk, this.sourcesStatus] = _mininec.setSources(sourcesAsNumbers);
      }
    }

    public setLoads(): void {
      [this.loadsOk, this.loadsStatus] = checkCsvNumbers(this.loadsParsed);
      if (this.wiresOk && this.loadsOk) {
        let loadsAsNumbers = this.loadsParsed.map(line => line.map(val => Number(val)));
        [this.loadsOk, this.loadsStatus] = _mininec.setLoads(loadsAsNumbers);
      }
    }

    public setFrequency():void {
      if (isNumeric(this.frequencyText) && Number(this.frequencyText) > 0) {
        _mininec.setFrequency(Number(this.frequencyText));
        this.antenna.frequency = _mininec.getFrequency();
        this.wavelength = _mininec.getWavelength();
      } else {
        this.antenna.frequency = NaN;
        this.wavelength = NaN;
      }
    }

    @Watch('frequencyText')
    onFrequencyTextChanged(/* newValue: string , oldValue */):void {
      this.updateCalculated(false);
      this.setFrequency();
    }

    @Watch('environment')
    onEnvironmentChanged():void {
      // a watch on environmentOk doesn't work, so use this on environment for any change
      this.updateCalculated(false);
      if (this.environmentOk) {
        this.checkAll();
        this.antenna.hasGround = this.isWithGround;
      }
    }

    @Watch('antenna.wires')
    onWiresChanged(/* newWires, oldWires */ ):void {
      this.updateCalculated(false);
      this.wiresStatus = "(you're typing)";
      this.wiresOk = false;
      this.debouncedCheckAll();
    }

    @Watch('antenna.sources')
    onSourcesChanged( /* newSources, oldSources */ ):void {
      this.updateCalculated(false);
      this.sourcesStatus = "(you're typing)";
      this.sourcesOk = false;
      this.debouncedCheckSources();
    }

    @Watch('antenna.loads')
    onLoadsChanged( /* newSources, oldSources */ ):void {
      this.updateCalculated(false);
      this.loadsStatus = "(you're typing)";
      this.loadsOk = false;
      this.debouncedCheckLoads();
    }

    beforeMount():void {
      // Note: MiniNEC engine must already be initialized. If not, this.checkAll() might cause a null dereference
      this.updateInputsFromAntenna();
      this.checkAll();
    }
  }
</script>

<style scoped>
</style>