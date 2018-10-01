export interface PixelLocation {
    x: number,
    y: number,
}

export interface ImageSelection {
    id: string
    // The coordinates of the selected region. In PIXI polygon format [x1, y1, x2, y2, ...]
    selectedRegion: number[]|null
    selectedSegments: number[]
    name: string
    notes: string | null
    color: number
    visible: boolean
}

export interface ImageDataObject   {
    [key: string] : Float32Array | Uint16Array
}

export interface MinMax {
    min: number
    max: number
}