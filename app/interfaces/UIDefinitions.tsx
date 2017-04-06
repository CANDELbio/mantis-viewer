export type ChannelName = "rChannel" | "gChannel" | "bChannel"
export type D3BrushExtent = [[number, number], [number, number]]
export type BrushEventHandler = ((extent: D3BrushExtent) => void)