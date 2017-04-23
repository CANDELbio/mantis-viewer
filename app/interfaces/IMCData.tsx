import * as _ from "underscore"
import * as readline from "readline"
import * as fs from "fs"
//const readlines = (require("n-readlines"))

interface IMCDataStats {
    X: [number, number]
    Y: [number, number]
    [key: string] : [number, number]
}


export interface IMCDataObject   {
    X: Float32Array
    Y: Float32Array
    [key: string] : Float32Array
}

export class IMCData {

    data:IMCDataObject
    sortedData:IMCDataObject
    stats: IMCDataStats

    get channelNames() : string[] {
        return(_.keys(this.data))
    }

    private calculateStats(fName:string) {
        let lineNumber = 0
        let colNames: string[] = []
        const rl = readline.createInterface({
            input: fs.createReadStream(fName)
        })
        
        rl.on('line', (line: string) => {
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
        })
    }

    constructor(fName: string) {
        this.stats = {X:[0, 0], Y:[0, 0]}

        this.calculateStats(fName)
        let lineNumber = 0
        let colNames: string[] = []
        let xIdx = 0
        let yIdx = 0

        const rl = readline.createInterface({
            input: fs.createReadStream(fName)
        })

        rl.on('line', (line: string) => {
            let fields = line.split("\t")
            if(lineNumber == 0) {
                colNames = fields
                xIdx = colNames.findIndex((s) => {return(s == "X")})
                yIdx = colNames.findIndex((s) => {return(s == "Y")})
                let nRows = (this.stats.X[1] + 1) * (this.stats.Y[1] + 1)
                colNames.forEach((s) => {
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
        })

        _.mapObject(this.data, (val, key) => {
            this.sortedData[key] = val.slice().sort((a, b) => a - b)
        })
    }
    
}