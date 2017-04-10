import * as React from "react"
import { observer } from "mobx-react"
import * as _ from "underscore"


let Plotly = require("../lib/plotly-latest.min")

interface PlotlyPlotProps {
    data: {[x:string]: number[]} | null
    type: string
    extraTraceProps? : {[x: string]: any}
}


export class PlotlyPlot extends React.Component<PlotlyPlotProps, undefined> {
    constructor(props: PlotlyPlotProps) {
        super(props)
    }


    mountPlot(el:HTMLElement | null) {
        if(el != null && this.props.data != null) {
            let plotData = _.keys(this.props.data).map((s, i) => {
                let ret:{[x: string]: any} = {
                    x: this.props.data![s],
                    type: this.props.type,
                    name: s
                }
                if(this.props.extraTraceProps != null) {
                    _.keys(this.props.extraTraceProps).map((s) => {
                        ret[s] = this.props.extraTraceProps![s]
                    })
                }
                return(ret)
                
            })
            Plotly.newPlot(el, plotData)
        }

    }

    render() {
        return(
            <div id="plotly-plot" ref = {(el) => this.mountPlot(el)}/>
        )
    }
}
