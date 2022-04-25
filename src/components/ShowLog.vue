<template>
    <pre><span v-for="(item, index) in logMessages" :key="index">{{ item }}<br></span></pre>
</template>

<script setup lang="ts">
import { logMessages } from '@/helpers/Logger';
</script>