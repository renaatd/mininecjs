
<template lang="html">
  <span>
      <kbd @click="showHelp=!showHelp">?</kbd>
      <div v-if="showHelp"><slot></slot></div>
  </span>
</template>

<script lang="ts">
/* ClickHelp: show help text after clicking on a help button. */ 
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class ClickHelp extends Vue {
    public showHelp = false;
}
</script>

<style lang="css">
</style>
