import * as fs from "fs"

// Importing from a file for now. This package is available on npm, but hasn't been updated in a few months.
// The newest version on github supports a compression format that a user requested support for.
const GeoTIFF = require('../modules/geotiff.bundle.min.js')

export async function readTiffData(filepath: string){
    let rawData = fs.readFileSync(filepath)
    let tiff = await GeoTIFF.fromArrayBuffer(rawData.buffer)

    let image = await tiff.getImage()

    let data = await image.readRasters()

    return { data: data[0], width: data.width, height: data.height }
}