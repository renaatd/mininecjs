<script setup lang="ts">
/* ClickHelp: show help text after clicking on a help button. */ 

import { ref } from 'vue'
const showHelp = ref(false);
</script>

<template>
  <span>
      <kbd @click="showHelp=!showHelp">?</kbd>
      <p v-if="showHelp"><slot></slot></p>
  </span>
</template>

<style lang="css">
</style>
