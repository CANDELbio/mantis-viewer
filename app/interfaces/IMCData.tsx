interface IMCDataStats {
    [key: string] : [number, number]
}


interface IMCDataObject   {
    X: number[]
    Y: number[]
    [key: string] : number[]
}

export class IMCData {

    data:IMCDataObject = {X:[], Y:[]}
    sortedData:IMCDataObject = {X:[], Y:[]}
    stats: IMCDataStats = {}
    channelNames: string[] = []

}