import { observable, computed, action, autorun, createTransformer } from "mobx"
import Jimp = require("jimp")
import { IMCData, IMCDataObject } from "../lib/IMCData"
import * as _ from "underscore"
import * as d3 from "d3-array"
import { ChannelName, D3BrushExtent, SelectOption } from "../interfaces/UIDefinitions"
import { keepAlive, IDisposer } from "mobx-utils"


export class ImageStore {

    selectedDataDisposer: IDisposer

    constructor() {
        this.selectedDataDisposer = keepAlive(this.selectedData)
    }

    @observable.ref imageData: IMCData | null
    @observable.ref plotData: IMCDataObject | null

    @observable selectedFile: string | null
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
    

    selectedData = computed(() => {
        console.log("Selecting data")
        let ret:{[x:string] : number[]} = {}

        if(this.imageData != null && this.currentSelection != null) {
            let data = this.imageData.data
            let channelNames = this.imageData.channelNames
            ret = {X:[], Y:[]}
            channelNames.forEach((s) => ret![s] = [])

            for(let i = 0; i < data.X.length; ++i) {
                let x = data.X[i]
                let y = data.Y[i]
                if(x >= this.currentSelection.x[0] && x <= this.currentSelection.x[1])
                    if(y >= this.currentSelection.y[0] && y <= this.currentSelection.y[1])
                        channelNames.forEach((s) => ret![s].push(data[s][i]))
            }
        }
        return(ret)
    })

    @action updatePlotData() {
        console.log("Updating plot data")
        let data = this.selectedData.get()
        if(data != null)
            this.plotData = _.pick(data, this.selectedPlotChannels)
    }



    @action setCurrentSelection(extent: D3BrushExtent) {
        this.currentSelection = {
            x: [extent[0][0], extent[1][0]], 
            y: [extent[0][1], extent[1][1]]
        }
    }



    @action updateImageData()  {
        if(this.selectedFile != null) {
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
     
}



 