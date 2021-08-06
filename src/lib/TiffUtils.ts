// Importing from a file for now. This package is available on npm, but hasn't been updated in a few months.
// The newest version on github supports a compression format that a user requested support for.
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
//@ts-ignore
import GeoTIFF = require('geotiff')

// If any dimension is over maxWidthHeight, we scale it proportionally so the max dimension is equal to scaledWidthHeight.
// Images in the 10000-12000 width/height range seem to load fine, but GeoTiff returned a black image when attempting to
// scale to the 10k range. So dropped what we scale to down a bit below 10k.
const maxWidthHeight = 10300.0
const scaledWidthHeight = 8000.0

export interface TiffData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any
    imageDescription: string
    width: number
    height: number
    scaled: boolean
    numImages: number
}

function scaleWidthAndHeight(
    width: number,
    height: number,
): { scaled: boolean; rasterOptions: { width: number; height: number } } {
    const maxDimension = width > height ? width : height
    if (maxDimension > maxWidthHeight) {
        const scaleFactor = maxDimension / scaledWidthHeight
        return {
            scaled: true,
            rasterOptions: { width: Math.round(width / scaleFactor), height: Math.round(height / scaleFactor) },
        }
    }
    return { scaled: false, rasterOptions: { width: width, height: height } }
}

export async function readTiffData(filepath: string, imageNumber: number): Promise<TiffData> {
    const tiff = await GeoTIFF.fromFile(filepath)

    const numImages = await tiff.getImageCount()
    const image = await tiff.getImage(imageNumber)
    const imageDescription = image.fileDirectory.ImageDescription as string

    const scaleResults = scaleWidthAndHeight(image.getWidth(), image.getHeight())

    const data = await image.readRasters(scaleResults.rasterOptions)

    tiff.close()

    return {
        data: data[0],
        width: data.width,
        height: data.height,
        scaled: scaleResults.scaled,
        numImages: numImages,
        imageDescription: imageDescription,
    }
}
