import * as React from 'react'
import * as d3Scale from 'd3-scale'
import { Slider, Checkbox } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import * as NumericInput from 'react-numeric-input'
import * as path from 'path'
import { MinZoomCoefficient, MaxZoomCoefficient } from '../definitions/UIDefinitions'

export interface ImageControlsProps {
    highlightedSegment: number | null
    setHighlightedSegment: (value: number) => void

    fillAlpha: number
    outlineAlpha: number
    regionAlpha: number
    zoomCoefficient: number

    onFillAlphaChange: (value: number) => void
    onOutlineAlphaChange: (value: number) => void
    onRegionAlphaChange: (value: number) => void
    onZoomCoefficientChange: (value: number) => void

    zoomInsetVisible: boolean
    setZoomInsetVisible: (visible: boolean) => void

    channelLegendVisible: boolean
    setChannelLegendVisible: (visible: boolean) => void

    populationLegendVisible: boolean
    setPopulationLegendVisible: (visible: boolean) => void

    featureLegendVisible: boolean
    setFeatureLegendVisible: (visible: boolean) => void

    selectedSegmentationFile: string | null
    segmentationLoaded: boolean

    autoLoadSegmentation: boolean
    setAutoLoadSegmentation: (value: boolean) => void
}

@observer
export class ImageControls extends React.Component<ImageControlsProps, Record<string, never>> {
    public constructor(props: ImageControlsProps) {
        super(props)
    }

    private sliderToZoomScale = d3Scale.scaleLinear().domain([0, 10]).range([MinZoomCoefficient, MaxZoomCoefficient])
    private zoomToSliderScale = d3Scale.scaleLinear().domain([MinZoomCoefficient, MaxZoomCoefficient]).range([0, 10])

    private sliderMax = 10

    private onFillAlphaSliderChange = (value: number): void => this.props.onFillAlphaChange(value / this.sliderMax)

    private onOutlineAlphaSliderChange = (value: number): void =>
        this.props.onOutlineAlphaChange(value / this.sliderMax)

    private onRegionAlphaSliderChange = (value: number): void => this.props.onRegionAlphaChange(value / this.sliderMax)

    private onZoomAlphaSliderChange = (value: number): void =>
        this.props.onZoomCoefficientChange(this.sliderToZoomScale(value))

    private onZoomInsetVisibilityChange = (event: React.FormEvent<HTMLInputElement>): void =>
        this.props.setZoomInsetVisible(event.currentTarget.checked)

    private onChannelLegendVisibilityChange = (event: React.FormEvent<HTMLInputElement>): void =>
        this.props.setChannelLegendVisible(event.currentTarget.checked)

    private onPopulationLegendVisibilityChange = (event: React.FormEvent<HTMLInputElement>): void =>
        this.props.setPopulationLegendVisible(event.currentTarget.checked)

    private onFeatureLegendVisibilityChange = (event: React.FormEvent<HTMLInputElement>): void =>
        this.props.setFeatureLegendVisible(event.currentTarget.checked)

    private onAutoLoadSegmentationChange = (event: React.FormEvent<HTMLInputElement>): void =>
        this.props.setAutoLoadSegmentation(event.currentTarget.checked)

    private selectedSegmentationFileLabel(): JSX.Element {
        const segmentationFileName = this.props.selectedSegmentationFile
            ? path.basename(this.props.selectedSegmentationFile)
            : 'No segmentation file loaded'
        return (
            <div style={{ paddingBottom: '10px' }}>
                <div>
                    <b>Selected Segmentation File</b>
                </div>
                <div>{segmentationFileName}</div>
            </div>
        )
    }

    public render(): React.ReactElement {
        return (
            <div>
                Highlight Segment
                <NumericInput
                    value={this.props.highlightedSegment ? this.props.highlightedSegment : undefined}
                    onChange={this.props.setHighlightedSegment}
                    disabled={!this.props.segmentationLoaded}
                    className="form-control"
                />
                Segmentation Outline Alpha
                <Slider
                    value={this.props.outlineAlpha * this.sliderMax}
                    onChange={this.onOutlineAlphaSliderChange}
                    max={this.sliderMax}
                    disabled={!this.props.segmentationLoaded}
                />
                Segmentation Fill Alpha
                <Slider
                    value={this.props.fillAlpha * this.sliderMax}
                    onChange={this.onFillAlphaSliderChange}
                    max={this.sliderMax}
                    disabled={!this.props.segmentationLoaded}
                />
                Region Fill Alpha
                <Slider
                    value={this.props.regionAlpha * this.sliderMax}
                    onChange={this.onRegionAlphaSliderChange}
                    max={this.sliderMax}
                    disabled={!this.props.segmentationLoaded}
                />
                Zoom Speed
                <Slider
                    value={this.zoomToSliderScale(this.props.zoomCoefficient)}
                    onChange={this.onZoomAlphaSliderChange}
                    max={this.sliderMax}
                />
                <Checkbox
                    checked={this.props.zoomInsetVisible}
                    label="Show Zoom Inset"
                    onChange={this.onZoomInsetVisibilityChange}
                />
                <Checkbox
                    checked={this.props.channelLegendVisible}
                    label="Show Channel Legend"
                    onChange={this.onChannelLegendVisibilityChange}
                />
                <Checkbox
                    checked={this.props.populationLegendVisible}
                    label="Show Population Legend"
                    onChange={this.onPopulationLegendVisibilityChange}
                />
                <Checkbox
                    checked={this.props.featureLegendVisible}
                    label="Show Segment Summary Legend"
                    onChange={this.onFeatureLegendVisibilityChange}
                />
                <Checkbox
                    checked={this.props.autoLoadSegmentation}
                    label="Automatically Load Segmentation When Switching Images"
                    onChange={this.onAutoLoadSegmentationChange}
                />
                {this.selectedSegmentationFileLabel()}
            </div>
        )
    }
}
