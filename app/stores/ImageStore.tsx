import { observable, computed, action, autorun, createTransformer } from "mobx"
import Jimp = require("jimp")
import * as fs from "fs"
import * as Papa from "papaparse"
import { IMCData, IMCDataStats } from "../interfaces/IMCData"
import * as _ from "underscore"
import * as d3 from "d3-array"
import { ChannelName } from "../interfaces/UIDefinitions"



export class ImageStore {

    @observable selectedFile: string | null
    @observable.ref imageData: IMCData | null
    @observable.ref imageStats: IMCDataStats | null
    @observable channelNames: string[] | null = null

    @observable channelDomain: Record<ChannelName, [number, number]> = {
        rChannel: [0, 200],
        gChannel: [0, 200],
        bChannel: [0, 200]
    }
    @observable channelSliderValue: Record<ChannelName, [number, number]> = { 
        rChannel: [0, 200],
        gChannel: [0, 200],
        bChannel: [0, 200]
    }

    @observable channelMarker: Record<ChannelName, string | null> = {
        rChannel: null,
        gChannel: null,
        bChannel: null
    }


    @action parseData(parseResult:PapaParse.ParseResult) {
        let data = parseResult.data


        let stats:IMCDataStats = {}

        interface parsedData {
            [key:string] :number
        }
        let d:parsedData = data[0]

        let imageData:IMCData = {X:[], Y:[]}

        _.mapObject(d, (val, key) => {
            stats[key] = [val, val]
            imageData![key] = new Array(data.length)
        })
        
        for(let i = 0; i < data.length; ++i) {
            let temp:parsedData = data[i]
            _.mapObject(temp, (val, key) => {
                if(val < stats[key][0])
                    stats[key][0] = val
                if(val > stats[key][1])
                    stats[key][1] = val
                imageData![key][i] = val
            })

        }
        this.imageStats = stats
        this.imageData = imageData
    }

    @action updateImageData()  {
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
                    this.channelNames = parseResults.meta.fields
                })
            )
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
        return action((x: {label: string, value: string}) => {
            this.channelMarker[name] = x.value
        })
    }


    @action selectFile = (fName: string) => {
        this.selectedFile = fName
        this.updateImageData()
    }
     
}



