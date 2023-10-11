import { Slider, Checkbox } from '@blueprintjs/core'
import * as d3Scale from 'd3-scale'
import { observer } from 'mobx-react'
import * as React from 'react'
import { Button } from 'reactstrap'
import { MinZoomCoefficient, MaxZoomCoefficient } from '../definitions/UIDefinitions'

export interface ImageControlsProps {
    zoomCoefficient: number

    onZoomCoefficientChange: (value: number) => void

    zoomInsetVisible: boolean
    setZoomInsetVisible: (visible: boolean) => void

    channelLegendVisible: boolean
    setChannelLegendVisible: (visible: boolean) => void

    populationLegendVisible: boolean
    setPopulationLegendVisible: (visible: boolean) => void

    featureLegendVisible: boolean
    setFeatureLegendVisible: (visible: boolean) => void

    sortLegendFeatures: boolean
    setSortLegendFeatures: (sort: boolean) => void

    zeroFeaturesLegendVisible: boolean
    setZeroFeaturesLegendVisible: (sort: boolean) => void

    regionLegendVisible: boolean
    setRegionLegendVisible: (visible: boolean) => void

    channelMappingLegendVisible: boolean
    setChannelMappingLegendVisible: (visible: boolean) => void

    setEditingLegendFeatures: (editing: boolean) => void
}

@observer
export class ImageControls extends React.Component<ImageControlsProps, Record<string, never>> {
    public constructor(props: ImageControlsProps) {
        super(props)
    }

    private sliderToZoomScale = d3Scale.scaleLinear().domain([0, 10]).range([MinZoomCoefficient, MaxZoomCoefficient])
    private zoomToSliderScale = d3Scale.scaleLinear().domain([MinZoomCoefficient, MaxZoomCoefficient]).range([0, 10])

    private sliderMax = 10

    private onZoomSliderChange = (value: number): void =>
        this.props.onZoomCoefficientChange(this.sliderToZoomScale(value))

    private onRequestEditFeatures = (): void => this.props.setEditingLegendFeatures(true)

    private onCheckboxChange = (
        callback: (value: boolean) => void,
    ): ((event: React.FormEvent<HTMLInputElement>) => void) => {
        return (event: React.FormEvent<HTMLInputElement>) => callback(event.currentTarget.checked)
    }

    public render(): React.ReactElement {
        return (
            <div>
                <b>Zoom Speed</b>
                <Slider
                    value={this.zoomToSliderScale(this.props.zoomCoefficient)}
                    onChange={this.onZoomSliderChange}
                    max={this.sliderMax}
                />
                <Checkbox
                    checked={this.props.zoomInsetVisible}
                    label="Show Zoom Inset"
                    onChange={this.onCheckboxChange(this.props.setZoomInsetVisible)}
                />
                <Button onClick={this.onRequestEditFeatures} style={{ marginBottom: '5px', width: '100%' }} size="sm">
                    Edit Legend Features
                </Button>
                <Checkbox
                    checked={this.props.channelLegendVisible}
                    label="Show Channels in Legend"
                    onChange={this.onCheckboxChange(this.props.setChannelLegendVisible)}
                />
                <Checkbox
                    checked={this.props.populationLegendVisible}
                    label="Show Populations in Legend"
                    onChange={this.onCheckboxChange(this.props.setPopulationLegendVisible)}
                />
                <Checkbox
                    checked={this.props.featureLegendVisible}
                    label="Show Hovered Segment in Legend"
                    onChange={this.onCheckboxChange(this.props.setFeatureLegendVisible)}
                />
                <Checkbox
                    checked={this.props.sortLegendFeatures}
                    label="Sort Segment Features in Legend by Value"
                    onChange={this.onCheckboxChange(this.props.setSortLegendFeatures)}
                />
                <Checkbox
                    checked={this.props.zeroFeaturesLegendVisible}
                    label="Show Zero Value Segment Features in Legend"
                    onChange={this.onCheckboxChange(this.props.setZeroFeaturesLegendVisible)}
                />
                <Checkbox
                    checked={this.props.regionLegendVisible}
                    label="Show Hovered Region in Legend"
                    onChange={this.onCheckboxChange(this.props.setRegionLegendVisible)}
                />
                <Checkbox
                    checked={this.props.channelMappingLegendVisible}
                    label="Show Active Channel Mapping in Legend"
                    onChange={this.onCheckboxChange(this.props.setChannelMappingLegendVisible)}
                />
            </div>
        )
    }
}
