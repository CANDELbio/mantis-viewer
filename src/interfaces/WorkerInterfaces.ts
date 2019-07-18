import { PlotStatistic } from '../definitions/UIDefinitions'
import { MinMax, PixelLocation } from './ImageInterfaces'

export interface ImageDataWorkerResult {
    markerName: string
    width: number
    height: number
    data: Float32Array | Uint16Array | Uint8Array
    bitmap: ImageBitmap
    minmax: MinMax
}

export interface ImageDataWorkerError {
    error: string
    markerName: string
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
    markerName: string
    // Map of marker/marker names plus segment id (marker_segmentid) the median intensity for that marker and segment
    statistic: PlotStatistic
    // Map of marker/marker names plus segment id (marker_segmentid) the median intensity for that marker and segment
    map: Record<string, number>
    minmax: MinMax
}
