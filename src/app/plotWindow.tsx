import * as React from "react"
import * as ReactDOM from "react-dom"
import { ScatterPlotData } from "../lib/ScatterPlotData"
import { ipcRenderer } from 'electron'

ipcRenderer.on('plotData', (event: Electron.Event, scatterPlotData:ScatterPlotData) => {
    console.log("Received plot data")

    let domNode = document.getElementById("plot")

    if(domNode != null) {
        ReactDOM.unmountComponentAtNode(domNode)

        ReactDOM.render(
            <div>
                {/* <CountourPlot data = {message} /> */}
            </div>,
            domNode
        )
    }
})



