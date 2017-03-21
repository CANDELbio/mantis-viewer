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
    @observable.ref imageData: IMCData[] | null = null
    @observable channelNames: string[] | null = null
    @observable rChannel:string | undefined
    @observable gChannel:string | undefined
    @observable bChannel:string | undefined

    @observable rChannelDomain: [number, number] = [0, 100]

    @computed get imageStats() {
        console.log("calclating stats")
        if(this.imageData != null && this.channelNames != null) {
            let ret:IMCDataStats = {}
            //Highly inefficient this can be done in a single pass
            this.channelNames.forEach((s) => {
                let v = d3.extent(this.imageData!, (d) => {
                    return(d[s])
                })
                // Necessary because of typescript null elimination mechanism
                if(v[0] != null && v[1] != null)
                    ret[s] = [v[0]!, v[1]!]

            })
            return(ret)
        }
        else
            return({})
    }


    @action parseData(d:PapaParse.ParseResult) {
        
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
                    this.imageData = parseResults.data
                    this.channelNames = parseResults.meta.fields
                    console.log(this.imageData[0])
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



