<template>
  <div id="loadandsave">
    <form @submit.prevent="">
        <label for="loadFile" class="button">Load file<input id="loadFile" type="file" @change="loadFromFile" class="hide" accept=".json"></label>&nbsp;
        <button type="button" @click.prevent="save">Save file</button>&nbsp;
        <select v-model="selected_example" class="select-with-button">
            <option v-for="option in examples" v-bind:key="option.name" v-bind:value="option.name">{{ option.name }}</option>
        </select>&nbsp;
        <button type="button" @click.prevent="loadExample">Load example</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { antenna, Antenna } from '@/models/Antenna';
import { examples } from '@/models/Examples';

const FILE_VERSION = '1';
const emit = defineEmits(['updateGeometry'])

const selected_example = ref(examples[0].name);

function loadFromFile(event: Event): void {
    if (event == null)
        return;

    let target = event.target as HTMLInputElement;
    if (!target.files)
        return;

    let file = target.files[0];
    if (file.size > 100000) {
        alert('File size is limited to 100 kB')
        return;
    }

    const reader = new FileReader();
    reader.onloadend = e => { 
        if (!e.target)
            return;
        if (e.target.error) {
            alert("Error while reading file");
            return;
        }
        try {
            let parsed = JSON.parse(e.target.result as string);
            let propertiesToTest = ["version", ...Antenna.ATTRIBUTES];
            if (propertiesToTest.length != Object.getOwnPropertyNames(parsed).length
                || !propertiesToTest.every(function(x) { return x in parsed; }) 
                || parsed.version != FILE_VERSION) {
                alert('This is not a valid antenna definition');
                return;
            }
            delete parsed.version;
            emit('updateGeometry', new Antenna(parsed));
        } catch (ex) {
            alert("Error while parsing file - this is not valid JSON");
        }
    }
    reader.readAsText(file);
}

function save(): void {
    // Make a clone of the object before adding version field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let objectToSave: any = {};
    Object.assign(objectToSave, antenna);
    objectToSave.version = FILE_VERSION;
    downloadObjectAsJson(objectToSave, "antenna");
}

// eslint-disable-next-line @typescript-eslint/ban-types
function downloadObjectAsJson(exportObj: object, exportName: string): void {
    // https://stackoverflow.com/a/30800715
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    let downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function loadExample(): void {
    let content = examples.find(x => x.name == selected_example.value);
    if (!content)
        return;
    emit('updateGeometry', content.antenna);
}
</script>

<style scoped lang="css">
.select-with-button {
    width: auto;
    display: inline;
    /* button has 0.75rem 1.25rem. Keep this 1.25rem at right side for drop down arrow, but make it smaller at left side */
    padding: 0.75rem 1.25rem 0.75rem 0.25rem;
}
</style>
