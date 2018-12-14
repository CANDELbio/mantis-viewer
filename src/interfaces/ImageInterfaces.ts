export interface PixelLocation {
    x: number,
    y: number,
}

export interface SelectedPopulation {
    id: string
    // The coordinates of the selected region. In PIXI polygon format [x1, y1, x2, y2, ...]
    selectedRegion: number[]|null
    // The IDs of the selected segments
    selectedSegments: number[]
    name: string
    notes: string | null
    color: number
    visible: boolean
}

export interface TiffDataMap   {
    [key: string] : Float32Array | Uint16Array | Uint8Array
}

export interface MinMax {
    min: number
    max: number
}

export interface MinMaxMap {
    [key: string] : MinMax
}

export interface SpriteMap {
    [key:string] : PIXI.Sprite
}

export interface RGBColor {
    r: number,
    g: number,
    b: number
}

export interface RGBColorCollection {
    [key: string] : RGBColor
}

export interface ImageDataWorkerResult {
    chName: string,
    width: number,
    height: number,
    data: Float32Array | Uint16Array | Uint8Array,
    bitmap: ImageBitmap,
    minmax: MinMax
}

export interface SegmentationDataWorkerResult {
    width: number
    height: number
    data: Float32Array | Uint16Array | Uint8Array
    // Mapping of a stringified pixel location (i.e. x_y) to a segmentId
    pixelMap: Record<string, number>
    // Mapping of a segmentId to pixel indices.
    segmentIndexMap: Record<number, number[]>
    // Mapping of a segmentId to pixel locations (x, y)
    segmentLocationMap: Record<number, PixelLocation[]>
    // Mapping of a segmentId to pixel locations (x, y) representing the convex hull
    segmentOutlineMap: Record<number, PixelLocation[]>
    // Mapping of segmentId to the pixel that represents the centroid
    centroidMap: Record<number, PixelLocation>
    // Bitmap of segment fill
    fillBitmap: ImageBitmap,
}