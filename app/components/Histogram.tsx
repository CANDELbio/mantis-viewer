import * as React from "react"
import { observer } from "mobx-react"
import * as _ from "underscore"



let Plotly = require("../lib/plotly-latest.min")

interface HistogramProps {
    data: {[x:string]: number[]} | null
}


@observer
export class Histogram extends React.Component<HistogramProps, undefined> {
    constructor(props: HistogramProps) {
        super(props)
    }


    mountPlot(el:HTMLElement | null) {
        if(el != null && this.props.data != null) {
            let plotData = _.keys(this.props.data).map(s => {
                return({
                    x: this.props.data![s],
                    type: "histogram"
                })
                
            })
            Plotly.plot(el, [plotData[0]])
        }

    }

    render() {
        console.log("Plotting histogram")
        return(
            <div id="plotly-histogram" ref = {(el) => this.mountPlot(el)}/>
        )
    }
}
