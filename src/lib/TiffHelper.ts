import * as fs from "fs"
import * as UTIF from "utif"

// Converts a Uint8Array to either a Uint16Array or a Float32Array
function convertBinaryArray(v: Uint8Array, destinationBits:number, isLE: boolean){
    if(destinationBits == 8) return v
    if(destinationBits != 16 && destinationBits != 32) throw new Error(destinationBits + ' bit tiff files unsupported');

    let buffer = v.buffer
    let view = new DataView(buffer)
    let results = []
    let bitChangeFactor = destinationBits/8
    let numValues = v.length / bitChangeFactor

    for(let i = 0; i < numValues; ++i) {
        if(destinationBits == 16) results.push(view.getInt16(i*bitChangeFactor, isLE))
        if(destinationBits == 32) results.push(view.getFloat32(i*bitChangeFactor, isLE))
    }

    if(destinationBits == 16){
        return Uint16Array.from(results)
    } else if (destinationBits == 32) {
        return Float32Array.from(results)
    }
}

export function readTiffData(filepath: string){
    //Decode tiff data
    let rawData = fs.readFileSync(filepath)

    let ifds = UTIF.decode(rawData)
    UTIF.decodeImages(rawData, ifds)
    let tiffData = ifds[0]

    let width = tiffData.width
    let height = tiffData.height
    let uint8Data = tiffData.data // utif returns data as a uint8 array
    let isLE = tiffData.isLE // Whether or not the uint8Data array is little-endian
    let imageBits = tiffData.t258[0] // Whether the image in 8-bit, 16-bit, or 32-bit image

    // Data comes back as a Uint8array. If the image is 16-bit or 32-bit we need to convert to the correct bits.
    let data = convertBinaryArray(uint8Data, imageBits, isLE)
    return {data: data, width: width, height: height}
}