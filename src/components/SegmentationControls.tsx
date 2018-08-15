import * as React from "react";
import { Button, Slider } from "@blueprintjs/core"
import { observer } from "mobx-react"
const Select = require("react-select")


export interface SegmentationControlsProps {
    segmentationPath: string | null

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
        return(
            <div>
                Selected segmentation file {this.props.segmentationPath}
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