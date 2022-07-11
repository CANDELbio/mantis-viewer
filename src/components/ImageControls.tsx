import { Slider, Checkbox } from '@blueprintjs/core'
import * as d3Scale from 'd3-scale'
import { observer } from 'mobx-react'
import * as React from 'react'
import * as NumericInput from 'react-numeric-input2'
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

    regionLegendVisible: boolean
    setRegionLegendVisible: (visible: boolean) => void

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

    private onCheckboxChange = (
        callback: (value: boolean) => void,
    ): ((event: React.FormEvent<HTMLInputElement>) => void) => {
        return (event: React.FormEvent<HTMLInputElement>) => callback(event.currentTarget.checked)
    }

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
                    min={0}
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
                    onChange={this.onCheckboxChange(this.props.setZoomInsetVisible)}
                />
                <Checkbox
                    checked={this.props.channelLegendVisible}
                    label="Show Channels In Legend"
                    onChange={this.onCheckboxChange(this.props.setChannelLegendVisible)}
                />
                <Checkbox
                    checked={this.props.populationLegendVisible}
                    label="Show Populations In Legend"
                    onChange={this.onCheckboxChange(this.props.setPopulationLegendVisible)}
                />
                <Checkbox
                    checked={this.props.featureLegendVisible}
                    label="Show Hovered Segment In Legend"
                    onChange={this.onCheckboxChange(this.props.setFeatureLegendVisible)}
                />
                <Checkbox
                    checked={this.props.regionLegendVisible}
                    label="Show Hovered Region In Legend"
                    onChange={this.onCheckboxChange(this.props.setRegionLegendVisible)}
                />
                <Checkbox
                    checked={this.props.autoLoadSegmentation}
                    label="Automatically Load Segmentation When Switching Images"
                    onChange={this.onCheckboxChange(this.props.setAutoLoadSegmentation)}
                />
                {this.selectedSegmentationFileLabel()}
            </div>
        )
    }
}
