import { Histogram } from "./components/Histogram"
import * as React from "react"
import * as ReactDOM from "react-dom"

const ipc = require('electron').ipcRenderer;

ipc.on('plotData', (event, message) => {
    console.log("Received plot data")
    console.log(message); 
    
    let domNode = document.getElementById("plot")

    if(domNode != null) {
        ReactDOM.unmountComponentAtNode(domNode)

        ReactDOM.render(
            <div>
                <Histogram  data = {message} />
            </div>,
            domNode
        );
    }
})



