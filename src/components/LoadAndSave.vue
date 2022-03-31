<template lang="html">
  <div id="loadandsave">
    <form @submit.prevent="">
        <label for="loadFile" class="button">Load file<input id="loadFile" type="file" @change="loadFromFile" class="hide" accept=".json"></label>&nbsp;
        <button @click.prevent="save">Save file</button>&nbsp;
        <select v-model="selected_example" class="select-with-button">
            <option v-for="option in examples" v-bind:key="option.name" v-bind:value="option.name">{{ option.name }}</option>
        </select>&nbsp;
        <button @click.prevent="example">Load example</button>
    </form>
  </div>
</template>

<script lang="ts">
import { antenna, Antenna } from '@/models/Antenna';
import { examples } from '@/models/Examples';
import { Component, Vue } from 'vue-property-decorator';

const FILE_VERSION = '1';

@Component
export default class LoadAndSave extends Vue {
    public readonly examples = examples;
    public selected_example = this.examples[0].name;

    public loadFromFile(event: Event): void {
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
                antenna.copyFrom(new Antenna(parsed));
                this.$emit('loadedGeometry');
            } catch (ex) {
                alert("Error while parsing file - this is not valid JSON");
            }
        }
        reader.readAsText(file);
    }

    public save(): void {
        // Make a clone of the object before adding version field
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let objectToSave: any = {};
        Object.assign(objectToSave, antenna);
        objectToSave.version = FILE_VERSION;
        this.downloadObjectAsJson(objectToSave, "antenna");
    }

    // https://stackoverflow.com/a/30800715
    // eslint-disable-next-line @typescript-eslint/ban-types
    private downloadObjectAsJson(exportObj: object, exportName: string): void {
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
        let downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", exportName + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    public example(): void {
        let content = this.examples.find(x => x.name == this.selected_example);
        if (!content)
            return;
        antenna.copyFrom(content.antenna);
        this.$emit('loadedGeometry');
    }
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
