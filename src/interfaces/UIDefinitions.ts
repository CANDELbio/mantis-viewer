import { observable } from "mobx"

export type ChannelName = "rChannel" | "gChannel" | "bChannel"
export type D3BrushExtent = [[number, number], [number, number]]
export type BrushEventHandler = ((extent: D3BrushExtent) => void)
export type SelectOption = {label: string, value: string}

export const PlotStatisticOptions = [
    {label: "Median", value: "median"},
    {label: "Mean", value: "mean"}
]

export type PlotStatistic = "mean" | "median"

export const PlotTransformOptions = [
    {label: "No Tranformation", value: "none"},
    {label: "ArcSinh", value: "arcsinh"},
    {label: "Log10", value: "log"},
]

export const SelectedRegionAlpha = 0.3
export const HighlightedSelectedRegionAlpha = 0.5
export const SelectedSegmentOutlineAlpha = 0.7
export const HighlightedSelectedSegmentOutlineAlpha = 1.0
export const SelectedSegmentOutlineWidth = 2.0
export const SegmentOutlineWidth = 1.0 // For all segments
export const DefaultSegmentOutlineAlpha = 1.0
export const UnselectedCentroidColor = 0xf1c40f // yellow
export const SelectedCentroidColor = 0xffffff // white
export const DefaultSelectedRegionColor = 0xf1c40f // yellow
export const SegmentOutlineColor = 0xffffff // white
export const HighlightedSegmentOutlineColor = 0xff0000 // red

export type PlotTransform = "none" | "arcsinh" | "log"

export class LabelLayer {
    @observable name:string
    @observable visible: boolean

    width: number
    height: number
    data: Uint8ClampedArray

}
