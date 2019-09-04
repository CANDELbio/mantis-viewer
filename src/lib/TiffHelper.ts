import * as fs from 'fs'

// Importing from a file for now. This package is available on npm, but hasn't been updated in a few months.
// The newest version on github supports a compression format that a user requested support for.
//@ts-ignore
import GeoTIFF = require('../modules/geotiff.bundle.min.js')

// If any dimension is over maxWidthHeight, we scale it proportionally so the max dimension is equal to scaledWidthHeight.
// Images in the 10000-12000 width/height range seem to load fine, but GeoTiff returned a black image when attempting to
// scale to the 10k range. So dropped what we scale to down a bit below 10k.
const maxWidthHeight = 10000.0
const scaledWidthHeight = 8000.0

function scaleWidthAndHeight(width: number, height: number): { width: number; height: number } {
    let maxDimension = width > height ? width : height
    if (maxDimension > maxWidthHeight) {
        //TODO: Notify user in UI that image has been scaled
        console.log('Image too large. Scaling image')
        let scaleFactor = maxDimension / scaledWidthHeight
        return { width: Math.round(width / scaleFactor), height: Math.round(height / scaleFactor) }
    }
    return { width: width, height: height }
}

export async function readTiffData(filepath: string): Promise<{ data: any; width: number; height: number }> {
    let rawData = fs.readFileSync(filepath)
    let tiff = await GeoTIFF.fromArrayBuffer(rawData.buffer)

    let image = await tiff.getImage()

    let rasterOptions = scaleWidthAndHeight(image.getWidth(), image.getHeight())

    let data = await image.readRasters(rasterOptions)

    return { data: data[0], width: data.width, height: data.height }
}
