import { randomRGBColor } from './ColorHelper'

export function generatePixelMapKey(x: number, y: number): string {
    return x.toString() + '_' + y.toString()
}

// Generates a texture (to be used to create a PIXI sprite) from segmentation data.
// Segmentation data is stored as a tiff where the a pixel has a value of 0 if it does not belong to a cell
// or is a number corresponding to what we're calling the segmentId (i.e. all pixels that belong to cell/segment 1 have a value of 1)
// Generates a texture (to be used to create a PIXI sprite) from segmentation data.
// Segmentation data is stored as a tiff where the a pixel has a value of 0 if it does not belong to a cell
// or is a number corresponding to what we're calling the segmentId (i.e. all pixels that belong to cell/segment 1 have a value of 1)
export async function generateFillBitmap(
    segmentIndexMap: Record<number, number[]>,
    width: number,
    height: number,
): Promise<ImageBitmap> {
    const offScreen = new OffscreenCanvas(width, height)

    const ctx = offScreen.getContext('2d')
    if (ctx) {
        // ctx.clearRect(0, 0, offScreen.width, offScreen.height)
        const imageData = ctx.createImageData(offScreen.width, offScreen.height)
        const canvasData = imageData.data

        // Here we're iterating through the segmentation data and setting all canvas pixels that have no cell as transparent
        // or setting all of the pixels belonging to a cell to the same random color with 50% alpha (transparency)
        for (const segmentId in segmentIndexMap) {
            const color = randomRGBColor()

            for (const pixel of segmentIndexMap[segmentId]) {
                // Get the index on the canvas by multiplying by 4 (i.e. bitshifting by 2)
                const canvasIndex = pixel << 2
                canvasData[canvasIndex] = color['r']
                canvasData[canvasIndex + 1] = color['g']
                canvasData[canvasIndex + 2] = color['b']
                canvasData[canvasIndex + 3] = 255
            }
        }
        ctx.putImageData(imageData, 0, 0)
    }

    const bitmap = await createImageBitmap(offScreen)

    return bitmap
}
