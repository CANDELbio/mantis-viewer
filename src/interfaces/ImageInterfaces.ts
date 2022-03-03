import { ChannelName } from '../definitions/UIDefinitions'

export interface Coordinate {
    x: number
    y: number
}

export interface TiffDataMap {
    [key: string]: Float32Array | Uint16Array | Uint8Array
}

export interface MinMax {
    min: number
    max: number
}

export interface MinMaxMap {
    [key: string]: MinMax
}

export interface BitmapMap {
    [key: string]: ImageBitmap
}

export interface RGBColor {
    r: number
    g: number
    b: number
}

export interface RGBColorCollection {
    [key: string]: RGBColor
}

export type ChannelMarkerMapping = {
    [key in ChannelName]: string | null
}
