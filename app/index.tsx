import * as React from "react"
import * as ReactDOM from "react-dom"

import { MainFrame } from "./containers/MainFrame"
import { createStore } from "redux"
import { mainPage } from "./reducers/MainPage"
import { Provider } from "react-redux"
import { State } from "./interfaces/State"
import { Image } from "./components/Image"




let initialState: State = {
        value: 5,
        selectedFile: null
    }

let store = createStore(mainPage, initialState)

ReactDOM.render(
    <Provider store = {store} >
        <MainFrame  />
    </Provider>,
    document.getElementById("example")
);

