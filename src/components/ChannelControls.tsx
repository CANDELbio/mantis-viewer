import * as React from "react"
import { RangeSlider } from "@blueprintjs/core"
import { observer } from "mobx-react"
import Select from 'react-select'

export interface ChannelControlsProps {
    sliderMin: number
    sliderMax: number
    sliderValue: [number, number]
    onSliderChange: ((value: [number, number]) => void)
    
    selectOptions: {value: string, label:string}[]
    selectValue: string | null
    onSelectChange: ((x: {value:string, label:string}) => void)

    windowWidth: number | null
}

@observer
export class ChannelControls extends React.Component<ChannelControlsProps, {}> {

    constructor(props: ChannelControlsProps) {
        super(props)
    }

    render() {
        // TODO: Feels a bit hacky. Find a better solution.
        // Dereferencing here so we re-render on resize
        let windowWidth = this.props.windowWidth

        return(
            <div>
                <Select
                    value = {(this.props.selectValue == null) ? undefined : this.props.selectValue}
                    options = {this.props.selectOptions}
                    onChange = {this.props.onSelectChange}
                />
                <RangeSlider
                    min = {this.props.sliderMin}
                    max = {this.props.sliderMax}
                    value = {this.props.sliderValue}
                    labelStepSize = {Math.round(this.props.sliderMax/5)}
                    labelPrecision = {1}
                    stepSize = {this.props.sliderMax/1000} // Might want to change the number/size of steps. Seemed like a good starting point.
                    onChange = {this.props.onSliderChange}
                />
            </div>
        )
    }
}