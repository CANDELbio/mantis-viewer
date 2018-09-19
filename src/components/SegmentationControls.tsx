import * as React from "react";
import { Button, Slider, Checkbox } from "@blueprintjs/core"
import { observer } from "mobx-react"
import * as Path from "path";

export interface SegmentationControlsProps {
    segmentationPath: string

    segmentationAlpha: number
    onAlphaChange: ((value: number) => void)

    centroidsVisible: boolean
    onVisibilityChange: ((event: React.FormEvent<HTMLInputElement>) => void)

    onClearSegmentation: (() => void)
}

@observer
export class SegmentationControls extends React.Component<SegmentationControlsProps, {}> {

    constructor(props: SegmentationControlsProps) {
        super(props)
    }

    render() {
        let splitPath = this.props.segmentationPath.split(Path.sep)
        let segmentationFileString = "..." + Path.sep + splitPath[splitPath.length - 2] + Path.sep + splitPath[splitPath.length - 1]

        return(
            <div>
                <div>Selected segmentation file {segmentationFileString}</div>
                <br></br>
                <Checkbox checked={this.props.centroidsVisible} label="Show Centroids" onChange={this.props.onVisibilityChange} />
                Segmentation Cell Alpha
                <Slider
                    value = {this.props.segmentationAlpha}
                    onChange = {this.props.onAlphaChange}
                />
                <Button
                    text = {"Clear Segmentation"}
                    onClick = {this.props.onClearSegmentation}
                />
            </div>
        )
    }
}