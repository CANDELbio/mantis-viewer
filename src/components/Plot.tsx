// Draws some inspiration from https://github.com/davidctj/react-plotlyjs-ts
// Might be able to use this in the future or to make this component more React-y
import * as React from 'react'
import * as _ from 'underscore'
import Select from 'react-select'
import { observer } from 'mobx-react'
import * as Plotly from 'plotly.js'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { Button, Popover, PopoverHeader, PopoverBody } from 'reactstrap'
import { Input } from 'reactstrap'
import { Slider } from '@blueprintjs/core'
import { SizeMe } from 'react-sizeme'

import { PlotData } from '../interfaces/DataInterfaces'
import { DefaultSelectionName } from '../definitions/PlotDefinitions'
import {
    SelectOption,
    PlotStatistic,
    PlotTransform,
    PlotType,
    PlotTypeOptions,
    PlotStatisticOptions,
    PlotTransformOptions,
    PlotNormalizationOptions,
    PlotNormalization,
    PlotMinDotSize,
    PlotMaxDotSize,
} from '../definitions/UIDefinitions'
import { SelectStyle, getSelectedOptions, generateSelectOptions } from '../lib/SelectHelper'

interface PlotProps {
    markers: string[]
    selectedPlotMarkers: string[]
    setSelectedPlotMarkers: (x: string[]) => void
    selectedStatistic: PlotStatistic
    setSelectedStatistic: (x: PlotStatistic) => void
    selectedTransform: PlotTransform
    setSelectedTransform: (x: PlotTransform) => void
    selectedType: PlotType
    setSelectedType: (x: PlotType) => void
    selectedNormalization: string
    setDotSize: (x: number) => void
    dotSize: number
    setTransformCoefficient: (x: number) => void
    transformCoefficient: number | null
    setSelectedNormalization: (x: PlotNormalization) => void
    setSelectedSegments: (selectedSegments: number[]) => void
    setSelectedRange: (min: number, max: number) => void
    setHoveredSegments: (selectedSegments: number[]) => void
    plotData: PlotData | null
    windowWidth: number | null
    maxPlotHeight: number | null
}

interface PlotState {
    popoverOpen: boolean
}

@observer
export class Plot extends React.Component<PlotProps, {}> {
    public container: Plotly.PlotlyHTMLElement | null = null

    public constructor(props: PlotProps) {
        super(props)
    }

    public state = {
        popoverOpen: false, // TODO: Delete when removing popover
    }

    // TODO: Delete when removing popover
    private togglePopover = () => this.setState({ popoverOpen: !this.state.popoverOpen })

    private markerSelectOptions: { value: string; label: string }[]

    private onPlotMarkerSelect = (x: SelectOption[]) => this.props.setSelectedPlotMarkers(_.pluck(x, 'value'))

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

    private onCoefficientSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.props.setTransformCoefficient(event.target.valueAsNumber)
    }

    private onPlotSelected = (data: Plotly.PlotSelectionEvent) => {
        if (this.props.selectedType == 'scatter' || this.props.selectedType == 'contour')
            this.props.setSelectedSegments(this.parseScatterEvent(data))
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

    private mountPlot = async (el: HTMLElement | null, width: number | null, height: number | null) => {
        if (el != null && this.props.plotData != null) {
            let firstRender = this.container == null
            let layoutWithSize = this.props.plotData.layout
            if (width != null && height != null) {
                layoutWithSize.width = width
                layoutWithSize.height = height
            }
            this.container = await Plotly.react(el, this.props.plotData.data, layoutWithSize)
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
        let maxPlotHeight = this.props.maxPlotHeight

        this.markerSelectOptions = generateSelectOptions(this.props.markers)

        // Can only select two markers for a scatter plot or one for histogram.
        // If max markers are selected, set the options for selecting equal to the currently selected options
        let maximumScatterMarkersSelected =
            this.props.selectedPlotMarkers.length == 2 && this.props.selectedType == 'scatter'
        let maximumHistogramMarkersSelected =
            this.props.selectedPlotMarkers.length == 1 && this.props.selectedType == 'histogram'
        if (maximumScatterMarkersSelected || maximumHistogramMarkersSelected) {
            this.markerSelectOptions = generateSelectOptions(this.props.selectedPlotMarkers)
        }

        let selectedPlotType = getSelectedOptions(this.props.selectedType, PlotTypeOptions)
        let plotType = (
            <Select
                value={selectedPlotType}
                options={PlotTypeOptions}
                onChange={this.onTypeSelect}
                isClearable={false}
                styles={SelectStyle}
            />
        )

        let selectedPlotStatistic = getSelectedOptions(this.props.selectedStatistic, PlotStatisticOptions)
        let statisticControls = (
            <Select
                value={selectedPlotStatistic}
                options={PlotStatisticOptions}
                onChange={this.onStatisticSelect}
                isClearable={false}
                placeholder="Statistic"
                styles={SelectStyle}
            />
        )

        let selectedPlotTransform = getSelectedOptions(this.props.selectedTransform, PlotTransformOptions)
        let transformControls = (
            <Select
                value={selectedPlotTransform}
                options={PlotTransformOptions}
                onChange={this.onTransformSelect}
                isClearable={false}
                styles={SelectStyle}
            />
        )

        let coefficientControls = (
            <div>
                Transform Coefficient
                <Input
                    value={this.props.transformCoefficient ? this.props.transformCoefficient : ''}
                    disabled={this.props.selectedTransform == 'none'}
                    onChange={this.onCoefficientSelect}
                    type="number"
                />
            </div>
        )

        let normalizationDisabled = this.props.selectedType != 'heatmap'
        let selectedPlotNormalization = getSelectedOptions(this.props.selectedNormalization, PlotNormalizationOptions)
        let normalizationControls = (
            <Select
                value={normalizationDisabled ? null : selectedPlotNormalization}
                options={PlotNormalizationOptions}
                onChange={this.onNormalizationSelect}
                isClearable={false}
                isDisabled={normalizationDisabled}
                placeholder="Normalization"
                styles={SelectStyle}
            />
        )

        let dotControlsEnabled = this.props.selectedType == 'scatter' || this.props.selectedType == 'contour'
        let dotControls = (
            <div>
                Dot Size
                <Slider
                    min={PlotMinDotSize}
                    max={PlotMaxDotSize}
                    value={this.props.dotSize}
                    onChange={this.props.setDotSize}
                    disabled={!dotControlsEnabled}
                />
            </div>
        )

        let plot = (
            <SizeMe monitorWidth={true}>
                {({ size }) => (
                    <div id="plotly-scatterplot" ref={el => this.mountPlot(el, size.width, maxPlotHeight)} />
                )}
            </SizeMe>
        )

        // If plot data is unset, cleanup Plotly
        if (!this.props.plotData) {
            this.cleanupPlotly()
        }

        let selectedMarkers = getSelectedOptions(this.props.selectedPlotMarkers, this.markerSelectOptions)

        let markerControls = (
            <Select
                value={selectedMarkers}
                options={this.markerSelectOptions}
                onChange={this.onPlotMarkerSelect}
                isMulti={true}
                isDisabled={this.props.selectedType == 'heatmap'}
                placeholder="Select plot markers..."
                styles={SelectStyle}
            />
        )

        let plotSettings = (
            <div>
                <Grid fluid={true}>
                    <Row between="xs">
                        <Col xs={10} sm={10} md={10} lg={10}>
                            {markerControls}
                        </Col>
                        <Col xs={2} sm={2} md={2} lg={2}>
                            <Button id="controls" type="button" size="sm">
                                Controls
                            </Button>
                        </Col>
                    </Row>
                </Grid>
                <Popover
                    placement="bottom"
                    isOpen={this.state.popoverOpen}
                    trigger="legacy"
                    target="controls"
                    toggle={this.togglePopover}
                    style={{ width: '180px' }}
                >
                    <PopoverHeader>Plot Controls</PopoverHeader>
                    <PopoverBody>
                        {plotType}
                        {statisticControls}
                        {transformControls}
                        {normalizationControls}
                        {coefficientControls}
                        {dotControls}
                    </PopoverBody>
                </Popover>
            </div>
        )

        return (
            <div>
                <div>{plotSettings}</div>
                {plot}
            </div>
        )
    }
}
