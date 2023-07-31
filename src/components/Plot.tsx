// Draws some inspiration from https://github.com/davidctj/react-plotlyjs-ts
// Might be able to use this in the future or to make this component more React-y
import { observer } from 'mobx-react'
import * as Plotly from 'plotly.js'
import * as React from 'react'
import { SizeMe } from 'react-sizeme'

import { PlotType } from '../definitions/UIDefinitions'
import { PlotData } from '../interfaces/DataInterfaces'

interface PlotProps {
    selectedType: PlotType
    setSelectedSegments: (selectedSegments: number[]) => void
    setSelectedRange: (min: number, max: number) => void
    setHoveredSegments: (selectedSegments: number[]) => void
    updateHiddenPopulation: (populationName: string) => void
    hiddenPopulations: string[]
    plotData: PlotData | null
    windowWidth: number | null
    maxPlotHeight: number | null
    downsample: boolean
}

interface PlotState {
    popoverOpen: boolean
}

@observer
export class Plot extends React.Component<PlotProps, PlotState> {
    public container: Plotly.PlotlyHTMLElement | null = null

    public constructor(props: PlotProps) {
        super(props)
    }

    public state = {
        popoverOpen: false, // TODO: Delete when removing popover
    }

    private onPlotSelected = (data: Plotly.PlotSelectionEvent): void => {
        if (
            (this.props.selectedType == 'scatter' || this.props.selectedType == 'contour') &&
            (data.range || data.lassoPoints)
        )
            this.props.setSelectedSegments(this.parseScatterEvent(data))
        if (this.props.selectedType == 'histogram') {
            const { min, max } = this.parseHistogramEvent(data)
            if (min != null && max != null) this.props.setSelectedRange(min, max)
        }
    }
    private onHover = (data: Plotly.PlotSelectionEvent): void => {
        if (this.props.selectedType == 'scatter') {
            const rawSegments = this.parseScatterEvent(data)
            const highlightedSegments = []
            if (rawSegments.length > 0) highlightedSegments.push(rawSegments[0])
            this.props.setHoveredSegments(highlightedSegments)
        }
    }
    private onUnHover = (): void => this.props.setHoveredSegments([])

    private onLegendClick = (data: Plotly.LegendClickEvent): boolean => {
        const curveNumber = data.curveNumber
        const curveName = data.data[curveNumber].name
        if (curveName) this.props.updateHiddenPopulation(curveName)
        return false
    }

    public componentWillUnmount(): void {
        this.cleanupPlotly()
    }

    // Data comes from a Plotly event.
    // Points are the selected points.
    // No custom fields, so we are getting the segment id from the title text for the point.
    // Title text with segment id generated in ScatterPlotData.
    private parseScatterEvent(data: Plotly.PlotSelectionEvent): number[] {
        const selectedSegments: number[] = []
        if (data != null) {
            if (data.points != null) {
                for (const point of data.points) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore: Plotly ts declaration doesn't have text on points, but it is there.
                    const pointText = point.text
                    if (pointText) {
                        const splitText: string[] = pointText.split(' ')
                        const segmentId = Number(splitText[splitText.length - 1])
                        if (!selectedSegments.includes(segmentId)) selectedSegments.push(segmentId)
                    }
                }
            }
        }
        return selectedSegments
    }

    private parseHistogramEvent(data: Plotly.PlotSelectionEvent): { min: null | number; max: null | number } {
        const minMax: { min: null | number; max: null | number } = { min: null, max: null }
        if (data != null) {
            if (data.range != null) {
                minMax.min = Math.min(...data.range.x)
                minMax.max = Math.max(...data.range.x)
            } else if (data.lassoPoints != null) {
                minMax.min = Math.min(...data.lassoPoints.x)
                minMax.max = Math.max(...data.lassoPoints.x)
            }
        }
        return minMax
    }

    private cleanupPlotly(): void {
        if (this.container) {
            Plotly.purge(this.container)
            this.container = null
        }
    }

    private mountPlot = async (
        el: HTMLElement | null,
        width: number | null,
        height: number | null,
        plotData: PlotData,
        hiddenPopulations: string[],
    ): Promise<void> => {
        if (el != null) {
            const firstRender = this.container == null
            const layoutWithSize = plotData.layout
            const config: Partial<Plotly.Config> = {}
            // Setting any hidden populations as hidden, and all visible as visible.
            plotData.data.forEach((curve: Partial<Plotly.PlotData>): Partial<Plotly.PlotData> => {
                const populationName = curve.name
                if (populationName && hiddenPopulations.includes(populationName)) {
                    curve.visible = 'legendonly'
                } else {
                    curve.visible = true
                }
                return curve
            })

            if (width != null && height != null) {
                layoutWithSize.width = width
                layoutWithSize.height = height
            }

            if (this.props.selectedType == 'histogram') config['modeBarButtonsToRemove'] = ['lasso2d']

            if (this.props.selectedType == 'heatmap' || this.props.downsample)
                config['modeBarButtonsToRemove'] = ['lasso2d', 'select2d']

            this.container = await Plotly.react(el, plotData.data, layoutWithSize, config)
            // Resize the plot to fit the container
            // Might need to remove. Seems that if this fires too much can cause weirdness with WebGL contexts.
            Plotly.Plots.resize(this.container)
            // Adding listeners for plotly events. Not doing this during componentDidMount because the element probably doesn't exist.
            if (firstRender) {
                this.container.on('plotly_selected', this.onPlotSelected)
                this.container.on('plotly_hover', this.onHover)
                this.container.on('plotly_unhover', this.onUnHover)
                this.container.on('plotly_legendclick', this.onLegendClick)
            }
        }
    }

    public render(): React.ReactNode {
        // TODO: Feels a bit hacky. Find a better solution.
        // Dereferencing here so we re-render on resize
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const windowWidth = this.props.windowWidth
        const maxPlotHeight = this.props.maxPlotHeight
        const plotData = this.props.plotData
        const hiddenPopulations = this.props.hiddenPopulations

        let plot = null

        // If plot data is unset, cleanup Plotly
        if (!plotData) {
            this.cleanupPlotly()
        } else {
            plot = (
                <SizeMe monitorWidth={true}>
                    {({ size }): React.ReactElement => (
                        <div
                            id="plotly-scatterplot"
                            ref={(el): Promise<void> =>
                                this.mountPlot(el, size.width, maxPlotHeight, plotData, hiddenPopulations)
                            }
                        />
                    )}
                </SizeMe>
            )
        }

        return plot
    }
}
