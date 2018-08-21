import * as React from "react";
import { Button, Slider } from "@blueprintjs/core"
import { observer } from "mobx-react"
import * as Path from "path";

export interface SegmentationControlsProps {
    segmentationPath: string

    sliderValue: number
    onSliderChange: ((value: number) => void)

    onButtonClick: (() => void)
}

@observer
export class SegmentationControls extends React.Component<SegmentationControlsProps, undefined> {

    constructor(props: SegmentationControlsProps) {
        super(props)
    }

    render() {
        let splitPath = this.props.segmentationPath.split(Path.sep)
        let segmentationFileString = "..." + Path.sep + splitPath[splitPath.length - 2] + Path.sep + splitPath[splitPath.length - 1]

        return(
            <div>
                <div>Selected segmentation file {segmentationFileString}</div>
                <Slider
                    value = {this.props.sliderValue}
                    onChange = {this.props.onSliderChange}
                />
                <Button
                    text = {"Clear Segmentation"}
                    onClick = {this.props.onButtonClick}
                />
            </div>
        )
    }
}