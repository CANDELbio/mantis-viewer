import { PlotStatistic } from '../definitions/UIDefinitions'
import { MinMax, PixelLocation } from './ImageInterfaces'

export interface ImageDataWorkerResult {
    chName: string
    width: number
    height: number
    data: Float32Array | Uint16Array | Uint8Array
    bitmap: ImageBitmap
    minmax: MinMax
}

export interface ImageDataWorkerError {
    error: string
    chName: string
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
    fillBitmap: ImageBitmap
}

export interface SegmentationStatisticWorkerResult {
    chName: string
    // Map of channel/marker names plus segment id (channel_segmentid) the median intensity for that channel and segment
    statistic: PlotStatistic
    // Map of channel/marker names plus segment id (channel_segmentid) the median intensity for that channel and segment
    map: Record<string, number>
    minmax: MinMax
}
