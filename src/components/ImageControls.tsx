import * as React from 'react'
import { Slider, Checkbox } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import { Button } from 'reactstrap'
import * as path from 'path'

export interface ImageControlsProps {
    fillAlpha: number
    outlineAlpha: number

    onFillAlphaChange: (value: number) => void
    onOutlineAlphaChange: (value: number) => void

    zoomInsetVisible: boolean
    setZoomInsetVisible: (visible: boolean) => void

    legendVisible: boolean
    setLegendVisible: (visible: boolean) => void

    centroidsVisible: boolean
    setCentroidsVisible: (visible: boolean) => void

    selectedSegmentationFile: string | null
    segmentationLoaded: boolean
    onClearSegmentation: () => void
}

@observer
export class ImageControls extends React.Component<ImageControlsProps, {}> {
    public constructor(props: ImageControlsProps) {
        super(props)
    }

    private sliderMax = 10

    private onFillAlphaSliderChange = (value: number): void => this.props.onFillAlphaChange(value / this.sliderMax)
    private onOutlineAlphaSliderChange = (value: number): void =>
        this.props.onOutlineAlphaChange(value / this.sliderMax)
    private onCentroidVisibilityChange = (event: React.FormEvent<HTMLInputElement>): void =>
        this.props.setCentroidsVisible(event.currentTarget.checked)
    private onZoomInsetVisibilityChange = (event: React.FormEvent<HTMLInputElement>): void =>
        this.props.setZoomInsetVisible(event.currentTarget.checked)
    private onLegendVisibilityChange = (event: React.FormEvent<HTMLInputElement>): void =>
        this.props.setLegendVisible(event.currentTarget.checked)

    private selectedSegmentationFileLabel(): JSX.Element {
        const segmentationFileName = this.props.selectedSegmentationFile
            ? path.basename(this.props.selectedSegmentationFile)
            : 'No segmentation file loaded'
        return (
            <div style={{ paddingBottom: '10px' }}>
                <div>Selected Segmentation File</div>
                <div>{segmentationFileName}</div>
            </div>
        )
    }

    public render(): React.ReactElement {
        return (
            <div>
                <Checkbox
                    checked={this.props.zoomInsetVisible}
                    label="Show Zoom Inset"
                    onChange={this.onZoomInsetVisibilityChange}
                />
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
                {this.selectedSegmentationFileLabel()}
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
                <div style={{ textAlign: 'center' }}>
                    <Button
                        onClick={this.props.onClearSegmentation}
                        color="danger"
                        size="sm"
                        disabled={!this.props.segmentationLoaded}
                    >
                        Clear Segmentation
                    </Button>
                </div>
            </div>
        )
    }
}
