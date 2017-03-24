import { observable, computed, action, autorun, createTransformer } from "mobx"
import Jimp = require("jimp")
import * as fs from "fs"
import * as Papa from "papaparse"
import { IMCData, IMCDataStats } from "../interfaces/IMCData"
import * as _ from "underscore"
import * as d3 from "d3-array"

export class ImageStore {
    @observable value: number = 5

    @observable selectedFile: string | null
    @observable.ref imageData: IMCData | null
    @observable.ref imageStats: IMCDataStats | null
    @observable channelNames: string[] | null = null
    @observable rChannel:string | undefined
    @observable gChannel:string | undefined
    @observable bChannel:string | undefined

    @observable rChannelDomain: [number, number] = [0, 100]

    @observable temp: [number, number] 


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
                    console.log(this.imageData![0])
                    console.log(this.imageStats)
                })
            )
    }

    
    @action setValue = (x: number) => {
        this.value = x
    }

    @action setRChannelDomain = (x: [number, number]) => {
        this.rChannelDomain = x
    }

    @action setRChannel = (x: {label: string, value: string}) => {
        this.rChannel = x.value
    }

    @action selectFile = (fName: string) => {
        this.selectedFile = fName
        this.updateImageData()
    }
     
    @action setTemp = (x:[number, number]) => {
        this.temp = x
    }



    /*
    Alternative implementation using computed-async-mobx 
    imageData = computedAsync(null, async () => {
        if(this.selectedFile != null) {
            return(await Jimp.read(this.selectedFile))
        }
        else 
            return(null)
    })*/
}



