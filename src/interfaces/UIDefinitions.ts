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

export const PlotTypeOptions = [
    {label: "Scatter Plot", value: "scatter"},
    {label: "Histogram", value: "histogram"},
    {label: "Heatmap", value: "heatmap"},
]

export type PlotType = "scatter" | "histogram" | "heatmap"

export const PlotTransformOptions = [
    {label: "No Tranformation", value: "none"},
    {label: "ArcSinh", value: "arcsinh"},
    {label: "Log10", value: "log"},
]

export type PlotTransform = "none" | "arcsinh" | "log"

export const PlotNormalizationOptions = [
    {label: "No Normalization", value: "none"},
    {label: "Normalize per Population", value: "population"},
    {label: "Normalize per Marker/Channel", value: "marker"},
]

export type PlotNormalization = "none" | "population" | "marker"

export const WindowHeightBufferSize = 40
export const SelectedRegionAlpha = 0.4
export const HighlightedSelectedRegionAlpha = 0.6
export const SelectedSegmentOutlineAlpha = 0.7
export const HighlightedSelectedSegmentOutlineAlpha = 1.0
export const SelectedSegmentOutlineWidth = 2.0
export const SegmentOutlineWidth = 1.0 // For all segments
export const DefaultSegmentOutlineAlpha = 1.0
export const UnselectedCentroidColor = 0xf1c40f // yellow
export const SelectedCentroidColor = 0xffffff // white
export const SegmentOutlineColor = 0xffffff // white
export const HighlightedSegmentOutlineColor = 0xff0000 // red

export class LabelLayer {
    @observable name:string
    @observable visible: boolean

    width: number
    height: number
    data: Uint8ClampedArray

}
