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
            let trace1 = {
                    x: this.props.data[axisNames[0]],
                    y: this.props.data[axisNames[1]],
                    type: 'histogram2dcontour',
                    colorscale: 'Hot',
                    reversescale: true
                }

            let trace2 =  {
                    x: this.props.data[axisNames[0]],
                    y: this.props.data[axisNames[1]],
                    mode: 'markers',
                    name: 'points',
                    marker: {
                        color: 'rgb(102,0,0)',
                        size: 2,
                        opacity: 0.4
                    },
                    type: 'scatter'
                }

            let plotData = [trace1, trace2]    
            let layout = {
                xaxis: {
                    range: [-5, quantile(this.props.data[axisNames[0]], 0.99, false) + 5],
                    title: axisNames[0]
                },
                yaxis: {
                    range: [-5, quantile(this.props.data[axisNames[1]], 0.99, false) + 5],
                    title: axisNames[1]
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