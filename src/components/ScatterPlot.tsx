import * as React from "react"
import * as _ from "underscore"
import { quantile } from "../lib/utils"
import { ScatterPlotData } from "../lib/ScatterPlotData"

let Plotly = require("../lib/plotly-latest.min")


interface ScatterPlotProps {
    scatterPlotData: ScatterPlotData
}

export class ScatterPlot extends React.Component<ScatterPlotProps, undefined> {
    
    constructor(props: ScatterPlotProps) {
        super(props)
    }

    mountPlot(el:HTMLElement | null) {
        if(el != null && this.props.scatterPlotData != null) {
            Plotly.newPlot(el, this.props.scatterPlotData.data, this.props.scatterPlotData.layout)
        }
    }

    render() {
        return(
            <div id="plotly-scatterplot" ref = {(el) => this.mountPlot(el)}/>
        )
    }
}