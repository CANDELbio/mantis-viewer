import * as React from "react"
import * as ReactDOM from "react-dom"

//import { MainFrame } from "./containers/MainFrame"
import { createStore } from "redux"
import { mainPage } from "./reducers/MainPage"
import { Provider } from "react-redux"
import { State } from "./interfaces/State"
import { Image } from "./components/Image"
import * as UserActions from "./actions/UserActions"
import { Hello } from "./components/Hello"
import * as Mobx from 'mobx';
import { ImageStore } from "./stores/ImageStore"


Mobx.useStrict(true)

const electron = require("electron")



let initialState: State = {
        value: 5,
        selectedFile: null
    }

let store = createStore(mainPage, initialState)

const imageStore = new ImageStore()

electron.ipcRenderer.on("open-file", (event: Electron.IpcRendererEvent, fileName: string) => {
    console.log(fileName)
    imageStore.selectFile(fileName)
})



ReactDOM.render(
    <Provider store = {store} >
        <Hello  store={imageStore} />
    </Provider>,
    document.getElementById("example")
);



