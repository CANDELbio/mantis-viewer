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
export const UnselectedCentroidColor = 0xf1c40f // yellow
export const SelectedCentroidColor = 0xffffff // white

export type PlotTransform = "none" | "arcsinh" | "log"

/*
export interface LabelLayer {
    name: string
    width: number
    height: number
    data: Uint8ClampedArray
}*/

export class LabelLayer {
    @observable name:string
    @observable visible: boolean

    width: number
    height: number
    data: Uint8ClampedArray

}
