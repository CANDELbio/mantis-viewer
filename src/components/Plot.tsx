// Draws some inspiration from https://github.com/davidctj/react-plotlyjs-ts
// Might be able to use this in the future or to make this component more React-y
import * as React from 'react'
import * as _ from 'underscore'
import Select from 'react-select'
import { observer } from 'mobx-react'
import * as Plotly from 'plotly.js'

import { PlotData } from '../interfaces/DataInterfaces'
import { DefaultSelectionName } from '../definitions/PlotDefinitions'
import { SelectOption, PlotStatistic, PlotTransform, PlotType, PlotTypeOptions } from '../definitions/UIDefinitions'
import {
    PlotStatisticOptions,
    PlotTransformOptions,
    PlotNormalizationOptions,
    PlotNormalization,
} from '../definitions/UIDefinitions'

export interface ScatterPlotProps {
    channelSelectOptions: { value: string; label: string }[]
    selectedPlotChannels: string[]
    setSelectedPlotChannels: (x: string[]) => void
    selectedStatistic: string
    setSelectedStatistic: (x: PlotStatistic) => void
    selectedTransform: string
    setSelectedTransform: (x: PlotTransform) => void
    selectedType: string
    setSelectedType: (x: PlotType) => void
    selectedNormalization: string
    setSelectedNormalization: (x: PlotNormalization) => void
    setSelectedSegments: (selectedSegments: number[]) => void
    setSelectedRange: (min: number, max: number) => void
    setHoveredSegments: (selectedSegments: number[]) => void
    plotData: PlotData | null
    windowWidth: number | null
}

@observer
export class Plot extends React.Component<ScatterPlotProps, {}> {
    public container: Plotly.PlotlyHTMLElement | null = null

    public constructor(props: ScatterPlotProps) {
        super(props)
    }

    private channelSelectOptions: { value: string; label: string }[]

    private onPlotChannelSelect = (x: SelectOption[]) => this.props.setSelectedPlotChannels(_.pluck(x, 'value'))
    private onStatisticSelect = (x: SelectOption) => {
        if (x != null) this.props.setSelectedStatistic(x.value as PlotStatistic)
    }
    private onTransformSelect = (x: SelectOption) => {
        if (x != null) this.props.setSelectedTransform(x.value as PlotTransform)
    }
    private onTypeSelect = (x: SelectOption) => {
        if (x != null) this.props.setSelectedType(x.value as PlotType)
    }
    private onNormalizationSelect = (x: SelectOption) => {
        if (x != null) this.props.setSelectedNormalization(x.value as PlotNormalization)
    }
    private onPlotSelected = (data: Plotly.PlotSelectionEvent) => {
        if (this.props.selectedType == 'scatter') this.props.setSelectedSegments(this.parseScatterEvent(data))
        if (this.props.selectedType == 'histogram') {
            let { min, max } = this.parseHistogramEvent(data)
            if (min != null && max != null) this.props.setSelectedRange(min, max)
        }
    }
    private onHover = (data: Plotly.PlotSelectionEvent) => {
        if (this.props.selectedType == 'scatter') this.props.setHoveredSegments(this.parseScatterEvent(data))
    }
    private onUnHover = () => this.props.setHoveredSegments([])

    public componentWillUnmount(): void {
        this.cleanupPlotly()
    }

    // Data comes from a Plotly event.
    // Points are the selected points.
    // No custom fields, so we are getting the segment id from the title text for the point.
    // Title text with segment id generated in ScatterPlotData.
    private parseScatterEvent(data: Plotly.PlotSelectionEvent): number[] {
        let selectedSegments: number[] = []
        if (data != null) {
            if (data.points != null && data.points.length > 0) {
                for (let point of data.points) {
                    let pointRegionName = point.data.name
                    // Check if the region name for the point is the default selection name
                    // Sometimes plotly returns incorrect selected points if there are multiple selections
                    // and the point being hovered/highlighted isn't in some of those selections.
                    if (pointRegionName == DefaultSelectionName) {
                        // @ts-ignore: Plotly ts declaration doesn't have text on points, but it is there.
                        let pointText = point.text
                        if (pointText) {
                            let splitText: string[] = pointText.split(' ')
                            let segmentId = Number(splitText[splitText.length - 1])
                            selectedSegments.push(segmentId)
                        }
                    }
                }
            }
        }
        return selectedSegments
    }

    private parseHistogramEvent(data: Plotly.PlotSelectionEvent): { min: null | number; max: null | number } {
        let minMax: { min: null | number; max: null | number } = { min: null, max: null }
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

    private mountPlot = async (el: HTMLElement | null) => {
        if (el != null && this.props.plotData != null) {
            let firstRender = this.container == null
            this.container = await Plotly.react(el, this.props.plotData.data, this.props.plotData.layout)
            // Resize the plot to fit the container
            // Might need to remove. Seems that if this fires too much can cause weirdness with WebGL contexts.
            Plotly.Plots.resize(this.container)
            // Adding listeners for plotly events. Not doing this during componentDidMount because the element probably doesn't exist.
            if (firstRender) {
                this.container.on('plotly_selected', this.onPlotSelected)
                this.container.on('plotly_hover', this.onHover)
                this.container.on('plotly_unhover', this.onUnHover)
            }
        }
    }

    public render(): React.ReactNode {
        // TODO: Feels a bit hacky. Find a better solution.
        // Dereferencing here so we re-render on resize
        let windowWidth = this.props.windowWidth

        this.channelSelectOptions = this.props.channelSelectOptions

        // Can only select two channels for a scatter plot or one for histogram.
        // If max channels are selected, set the options for selecting equal to the currently selected options
        let maximumScatterChannelsSelected =
            this.props.selectedPlotChannels.length == 2 && this.props.selectedType == 'scatter'
        let maximumHistogramChannelsSelected =
            this.props.selectedPlotChannels.length == 1 && this.props.selectedType == 'histogram'
        if (maximumScatterChannelsSelected || maximumHistogramChannelsSelected) {
            this.channelSelectOptions = this.props.selectedPlotChannels.map(s => {
                return { value: s, label: s }
            })
        }

        // Clear the plot element if we don't have scatterPlot data.
        let channelControls = null
        let plot = null
        let statisticControls = null
        let transformControls = null
        let normalizationControls = null

        if (this.props.selectedType != 'heatmap') {
            channelControls = (
                <div>
                    <div>Plot Channels</div>
                    <Select
                        value={this.props.selectedPlotChannels}
                        options={this.channelSelectOptions}
                        onChange={this.onPlotChannelSelect}
                        multi={true}
                    />
                </div>
            )
        }
        if (this.props.plotData != null) {
            statisticControls = (
                <Select
                    value={this.props.selectedStatistic}
                    options={PlotStatisticOptions}
                    onChange={this.onStatisticSelect}
                    clearable={false}
                />
            )

            transformControls = (
                <Select
                    value={this.props.selectedTransform}
                    options={PlotTransformOptions}
                    onChange={this.onTransformSelect}
                    clearable={false}
                />
            )

            if (this.props.selectedType == 'heatmap') {
                normalizationControls = (
                    <Select
                        value={this.props.selectedNormalization}
                        options={PlotNormalizationOptions}
                        onChange={this.onNormalizationSelect}
                        clearable={false}
                    />
                )
            }

            plot = <div id="plotly-scatterplot" ref={el => this.mountPlot(el)} />
        } else {
            this.cleanupPlotly()
        }

        return (
            <div>
                <div>Plot Type</div>
                <Select
                    value={this.props.selectedType}
                    options={PlotTypeOptions}
                    onChange={this.onTypeSelect}
                    clearable={false}
                />
                {channelControls}
                {plot}
                {statisticControls}
                {transformControls}
                {normalizationControls}
            </div>
        )
    }
}
