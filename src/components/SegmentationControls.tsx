import * as React from "react"
import { Button, Slider, Checkbox } from "@blueprintjs/core"
import { observer } from "mobx-react"
import * as Path from "path"

export interface SegmentationControlsProps {
    segmentationPath: string

    fillAlpha: number
    outlineAlpha: number

    onFillAlphaChange: ((value: number) => void)
    onOutlineAlphaChange: ((value: number) => void)

    centroidsVisible: boolean
    onCentroidVisibilityChange: ((event: React.FormEvent<HTMLInputElement>) => void)

    onClearSegmentation: (() => void)
}

@observer
export class SegmentationControls extends React.Component<SegmentationControlsProps, {}> {

    constructor(props: SegmentationControlsProps) {
        super(props)
    }

    sliderMax = 10

    onFillAlphaSliderChange = (value: number) => this.props.onFillAlphaChange(value/this.sliderMax)
    onOutlineAlphaSliderChange = (value:number) => this.props.onOutlineAlphaChange(value/this.sliderMax)

    render() {
        let splitPath = this.props.segmentationPath.split(Path.sep)
        let segmentationFileString = "..." + Path.sep + splitPath[splitPath.length - 2] + Path.sep + splitPath[splitPath.length - 1]

        return(
            <div>
                <div>Selected segmentation file:</div>
                <div>{segmentationFileString}</div>
                <br></br>
                <Checkbox checked={this.props.centroidsVisible} label="Show Centroids" onChange={this.props.onCentroidVisibilityChange} />
                Segmentation Outline Alpha
                <Slider
                    value = {this.props.outlineAlpha * this.sliderMax}
                    onChange = {this.onOutlineAlphaSliderChange}
                    max = {this.sliderMax}
                />
                Segmentation Fill Alpha
                <Slider
                    value = {this.props.fillAlpha * this.sliderMax}
                    onChange = {this.onFillAlphaSliderChange}
                    max = {this.sliderMax}
                />
                <Button
                    text = {"Clear Segmentation"}
                    onClick = {this.props.onClearSegmentation}
                />
            </div>
        )
    }
}