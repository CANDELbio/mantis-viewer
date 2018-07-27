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
    @observable selectedDirectory: string | null
    @observable.ref selectedPlotChannels: string[] = []
    @observable channelDomain: Record<ChannelName, [number, number]> = {
        rChannel: [0, 100],
        gChannel: [0, 100],
        bChannel: [0, 100]
    }
    @observable channelSliderValue: Record<ChannelName, [number, number]> = {
        rChannel: [0, 100],
        gChannel: [0, 100],
        bChannel: [0, 100]
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

    @observable imageScale = 1.0

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

    @action setZoom(e:React.WheelEvent<HTMLDivElement>) {
        console.log("Scaling...")
        e.stopPropagation()
        e.preventDefault()

        console.log(e.clientX - e.currentTarget.getBoundingClientRect().left)
        console.log(e.clientY - e.currentTarget.getBoundingClientRect().top) 

        let isZoomIn = e.deltaY < 0
        let direction = isZoomIn ? 1 : -1
        let factor = (1 + direction * 0.05)
        this.imageScale *= factor

        if (this.imageScale < 1.0) this.imageScale = 1.0
    }

    @action updateImageData() {
        if (this.selectedDirectory != null) 
            this.imageData = new IMCData(this.selectedDirectory, "folder")
        
        console.log(this.imageData)
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
            // If the SelectOption has a value.
            if(x != null){
                this.channelMarker[name] = x.value
                // Setting the default slider/domain values to the min/max values from the image
                if(this.imageData != null){
                    let min = this.imageData.minmax[x.value].min
                    let max = this.imageData.minmax[x.value].max
                    this.channelDomain[name] = [min, max]
                    this.channelSliderValue[name] = [min, max]
                }
            // If SelectOption doesn't have a value the channel has been cleared and values should be reset.
            } else {
                this.channelMarker[name] = null
                this.channelDomain[name] = [0, 100]
                this.channelSliderValue[name] = [0, 100]
            }
        })
    }

    @action setSelectedPlotChannels = (x: SelectOption[]) => {
        this.selectedPlotChannels = _.pluck(x, "value")
    }

    @action selectFile = (fName: string) => {
        this.selectedFile = fName
        this.updateImageData()
    }

    @action selectDirectory = (dirName : string) => {
        this.selectedDirectory = dirName
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