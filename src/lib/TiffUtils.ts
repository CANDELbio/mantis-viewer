import * as GeoTIFF from 'geotiff'

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
): { scaled: boolean; rasterOptions: { width: number; height: number; interleave: boolean } } {
    const maxDimension = width > height ? width : height
    if (maxDimension > maxWidthHeight) {
        const scaleFactor = maxDimension / scaledWidthHeight
        return {
            scaled: true,
            rasterOptions: {
                width: Math.round(width / scaleFactor),
                height: Math.round(height / scaleFactor),
                interleave: true,
            },
        }
    }
    return { scaled: false, rasterOptions: { width: width, height: height, interleave: true } }
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
        data: data,
        width: scaleResults.rasterOptions.width,
        height: scaleResults.rasterOptions.height,
        scaled: scaleResults.scaled,
        numImages: numImages,
        imageDescription: imageDescription,
    }
}
