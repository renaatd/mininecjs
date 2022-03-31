<template lang="html">
  <div id="polarplot">
      <svg ref="polar" preserveAspectRatio="xMidYMid meet" :viewBox="viewBox" >
          <g id="radii" class="axis" v-html="radiiScale"></g>
          <g id="angles" class="axis" v-html="angleScale"></g>
          <g id="aid" :transform="`translate(${radius+130} ${radius/2})`" v-html="aidDiagram"></g>
          <g>
              <text :x="radius+20" :y="-radius/2-30">Gain in function of {{ isElevation ? "elevation" : "azimuth" }}</text>

              <line :x1="radius+20" :y1="-radius/2-5" :x2="radius+50" :y2="-radius/2-5" class="line" style="stroke:rgb(31,119,180);"></line>
              <text :x="radius+60" :y="-radius/2">horizontal</text>
              
              <line :x1="radius+20" :y1="-radius/2+10" :x2="radius+50" :y2="-radius/2+10" class="line" style="stroke:rgb(255,127,14);"></line>
              <text :x="radius+60" :y="-radius/2+15">vertical</text>

              <line :x1="radius+20" :y1="-radius/2+25" :x2="radius+50" :y2="-radius/2+25" class="line" style="stroke:rgb(44,160,44);"></line>
              <text :x="radius+60" :y="-radius/2+30">total</text>
          </g>
          <path class="line" style="stroke:rgb(31,119,180);" :d="line[0]"></path>
          <path class="line" style="stroke:rgb(255,127,14);" :d="line[1]"></path>
          <path class="line" style="stroke:rgb(44,160,44);" :d="line[2]"></path>
      </svg>
  </div>
</template>


<script lang="ts">
// Layout based on example polarplot here: https://bl.ocks.org/mbostock/4583749
//
// DOM manipulation using VueJS based on these:
// https://macwright.com/2016/10/11/d3-and-react.html
// https://medium.com/@lambrospd/5-simple-rules-to-data-visualization-with-vue-js-and-d3-js-f6b2bd6a1d40
//
// Essentially:
// * Use Vue template for the fixed SVG
// * Use as much as possible computed properties for e.g. the path -> easier to maintain
// * Use $ref + trigger on mounted for init stuff. Try to avoid it for things that change - would require watches for updating

import { create } from "d3-selection";
import { range } from "d3-array";
import { ScaleLinear, scaleLinear } from "d3-scale";
import { lineRadial } from "d3-shape";
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class PolarPlot extends Vue {
    @Prop()
    readonly isElevation!: boolean;

    @Prop() 
    readonly angles!: number[];

    @Prop() 
    readonly values!: [number[], number[], number[]];

    @Prop()
    readonly maxValue!: number;

    @Prop()
    readonly azimuth!: number;

    @Prop()
    readonly width!: number;

    @Prop()
    readonly height!: number;

    readonly radius = Math.min(this.width, this.height) / 2 - 30;

    get viewBox(): string { return `${-this.width/3} ${-this.height/2} ${this.width} ${this.height}`; }

    get scaleR(): ScaleLinear<number,number> { 
        return scaleLinear()
            .clamp(true)
            .domain([this.maxValue - 40, this.maxValue])
            .range([0, this.radius])
            .nice(); 
    }

    get line(): [string|null, string|null, string|null] {
        if (this.angles.length == 0)
            return ["", "", ""];

        let horizontal: [number,number][] = this.angles.map((element, index) => { return [element, this.values[0][index]]});
        let vertical: [number,number][] = this.angles.map((element, index) => { return [element, this.values[1][index]]});
        let total: [number,number][] = this.angles.map((element, index) => { return [element, this.values[2][index]]});
        
        // lineRadial: angle 0 = top, angle pi/2 = right
        let lineGenerator = lineRadial()
            .radius((d) => { return this.scaleR(d[1]); })
            .angle((d) => { 
                // lineRadial has 0 at top, pi/2 at right
                // our azimuth and elevation plots have 0 at right and 90 at top
                return -d[0] * Math.PI / 180.0 + Math.PI / 2; 
            });
        return [
            lineGenerator([...horizontal, horizontal[0]]),
            lineGenerator([...vertical, vertical[0]]),
            lineGenerator([...total, total[0]]),
        ];
    }

    get radiiScale(): string {
        let gr = create("g");
        let grSub = gr.selectAll("g")
            .data(this.scaleR.ticks(5).slice(1))
        .enter().append("g");

        grSub.append("circle")
            .attr("r", this.scaleR);

        grSub.append("text")
            .attr("y", (d) => { return -this.scaleR(d) - 4; })
            .attr("transform", "rotate(15)")
            .style("text-anchor", "middle")
            .text(function(d) { return d; });

        return gr.html();
    }

    get angleScale(): string {
        // for all angles: draw horizontal line + text right from it, and rotate counter-clockwise the correct number of degrees
        var ga = create("g");
        let gaSub = ga.selectAll("g")
            .data(range(-150, 181, 30))
        .enter().append("g")
            .attr("transform", function(d) { return "rotate(" + -d + ")"; });

        gaSub.append("line")
            .attr("x2", this.radius);

        // if needed: rotate text another 180°, around its start coordinate (this.radius+6,0)
        gaSub.append("text")
            .attr("x", this.radius + 6)
            .attr("dy", ".35em")
            // text at top/bottom is centered, text at left side is right aligned
            .style("text-anchor", (d) => { 
                return d < -90 || d > 90 ? "end" 
                  : ((d == -90 || d == 90) ? "middle" 
                  : "start"); 
                })
            // rotate text back to have it horizontal
            .attr("transform", (d) => { return `rotate(${d} ${(this.radius + 6)},0)`; })
            .text((d) => { 
                return d + "°"; 
            });
        return ga.html();
    }

    get aidDiagram(): string {
        if (!this.isElevation)
            return "";

        let gr = create("g");
        gr.append("text")
            .attr("x", "0")
            .attr("y", "-110")
            .style("text-anchor", "middle")
            .text("top view");
        gr.append("line")
            .attr("y1", "90")
            .attr("y2", "-90")
            .style("stroke", "black");
        gr.append("line")
            .attr("x1", "90")
            .attr("x2", "-90")
            .style("stroke", "black");
        gr.append("line")
            .attr("x1", "90")
            .attr("x2", "-90")
            .style("stroke", "red")
            .attr("transform", `rotate(${-this.azimuth})`);
        gr.append("text")
            .attr("x", "80")
            .attr("y", "-10")
            .style("font", "10px sans-serif")
            .text("x");
        gr.append("text")
            .attr("y", "-80")
            .attr("x", "-10")
            .style("font", "10px sans-serif")
            .text("y");
        gr.append("text")
            .attr("x", "95")
            .attr("dy", ".35em")
            .style("stroke", "red")
            .style("font", "10px sans-serif")
            .attr("transform", `rotate(${-this.azimuth}) rotate(${this.azimuth} 98,0)`)
            .text("0");
        gr.append("text")
            .attr("x", "-100")
            .attr("dy", ".35em")
            .style("stroke", "red")
            .style("text-anchor", "middle")
            .style("font", "10px sans-serif")
            .attr("transform", `rotate(${-this.azimuth}) rotate(${this.azimuth} -100,0)`)
            .text("180");
        return gr.html();
    }
}
</script>

<style lang="css" scoped>
/* to make a scoped selector deep: use >>> - see https://vue-loader.vuejs.org/guide/scoped-css.html#mixing-local-and-global-styles */
.axis >>> text {
  font: 10px sans-serif;
}

.axis >>> line,
.axis >>> circle {
  fill: none;
  stroke: #777;
  stroke-dasharray: 1,4;
}

.axis :last-of-type >>> circle {
  stroke: #333;
  stroke-dasharray: none;
}

.line {
  fill: none;
  stroke-width: 1.5px;
}
</style>
