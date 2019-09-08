import * as React from 'react'
import { Slider, Checkbox } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import { Button } from 'reactstrap'

export interface ImageControlsProps {
    fillAlpha: number
    outlineAlpha: number

    onFillAlphaChange: (value: number) => void
    onOutlineAlphaChange: (value: number) => void

    legendVisible: boolean
    setLegendVisible: (visible: boolean) => void

    centroidsVisible: boolean
    setCentroidsVisible: (visible: boolean) => void

    segmentationLoaded: boolean
    onClearSegmentation: () => void
}

@observer
export class ImageControls extends React.Component<ImageControlsProps, {}> {
    public constructor(props: ImageControlsProps) {
        super(props)
    }

    private sliderMax = 10

    private onFillAlphaSliderChange = (value: number) => this.props.onFillAlphaChange(value / this.sliderMax)
    private onOutlineAlphaSliderChange = (value: number) => this.props.onOutlineAlphaChange(value / this.sliderMax)
    private onCentroidVisibilityChange = (event: React.FormEvent<HTMLInputElement>) =>
        this.props.setCentroidsVisible(event.currentTarget.checked)
    private onLegendVisibilityChange = (event: React.FormEvent<HTMLInputElement>) =>
        this.props.setLegendVisible(event.currentTarget.checked)

    public render(): React.ReactElement {
        return (
            <div>
                <Checkbox
                    checked={this.props.legendVisible}
                    label="Show Channel Legend"
                    onChange={this.onLegendVisibilityChange}
                />
                <Checkbox
                    checked={this.props.centroidsVisible}
                    label="Show Segmentation Centroids"
                    onChange={this.onCentroidVisibilityChange}
                    disabled={!this.props.segmentationLoaded}
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
                <Button
                    onClick={this.props.onClearSegmentation}
                    color="danger"
                    size="sm"
                    disabled={!this.props.segmentationLoaded}
                >
                    Clear Segmentation
                </Button>
            </div>
        )
    }
}
