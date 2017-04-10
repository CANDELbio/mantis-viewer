import * as React from "react"
import * as _ from "underscore"
import { quantile } from "../lib/utils"

let Plotly = require("../lib/plotly-latest.min")


interface CountourPlotProps {
    data: {[x:string]: number[]}
}

export class CountourPlot extends React.Component<CountourPlotProps, undefined> {
    
    constructor(props: CountourPlotProps) {
        super(props)
    }


    mountPlot(el:HTMLElement | null) {
        if(el != null && this.props.data != null) {
            
            let axisNames = _.keys(this.props.data)
            let plotData = [{
                    x: this.props.data[axisNames[0]],
                    y: this.props.data[axisNames[1]],
                    type: 'histogram2dcontour',
                    colorscale: 'Hot',
                    reversescale: true
                }]
            let layout = {
                xaxis: {
                    range: [-5, quantile(this.props.data[axisNames[0]], 0.99, false) + 5]
                },
                yaxis: {
                    range: [-5, quantile(this.props.data[axisNames[1]], 0.99, false) + 5]
                }
            }
            Plotly.newPlot(el, plotData, layout)
        }

    }

    render() {
        return(
            <div id="plotly-countourplot" ref = {(el) => this.mountPlot(el)}/>
        )
    }
}