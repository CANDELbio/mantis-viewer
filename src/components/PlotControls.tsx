// Draws some inspiration from https://github.com/davidctj/react-plotlyjs-ts
// Might be able to use this in the future or to make this component more React-y
import * as React from 'react'
import Select from 'react-select'
import { observer } from 'mobx-react'
import * as Plotly from 'plotly.js'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { Input, Button, Popover, PopoverHeader, PopoverBody } from 'reactstrap'
import { Slider, Checkbox } from '@blueprintjs/core'

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
import { SelectStyle, SelectTheme, getSelectedOptions, generateSelectOptions } from '../lib/SelectHelper'

interface PlotControlsProps {
    features: string[]
    selectedPlotFeatures: string[]
    setSelectedPlotFeatures: (x: string[]) => void
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
    projectLoaded: boolean
    plotAllImageSets: boolean
    setPlotAllImageSets: (x: boolean) => void
    modalOpen?: boolean
    windowWidth: number | null
}

interface PlotControlsState {
    popoverOpen: boolean
}

@observer
export class PlotControls extends React.Component<PlotControlsProps, PlotControlsState> {
    public container: Plotly.PlotlyHTMLElement | null = null

    public constructor(props: PlotControlsProps) {
        super(props)
    }

    public state = {
        popoverOpen: false,
    }

    // Use this special function to turn off the picker whenever the user starts scrolling on the parent table.
    public static getDerivedStateFromProps(
        props: PlotControlsProps,
        state: PlotControlsState,
    ): PlotControlsState | null {
        if (props.modalOpen) {
            return {
                popoverOpen: false,
            }
        }
        return state
    }

    private togglePopover = (): void => this.setState({ popoverOpen: !this.state.popoverOpen })

    private featureSelectOptions: { value: string; label: string }[]

    private onPlotFeatureSelect = (selected: SelectOption[] | null): void => {
        let features: string[] = []
        if (selected != null)
            features = selected.map((o: SelectOption) => {
                return o.value
            })
        this.props.setSelectedPlotFeatures(features)
    }

    private onStatisticSelect = (x: SelectOption): void => {
        if (x != null) this.props.setSelectedStatistic(x.value as PlotStatistic)
    }

    private onTransformSelect = (x: SelectOption): void => {
        if (x != null) this.props.setSelectedTransform(x.value as PlotTransform)
    }
    private onTypeSelect = (x: SelectOption): void => {
        if (x != null) this.props.setSelectedType(x.value as PlotType)
    }
    private onNormalizationSelect = (x: SelectOption): void => {
        if (x != null) this.props.setSelectedNormalization(x.value as PlotNormalization)
    }

    private onCoefficientSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
        this.props.setTransformCoefficient(event.target.valueAsNumber)
    }

    public render(): React.ReactNode {
        // TODO: Feels a bit hacky. Find a better solution.
        // Dereferencing here so we re-render on resize
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const windowWidth = this.props.windowWidth

        this.featureSelectOptions = generateSelectOptions(this.props.features)

        // If all selected plot features are not in all features, set selected features to empty
        // TODO is this too much logic for a component?
        const allSelectedPlotFeaturesInAllFeatures = this.props.selectedPlotFeatures.every((m: string) => {
            return this.props.features.includes(m)
        })

        // A little bit of logic to display only the first feature for histograms if multiple features are selected
        // (This can/will happen when the user is switching between plot types so we can preserve them)
        // TODO is this too much logic for a component?

        let selectedPlotFeatures: string[] = []
        if (allSelectedPlotFeaturesInAllFeatures) {
            selectedPlotFeatures = this.props.selectedPlotFeatures
            if (this.props.selectedType == 'histogram') {
                selectedPlotFeatures = this.props.selectedPlotFeatures.slice(0, 1)
            } else if (this.props.selectedType == 'scatter' || this.props.selectedType == 'contour') {
                selectedPlotFeatures = this.props.selectedPlotFeatures.slice(0, 2)
            }
        }
        const selectedFeatureSelectOptions = getSelectedOptions(selectedPlotFeatures, this.featureSelectOptions)

        // Can only select two features for a scatter plot or one for histogram.
        // If max features are selected, set the options for selecting equal to the currently selected options
        const maximumScatterFeaturesSelected =
            selectedPlotFeatures.length == 2 &&
            (this.props.selectedType == 'scatter' || this.props.selectedType == 'contour')
        const maximumHistogramFeaturesSelected =
            selectedPlotFeatures.length >= 1 && this.props.selectedType == 'histogram'
        if (maximumScatterFeaturesSelected || maximumHistogramFeaturesSelected) {
            this.featureSelectOptions = generateSelectOptions(selectedPlotFeatures)
        }

        const selectedPlotType = getSelectedOptions(this.props.selectedType, PlotTypeOptions)
        const plotType = (
            <Select
                value={selectedPlotType}
                options={PlotTypeOptions}
                onChange={this.onTypeSelect}
                isClearable={false}
                styles={SelectStyle}
                className="space-bottom"
                theme={SelectTheme}
            />
        )

        const selectedPlotStatistic = getSelectedOptions(this.props.selectedStatistic, PlotStatisticOptions)
        const statisticControls = (
            <Select
                value={selectedPlotStatistic}
                options={PlotStatisticOptions}
                onChange={this.onStatisticSelect}
                isClearable={false}
                isDisabled={this.props.selectedType != 'heatmap'}
                placeholder="Statistic"
                styles={SelectStyle}
                className="space-bottom"
                theme={SelectTheme}
            />
        )

        const selectedPlotTransform = getSelectedOptions(this.props.selectedTransform, PlotTransformOptions)
        const transformControls = (
            <Select
                value={selectedPlotTransform}
                options={PlotTransformOptions}
                onChange={this.onTransformSelect}
                isClearable={false}
                styles={SelectStyle}
                className="space-bottom"
                theme={SelectTheme}
            />
        )

        const coefficientControls = (
            <div>
                Transform Coefficient
                <Input
                    value={this.props.transformCoefficient ? this.props.transformCoefficient : ''}
                    disabled={this.props.selectedTransform == 'none'}
                    onChange={this.onCoefficientSelect}
                    type="number"
                    className="space-bottom"
                />
            </div>
        )

        const normalizationDisabled = this.props.selectedType != 'heatmap'
        const selectedPlotNormalization = getSelectedOptions(this.props.selectedNormalization, PlotNormalizationOptions)
        const normalizationControls = (
            <Select
                value={normalizationDisabled ? null : selectedPlotNormalization}
                options={PlotNormalizationOptions}
                onChange={this.onNormalizationSelect}
                isClearable={false}
                isDisabled={normalizationDisabled}
                placeholder="Normalization"
                styles={SelectStyle}
                className="space-bottom"
                theme={SelectTheme}
            />
        )

        const dotControlsEnabled = this.props.selectedType == 'scatter' || this.props.selectedType == 'contour'
        const dotControls = (
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
        const plotProjectControlsEnabled = this.props.selectedType != 'heatmap' && this.props.projectLoaded
        const plotProjectControls = (
            <div>
                <Checkbox
                    checked={this.props.plotAllImageSets}
                    disabled={!plotProjectControlsEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                        this.props.setPlotAllImageSets(e.target.checked)
                    }
                    label="Plot for whole project"
                />
            </div>
        )

        const featureControls = (
            <Select
                value={selectedFeatureSelectOptions}
                options={this.featureSelectOptions}
                onChange={this.onPlotFeatureSelect}
                isMulti={true}
                placeholder="Select features to plot..."
                styles={SelectStyle}
                theme={SelectTheme}
            />
        )

        return (
            <div>
                <Grid fluid={true}>
                    <Row between="xs">
                        <Col xs={10} sm={10} md={10} lg={10}>
                            {featureControls}
                        </Col>
                        <Col xs={2} sm={2} md={2} lg={2}>
                            <Button id="controls" type="button" size="sm" className="vertical-center">
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
                        {plotProjectControls}
                    </PopoverBody>
                </Popover>
            </div>
        )
    }
}
