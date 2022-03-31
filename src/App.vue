<template>
  <div id="app" class="medium-container">
    <nav class="margin-top margin-bottom">
    | <a href="index.html">MiniNEC JS</a> | <a href="about.html">About</a> |
    </nav>
    <div v-if="mininecInitialized">
      <a class="button accent-button" :class="{'round-button': activeTab==0}" @click.prevent="setActive(0)">Input</a>&nbsp;
      <a class="button" :class="[calculated ? 'accent-button' : 'muted-button', {'round-button': activeTab==1}]"  @click.prevent="setActive(1)">Basic info</a>&nbsp;
      <a class="button" :class="[calculated ? 'accent-button' : 'muted-button', {'round-button': activeTab==2}]" @click.prevent="setActive(2)">Wire current</a>&nbsp;
      <a class="button" :class="[calculated ? 'accent-button' : 'muted-button', {'round-button': activeTab==3}]" @click.prevent="setActive(3)">Far field pattern</a>&nbsp;

      <GeometryInput v-show="activeTab == 0" v-on:setActive="setCalculated"/> 
      <BasicInfo v-if="activeTab == 1" /> 
      <WireCurrent v-if="activeTab == 2" /> 
      <FarField v-if="activeTab == 3" /> 
    </div>
    <div v-else>
      <p>MiniNEC JS is initializing...</p>
      <p>If this message doesn't disappear, your browser might not be able to run this application. Try again with a different browser.</p>
    </div>

  </div>
</template>


<script lang="ts">
import _mininec from '@/models/Mininec';
import { Component, Vue } from 'vue-property-decorator';
import BasicInfo from '@/components/BasicInfo.vue'
import FarField from '@/components/FarField.vue'
import GeometryInput from '@/components/GeometryInput.vue'
import WireCurrent from '@/components/WireCurrent.vue'

@Component({
  components: {
    BasicInfo,
    FarField,
    GeometryInput,
    WireCurrent,
  },
})
export default class App extends Vue {
  public activeTab = 0;
  public calculated = false;
  public mininecInitialized = false;

  public setActive(newValue: number): void { 
    this.activeTab = newValue; 
    if (!this.calculated && this.activeTab != 0 && this.activeTab != 4)
      this.activeTab = 0;
  }

  public setCalculated(newValue: boolean): void { 
    this.calculated = newValue; 
    if (this.calculated)
      this.setActive(1);
  }

  beforeMount():void {
    _mininec.addObserverInitialized(() => { 
      this.mininecInitialized = true;
    });
  }
}
</script>


<style>
nav {
  font-size: 1.25rem;
}
</style>
