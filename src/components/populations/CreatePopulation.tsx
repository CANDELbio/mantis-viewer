import * as React from 'react'
import { observer } from 'mobx-react'
import { Button } from 'reactstrap'
import Select from 'react-select'
import { NumberRange, RangeSlider } from '@blueprintjs/core'

import { PopulationCreationOptions } from '../../definitions/UIDefinitions'
import { MinMax } from '../../interfaces/ImageInterfaces'
import {
    SelectOption,
    SelectStyle,
    SelectTheme,
    getSelectedOptions,
    generateSelectOptions,
    onClearableSelectChange,
} from '../../lib/SelectHelper'

interface CreatePopulationProps {
    availableFeatures: string[]
    setSelectedFeature: (feature: string | null) => void
    selectedFeature: string | null
    selectedFeatureMinMax: MinMax | null
    createPopulationFromSegments: (segments: number[], name?: string) => void
    createPopulationFromRange: (min: number, max: number, marker: string) => void
    onCreatePopulation?: () => void
}

interface CreatePopulationState {
    selectedPopulationCreationOption: string
    newPopulationSegmentIds: string
    newPopulationMinMax: NumberRange | null
}

function parseSegmentIds(toParse: string): number[] {
    return toParse
        .split(',')
        .map((v: string): number => {
            return parseInt(v)
        })
        .filter((v: number): boolean => {
            return !Number.isNaN(v)
        })
}

@observer
export class CreatePopulation extends React.Component<CreatePopulationProps, CreatePopulationState> {
    public constructor(props: CreatePopulationProps) {
        super(props)
    }

    public state: CreatePopulationState = {
        selectedPopulationCreationOption: PopulationCreationOptions[0].value,
        newPopulationSegmentIds: '',
        newPopulationMinMax: null,
    }

    // Use this special function to turn off the picker whenever the user starts scrolling on the parent table.
    public static getDerivedStateFromProps(
        props: CreatePopulationProps,
        state: CreatePopulationState,
    ): CreatePopulationState | null {
        const selectedMinMax = props.selectedFeatureMinMax
        if (selectedMinMax != null && state.newPopulationMinMax == null) {
            const updatedState = state
            updatedState.newPopulationMinMax = [selectedMinMax.min, selectedMinMax.max]
            return updatedState
        }
        return null
    }

    private onCreationOptionSelect = (x: SelectOption): void => {
        if (x != null) this.setState({ selectedPopulationCreationOption: x.value })
    }

    private onCreatePopulationIdsChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
        this.setState({ newPopulationSegmentIds: event.target.value })
    }

    private createPopulationSubmit = (): void => {
        if (this.state.selectedPopulationCreationOption == 'ids') {
            this.props.createPopulationFromSegments(
                parseSegmentIds(this.state.newPopulationSegmentIds),
                'New Population from Segment IDs',
            )
            this.setState({ newPopulationSegmentIds: '' })
        } else if (this.state.selectedPopulationCreationOption == 'range') {
            const selectedFeature = this.props.selectedFeature
            const populationMinMax = this.state.newPopulationMinMax
            if (selectedFeature != null && populationMinMax != null) {
                this.props.createPopulationFromRange(populationMinMax[0], populationMinMax[1], selectedFeature)
                this.setState({ newPopulationMinMax: null })
                this.props.setSelectedFeature(null)
            }
        }
        if (this.props.onCreatePopulation) {
            this.props.onCreatePopulation()
        }
    }

    private onMarkerChange = (marker: string | null): void => {
        this.setState({ newPopulationMinMax: null })
        this.props.setSelectedFeature(marker)
    }

    private markerSelect(): React.ReactElement | void {
        const features = this.props.availableFeatures
        const selectedFeature = this.props.selectedFeature
        // Remove all select options in the list of filtered, selected values from above.
        // This is so that a marker cannot be selected to be displayed in two channels.
        const selectOptions = generateSelectOptions(features)
        const filteredSelectOptions = selectOptions.filter((option: SelectOption) => {
            return option.value != selectedFeature
        })
        const selectedValue = getSelectedOptions(selectedFeature, selectOptions)

        return (
            <Select
                value={selectedValue}
                options={filteredSelectOptions}
                onChange={onClearableSelectChange(this.onMarkerChange)}
                isClearable={true}
                styles={SelectStyle}
                theme={SelectTheme}
            />
        )
    }

    private onMarkerInstensityChange = (value: NumberRange): void => {
        this.setState({ newPopulationMinMax: value })
    }

    private markerInsensitySlider(): React.ReactElement | void {
        const selectedMinMax = this.props.selectedFeatureMinMax
        const newPopulationMinMax = this.state.newPopulationMinMax
        if (selectedMinMax != null && newPopulationMinMax != null) {
            const selectedMax = selectedMinMax.max

            const unroundedStepSize = selectedMinMax.max / 5
            const roundedStepSize = Math.round(unroundedStepSize)
            const labelStepSize = roundedStepSize == 0 ? unroundedStepSize : roundedStepSize

            return (
                <RangeSlider
                    min={selectedMinMax.min}
                    max={selectedMinMax.max}
                    value={newPopulationMinMax}
                    labelStepSize={labelStepSize}
                    labelPrecision={1}
                    stepSize={selectedMax / 1000} // Might want to change the number/size of steps. Seemed like a good starting point.
                    onChange={this.onMarkerInstensityChange}
                />
            )
        }
    }

    public render(): React.ReactElement {
        const selectedPopulationCreationOption = getSelectedOptions(
            this.state.selectedPopulationCreationOption,
            PopulationCreationOptions,
        )
        const creationSelect = (
            <Select
                value={selectedPopulationCreationOption}
                options={PopulationCreationOptions}
                onChange={this.onCreationOptionSelect}
                isClearable={false}
                styles={SelectStyle}
                theme={SelectTheme}
            />
        )
        let creationForm = null
        if (this.state.selectedPopulationCreationOption == 'ids') {
            creationForm = <textarea style={{ overflow: 'auto' }} onChange={this.onCreatePopulationIdsChange} />
        } else if (this.state.selectedPopulationCreationOption == 'range') {
            creationForm = (
                <div>
                    {this.markerSelect()}
                    {this.markerInsensitySlider()}
                </div>
            )
        }
        return (
            <div style={{ position: 'relative' }}>
                <table cellPadding="2">
                    <tbody>
                        <tr>
                            <td> {creationSelect}</td>
                        </tr>
                        <tr>
                            <td> {creationForm}</td>
                        </tr>
                        <tr>
                            <td>
                                <Button type="button" size="sm" onClick={this.createPopulationSubmit}>
                                    Create Population
                                </Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        )
    }
}
