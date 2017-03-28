import * as React from "react";
import { RangeSlider } from "@blueprintjs/core"
import { observer } from "mobx-react"
const Select = require("react-select")


export interface ChannelControlsProps {

    
    sliderMin: number
    sliderMax: number
    sliderValue: [number, number]
    onSliderRelease: ((value: [number, number]) => void)
    onSliderChange: ((value: [number, number]) => void)
    
    selectOptions: {value: string, label:string}[]
    selectValue: string | null
    onSelectChange: ((x: {value:string, label:string}) => void)


}

@observer
export class ChannelControls extends React.Component<ChannelControlsProps, undefined> {

    constructor(props: ChannelControlsProps) {
        super(props)
    }

    render() {
        return(
            <div>
                <Select
                    value = {this.props.selectValue}
                    options = {this.props.selectOptions}
                    onChange = {this.props.onSelectChange}
                />
                <RangeSlider
                    min = {this.props.sliderMin}
                    max = {this.props.sliderMax}
                    value = {this.props.sliderValue}
                    onRelease = {this.props.onSliderRelease}
                    onChange = {this.props.onSliderChange}
                />
            </div>
        )

    }


}