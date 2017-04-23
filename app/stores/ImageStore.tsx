import { observable, computed, action, autorun, createTransformer } from "mobx"
import Jimp = require("jimp")

import * as Papa from "papaparse"
import { IMCData, IMCDataObject } from "../interfaces/IMCData"
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


    /*

    @action parseData(parseResult:PapaParse.ParseResult) {
        let data = parseResult.data



        interface parsedData {
            [key:string] :number
        }
        let d:parsedData = data[0]

        let imageData = new IMCData

        _.mapObject(d, (val, key) => {
            imageData.stats[key] = [val, val]
            imageData.data[key] = new Array(data.length)
        })
        
        for(let i = 0; i < data.length; ++i) {
            let temp:parsedData = data[i]
            _.mapObject(temp, (val, key) => {
                if(val < imageData.stats[key][0])
                    imageData.stats[key][0] = val
                if(val > imageData.stats[key][1])
                    imageData.stats[key][1] = val
                imageData.data[key][i] = val
            })

        }
        
        _.mapObject(imageData.data, (val, key) => {
            imageData.sortedData[key] = val.slice().sort((a, b) => a - b)
        })
        this.imageData = imageData
    }
*/

    @action updateImageData()  {
        if(this.selectedFile != null) {
            this.imageData = new IMCData(this.selectedFile)
            console.log(this.imageData)
        }
    }
/*
    @action updateImageDataOld()  {
        if(this.selectedFile != null) 
            fs.readFile(this.selectedFile, {
                    encoding: 'ascii',
                    flag: 'r'
                }, action((err: NodeJS.ErrnoException, data:string) => {
                    let parseResults = Papa.parse(data, {
                        delimiter: "\t",
                        header: true,
                        dynamicTyping: true
                        //skipEmptyLines: true
                    })
                    this.parseData(parseResults)
                    //this.channelNames = parseResults.meta.fields
                })
            )
    }*/


  
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



 