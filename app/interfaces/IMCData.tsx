import * as _ from "underscore"

interface IMCDataStats {
    [key: string] : [number, number]
}


export interface IMCDataObject   {
    X: number[]
    Y: number[]
    [key: string] : number[]
}

export class IMCData {

    data:IMCDataObject = {X:[], Y:[]}
    sortedData:IMCDataObject = {X:[], Y:[]}
    stats: IMCDataStats = {}

    get channelNames() : string[] {
        return(_.keys(this.data))
    }

}