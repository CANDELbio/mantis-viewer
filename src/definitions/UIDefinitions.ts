export type ChannelName = 'rChannel' | 'gChannel' | 'bChannel' | 'cChannel' | 'mChannel' | 'yChannel' | 'kChannel'
// Order is important in this list. This is used for the render order on the stage.
// k (white/black) must be rendered first, otherwise other channels will not be visible.
export const ImageChannels: ChannelName[] = [
    'kChannel',
    'yChannel',
    'mChannel',
    'cChannel',
    'bChannel',
    'gChannel',
    'rChannel',
]

export const ChannelColorMap: Record<ChannelName, number> = {
    rChannel: 0xff0000,
    gChannel: 0x00ff00,
    bChannel: 0x0000ff,
    cChannel: 0x00ffff,
    mChannel: 0xff00ff,
    yChannel: 0xffff00,
    kChannel: 0xffffff,
}

export type D3BrushExtent = [[number, number], [number, number]]
export type BrushEventHandler = (extent: D3BrushExtent) => void

export interface SelectOption {
    label: string
    value: string
}

export const PlotStatisticOptions = [{ label: 'Median', value: 'median' }, { label: 'Mean', value: 'mean' }]

export type PlotStatistic = 'mean' | 'median'

export const PlotTypeOptions = [
    { label: 'Scatter Plot', value: 'scatter' },
    { label: 'Contour Plot', value: 'contour' },
    { label: 'Histogram', value: 'histogram' },
    { label: 'Heatmap', value: 'heatmap' },
]

export type PlotType = 'scatter' | 'histogram' | 'heatmap' | 'contour'

export const PlotTransformOptions = [
    { label: 'No Tranformation', value: 'none' },
    { label: 'ArcSinh', value: 'arcsinh' },
    { label: 'Log10', value: 'log' },
]

export type PlotTransform = 'none' | 'arcsinh' | 'log'

export const PlotNormalizationOptions = [
    { label: 'No Normalization', value: 'none' },
    { label: 'Normalize per Population', value: 'population' },
    { label: 'Normalize per Marker', value: 'marker' },
]

export type PlotNormalization = 'none' | 'population' | 'marker'

export const ImageViewerHeightPadding = 40
export const MainPlotHeightPadding = 350 // Amount of padding above the plot in the main window.
export const ExternalPlotHeightPadding = 50 // Amount of padding above the plot in the external window.
export const SelectedRegionAlpha = 0.4
export const HighlightedSelectedRegionAlpha = 0.6
export const SelectedSegmentOutlineAlpha = 0.7
export const HighlightedSelectedSegmentOutlineAlpha = 1.0
export const SelectedSegmentOutlineWidth = 2.0
export const SegmentOutlineWidth = 1.0 // For all segments
export const DefaultSegmentOutlineAlpha = 0.7
export const DefaultSegmentFillAlpha = 0.0
export const DefaultCentroidsVisible = false
export const UnselectedCentroidColor = 0xf1c40f // yellow
export const SelectedCentroidColor = 0xffffff // white
export const SegmentOutlineColor = 0xffffff // white
export const HighlightedSegmentOutlineColor = 0xff0000 // red
export const PlotMinDotSize = 1
export const DefaultDotSize = 2
export const PlotMaxDotSize = 10

// Prefixes for new populations selected from graph or image.
export const GraphSelectionPrefix = 'Graph'
export const ImageSelectionPrefix = 'Image'

export const ImageSettingsFilename = '.mantisImageSettings'

// Combined height of the leftmost pannel when channel and segmentation are both open.
// If this ends up being different on differnt OSes or we are restyling often, might be better to use sizeme instead
export const ChannelControlsCombinedHeight = 1000
