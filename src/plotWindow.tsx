import { Histogram } from "./components/Histogram"
import { Boxplot } from "./components/Boxplot"
import { CountourPlot } from "./components/ContourPlot"
import { ScatterPlot } from "./components/ScatterPlot"
import * as React from "react"
import * as ReactDOM from "react-dom"
import { ScatterPlotData } from "./lib/ScatterPlotData"

const electron = require('electron')

const ipc = electron.ipcRenderer

ipc.on('plotData', (event: Electron.Event, scatterPlotData:ScatterPlotData) => {
    console.log("Received plot data")

    let domNode = document.getElementById("plot")

    if(domNode != null) {
        ReactDOM.unmountComponentAtNode(domNode)

        ReactDOM.render(
            <div>
                <ScatterPlot scatterPlotData = {scatterPlotData} />
                {/* <Histogram  data = {message} />
                <CountourPlot data = {message} /> */}
            </div>,
            domNode
        );
    }
})



