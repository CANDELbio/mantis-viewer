import { observable, 
    computed, 
    action, 
    autorun, 
    createTransformer, 
    ObservableMap } from "mobx"
import { IMCData, IMCDataObject } from "../lib/IMCData"

import * as _ from "underscore"
import * as d3 from "d3-array"
import { ChannelName, 
    D3BrushExtent, 
    SelectOption,
    LabelLayer } from "../interfaces/UIDefinitions"
import { keepAlive, IDisposer } from "mobx-utils"


import * as querystring from "querystring"
import * as http from "http"


export class ImageStore {

    selectedDataDisposer: IDisposer

    constructor() {
        this.selectedDataDisposer = keepAlive(this.selectedData)
    }


    private canvasImageData:ImageData | null = null
    
    @observable.ref imageData: IMCData | null
    @observable.ref plotData: IMCDataObject | null

    @observable.ref extraData: Uint8ClampedArray | null = null

    @observable selectedFile: string | null
    @observable.ref selectedPlotChannels: string[] = []
    @observable channelDomain: Record<ChannelName, [number, number]> = {
        rChannel: [80, 100],
        gChannel: [80, 100],
        bChannel: [80, 100]
    }
    @observable channelSliderValue: Record<ChannelName, [number, number]> = {
        rChannel: [80, 100],
        gChannel: [80, 100],
        bChannel: [80, 100]
    }

    @observable channelMarker: Record<ChannelName, string | null> = {
        rChannel: null,
        gChannel: null,
        bChannel: null
    }

    @observable currentSelection: {
        x: [number, number]
        y: [number, number]
    } | null = null


    labelsLayers = observable.shallowArray<LabelLayer>()

    selectedData = computed(() => {
        console.log("Selecting data")
        let ret: { [x: string]: number[] } = {}

        if (this.imageData != null && this.currentSelection != null) {
            let data = this.imageData.data
            let channelNames = this.imageData.channelNames
            ret = { X: [], Y: [] }
            channelNames.forEach((s) => ret![s] = [])

            for (let i = 0; i < data.X.length; ++i) {
                let x = data.X[i]
                let y = data.Y[i]
                if (x >= this.currentSelection.x[0] && x <= this.currentSelection.x[1])
                    if (y >= this.currentSelection.y[0] && y <= this.currentSelection.y[1])
                        channelNames.forEach((s) => ret![s].push(data[s][i]))
            }
        }
        return (ret)
    })


    @action toggleLayerVisibility = (idx: number) => {
        console.log(this.labelsLayers[idx].visible)

        console.log(idx)
        this.labelsLayers[idx].visible = !this.labelsLayers[idx].visible
    }

    @action updatePlotData() {
        console.log("Updating plot data")
        let data = this.selectedData.get()
        if (data != null)
            this.plotData = _.pick(data, this.selectedPlotChannels)
    }



    @action setCurrentSelection(extent: D3BrushExtent) {
        this.currentSelection = {
            x: [extent[0][0], extent[1][0]],
            y: [extent[0][1], extent[1][1]]
        }
    }



    @action updateImageData() {
        if (this.selectedFile != null) {
            this.imageData = new IMCData(this.selectedFile)
            console.log(this.imageData)
        }
    }

    @action setChannelDomain = (name: ChannelName) => {
        return action((value: [number, number]) => {
            this.channelDomain[name] = value
        })
    }

    @action setChannelSliderValue = (name: ChannelName) => {
        return action((value: [number, number]) => {
            this.channelSliderValue[name] = value
        })
    }

    @action setChannelMarker = (name: ChannelName) => {
        return action((x: SelectOption) => {
            this.channelMarker[name] = x.value
        })
    }

    @action setSelectedPlotChannels = (x: SelectOption[]) => {
        this.selectedPlotChannels = _.pluck(x, "value")
        console.log(this.selectedPlotChannels)
    }

    @action selectFile = (fName: string) => {
        this.selectedFile = fName
        this.updateImageData()
    }

    @action setCanvasImageData = (data:ImageData) => {
        this.canvasImageData = data
    }


    @action doSegmentation = () => {
        console.log("segmenting")
        if(this.canvasImageData != null) {
            let xhr = new XMLHttpRequest
            xhr.open("POST", "http://127.0.0.1:5000/segmentation", true)
            xhr.responseType = "arraybuffer"
            xhr.onload = action((e) => {
                if (xhr.readyState === 4) {
                    console.log(xhr)
                    let v = new Uint8ClampedArray(xhr.response)
                    let layer = new LabelLayer()
                    layer.data = v
                    layer.width = this.canvasImageData!.width
                    layer.height = this.canvasImageData!.height
                    layer.name = "test segmentation"
                    layer.visible = true
                    this.labelsLayers.push(layer)
                    //this.labelsLayers = [v]
                    console.log(v)
                }
            })

            xhr.setRequestHeader("width", this.canvasImageData.width.toString())
            xhr.setRequestHeader("height", this.canvasImageData.height.toString())
            xhr.send(this.canvasImageData.data.buffer)
        }
    }
}



