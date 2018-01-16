import { Histogram } from "./components/Histogram"
import { Boxplot } from "./components/Boxplot"
import { CountourPlot } from "./components/ContourPlot"
import * as React from "react"
import * as ReactDOM from "react-dom"

const electron = require('electron')

const ipc = electron.ipcRenderer

ipc.on('plotData', (event: Electron.Event, message:any) => {
    console.log("Received plot data")
    console.log(message); 
    
    let domNode = document.getElementById("plot")

    if(domNode != null) {
        ReactDOM.unmountComponentAtNode(domNode)

        ReactDOM.render(
            <div>
                <Histogram  data = {message} />
                <CountourPlot data = {message} />
            </div>,
            domNode
        );
    }
})



