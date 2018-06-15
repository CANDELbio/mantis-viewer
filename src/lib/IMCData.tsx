import * as _ from "underscore"
import * as fs from "fs"
import * as path from "path"
import {promisify} from 'util';

const tiff = require("tiff")

interface IMCDataStats {
    X: [number, number]
    Y: [number, number]
    [key: string] : [number, number]
}


export interface IMCDataObject   {
    X: Float32Array | Uint16Array
    Y: Float32Array | Uint16Array
    [key: string] : Float32Array | Uint16Array
}

export type IMCDataInputType = "txt" | "TIFF" | "folder"

export class IMCData {

    data:IMCDataObject
    sortedData:IMCDataObject
    stats: IMCDataStats

    width: number
    height: number

    get channelNames() : string[] {
        return(_.keys(this.data))
    }

    private calculateStats(fName:string, lines: string[]) {
        let lineNumber = 0
        let colNames: string[] = []

        while(lineNumber < lines.length) {
            let line = lines[lineNumber]
            let fields = line.split("\t")
            if (lineNumber == 0) {
                colNames = fields
            } else if (lineNumber == 1) {
                fields.forEach((x, i) => {
                    let f = parseFloat(x)
                    this.stats[colNames[i]] = [f, f]
                })
            } else {
                fields.forEach((x, i) => {
                    let f = parseFloat(x)
                    let col = colNames[i]
                    if (f < this.stats[col][0])
                        this.stats[col][0] = f
                    if (f > this.stats[col][1])
                        this.stats[col][1] = f
                })

            }
            ++lineNumber
        }
    }

    private loadFolder(dirName:string) {
        let files = fs.readdirSync(dirName)

        let lineNumber = 0
        let colNames: string[] = []
        let xIdx = 0
        let yIdx = 0

        console.log(files)
        
        files.forEach(f => {
            let data = fs.readFileSync(path.join(dirName, f))
            let chName = path.basename(f, ".tiff")
            let tiffData = tiff.decode(data)[0]
            this.data[chName] = tiffData.data
            this.width = tiffData.width
            this.height = tiffData.height
        })
        console.log("###")
        console.log(this.data)
        return null

    }

    private loadTIFF(fName:string) {}

    private loadTxtFile(fName: string) {
        let lineNumber = 0
        let colNames: string[] = []
        let xIdx = 0
        let yIdx = 0

        let lines = fs.readFileSync(fName, 'utf-8')
            .split("\n")
        this.calculateStats(fName, lines)

        while(lineNumber < lines.length) {
            let line = lines[lineNumber]
            let fields = line.split("\t")
            if(lineNumber == 0) {
                colNames = fields
                xIdx = colNames.findIndex((s) => {return(s == "X")})
                yIdx = colNames.findIndex((s) => {return(s == "Y")})
                let nRows = (this.stats.X[1] + 1) * (this.stats.Y[1] + 1)
                colNames.forEach((s) => {
                    //console.log("Allocating object of size ", Float32Array.BYTES_PER_ELEMENT * nRows)
                    //console.log("Total number of rows", nRows)
                    let buf = new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT * nRows)
                    this.data[s] = new Float32Array(buf)
                })
            } else {
                let v = fields.map(parseFloat)
                let X = Math.trunc(v[xIdx])
                let Y = Math.trunc(v[yIdx])
                let maxX = this.stats.X[1]
                let idx = (Y * ((maxX) + 1)) + X

                v.forEach((x, i) => {
                    let col = colNames[i]
                    this.data[col][idx] = x
                })

            }

            ++lineNumber
        }
        
        _.mapObject(this.data, (val, key) => {
            this.sortedData[key] = val.slice().sort((a, b) => a - b)
        })
    }

    constructor(path:string, inputType:IMCDataInputType) {
        this.stats = {X:[0, 0], Y:[0, 0]}
        this.data = {X: new Float32Array(0), Y: new Float32Array(0)}
        this.sortedData = {X: new Float32Array(0), Y: new Float32Array(0)}

        switch(inputType) {
            case("txt"):
                this.loadTxtFile(path)
                break
            case("TIFF"):
                this.loadTIFF(path)
                break
            case("folder"):
                this.loadFolder(path)
                break
        }


    }




    
}