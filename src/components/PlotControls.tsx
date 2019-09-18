// Draws some inspiration from https://github.com/davidctj/react-plotlyjs-ts
// Might be able to use this in the future or to make this component more React-y
import * as React from 'react'
import * as _ from 'underscore'
import Select from 'react-select'
import { observer } from 'mobx-react'
import * as Plotly from 'plotly.js'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { Input, Button, Popover, PopoverHeader, PopoverBody } from 'reactstrap'
import { Slider } from '@blueprintjs/core'

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

interface PlotControlsProps {
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
    windowWidth: number | null
}

@observer
export class PlotControls extends React.Component<PlotControlsProps, {}> {
    public container: Plotly.PlotlyHTMLElement | null = null

    public constructor(props: PlotControlsProps) {
        super(props)
    }

    public state = {
        popoverOpen: false,
    }

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

    public render(): React.ReactNode {
        // TODO: Feels a bit hacky. Find a better solution.
        // Dereferencing here so we re-render on resize
        let windowWidth = this.props.windowWidth

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

        return (
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
    }
}
