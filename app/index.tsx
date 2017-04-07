import * as React from "react"
import * as ReactDOM from "react-dom"
import { ImageViewer } from "./components/ImageViewer"
import * as Mobx from 'mobx';
import { ImageStore } from "./stores/ImageStore"


Mobx.useStrict(true)

const electron = require("electron")


const { BrowserWindow } = electron.remote

//let win = new BrowserWindow({width: 400, height: 275})


const imageStore = new ImageStore()

electron.ipcRenderer.on("open-file", (event: Electron.IpcRendererEvent, fileName: string) => {
    console.log(fileName)
    imageStore.selectFile(fileName)
})



ReactDOM.render(
    <div>
        <ImageViewer  store={imageStore} />
    </div>,
    document.getElementById("example")
);



