import * as React from 'react'
import { RangeSlider } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import Select from 'react-select'

export interface ChannelControlsProps {
    sliderMin: number
    sliderMax: number
    sliderValue: [number, number]
    onDomainChange: (value: [number, number]) => void

    selectOptions: { value: string; label: string }[]
    selectValue: string | null
    allSelectedValues: (string | null)[]
    onMarkerChange: (x: { value: string; label: string }) => void

    windowWidth: number | null
}

@observer
export class ChannelControls extends React.Component<ChannelControlsProps, {}> {
    public constructor(props: ChannelControlsProps) {
        super(props)
    }

    public render(): React.ReactNode {
        // TODO: Feels a bit hacky. Find a better solution.
        // Dereferencing here so we re-render on resize
        let windowWidth = this.props.windowWidth

        let unroundedStepSize = this.props.sliderMax / 5
        let roundedStepSize = Math.round(unroundedStepSize)
        let stepSize = roundedStepSize == 0 ? unroundedStepSize : roundedStepSize

        // Remove nulls and the value selected for this channel from the list of all selected values
        let filteredSelectedValues = this.props.allSelectedValues.filter(value => {
            return value != null && value != this.props.selectValue
        })
        // Remove all select options in the list of filtered, selected values from above.
        // This is so that a marker cannot be selected to be displayed in two channels.
        let filteredSelectOptions = this.props.selectOptions.filter(option => {
            return !filteredSelectedValues.includes(option.value)
        })

        return (
            <div>
                <Select
                    value={this.props.selectValue == null ? undefined : this.props.selectValue}
                    options={filteredSelectOptions}
                    onChange={this.props.onMarkerChange}
                />
                <RangeSlider
                    min={this.props.sliderMin}
                    max={this.props.sliderMax}
                    value={this.props.sliderValue}
                    labelStepSize={stepSize}
                    labelPrecision={1}
                    stepSize={this.props.sliderMax / 1000} // Might want to change the number/size of steps. Seemed like a good starting point.
                    onChange={this.props.onDomainChange}
                />
            </div>
        )
    }
}
