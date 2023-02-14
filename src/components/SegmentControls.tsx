import { Slider, Checkbox } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import * as React from 'react'
import * as NumericInput from 'react-numeric-input2'
import Select from 'react-select'
import * as path from 'path'
import { SelectOption, SelectStyle, SelectTheme, getSelectedOptions } from '../lib/SelectUtils'
import { SelectedPopulation } from '../stores/PopulationStore'

export interface SegmentControlProps {
    selectedSegment: number | null
    setSelectedSegment: (value: number) => void
    selectedSegmentValid: boolean

    populations: SelectedPopulation[]
    limitSelectedSegmentPopulationId: string | null
    setLimitSelectedSegmentPopulationId: (id: string | null) => void

    snapToSelectedSegment: boolean
    setSnapToSelectedSegment: (value: boolean) => void

    markSelectedSegments: boolean
    setMarkSelectedSegments: (value: boolean) => void

    fillAlpha: number
    outlineAlpha: number
    regionAlpha: number

    onFillAlphaChange: (value: number) => void
    onOutlineAlphaChange: (value: number) => void
    onRegionAlphaChange: (value: number) => void

    selectedSegmentationFile: string | null
    segmentationLoaded: boolean

    autoLoadSegmentation: boolean
    setAutoLoadSegmentation: (value: boolean) => void
}

@observer
export class SegmentControls extends React.Component<SegmentControlProps, Record<string, never>> {
    public constructor(props: SegmentControlProps) {
        super(props)
    }

    private onLimitHighlightedPopulationSelect = (selected: SelectOption | null): void => {
        if (selected) {
            this.props.setLimitSelectedSegmentPopulationId(selected.value)
        } else {
            this.props.setLimitSelectedSegmentPopulationId(null)
        }
    }

    private sliderMax = 10

    private onFillAlphaSliderChange = (value: number): void => this.props.onFillAlphaChange(value / this.sliderMax)

    private onOutlineAlphaSliderChange = (value: number): void =>
        this.props.onOutlineAlphaChange(value / this.sliderMax)

    private onRegionAlphaSliderChange = (value: number): void => this.props.onRegionAlphaChange(value / this.sliderMax)

    private onCheckboxChange = (
        callback: (value: boolean) => void,
    ): ((event: React.FormEvent<HTMLInputElement>) => void) => {
        return (event: React.FormEvent<HTMLInputElement>) => callback(event.currentTarget.checked)
    }

    private selectedSegmentationFileLabel(): JSX.Element {
        const segmentationFileName = this.props.selectedSegmentationFile
            ? path.basename(this.props.selectedSegmentationFile)
            : 'No segmentation file loaded'
        return (
            <div style={{ paddingBottom: '10px' }}>
                <div>
                    <b>Selected Segmentation File</b>
                </div>
                <div>{segmentationFileName}</div>
            </div>
        )
    }

    // React.CSSProperties should work for return type, but invalid return complains.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private highlightSegmentInputStyle(): any {
        if (!this.props.selectedSegmentValid)
            return {
                input: { borderColor: 'red' },
                paddingBottom: '10px',
            }
        return {}
    }

    private highlightSegmentInputValidationMessage(): JSX.Element {
        const selectedSegmentValid = this.props.selectedSegmentValid
        let validationMessage = ' '
        if (!selectedSegmentValid && this.props.limitSelectedSegmentPopulationId) {
            validationMessage = 'Selected segment not in selected population'
        } else if (!selectedSegmentValid) {
            validationMessage = 'Selected segment not found'
        }
        return <div style={{ paddingBottom: '10px', color: 'red' }}>{validationMessage}</div>
    }

    public render(): React.ReactElement {
        const selectOptions: SelectOption[] = []
        for (const population of this.props.populations) {
            selectOptions.push({ value: population.id, label: population.name })
        }
        const selectedOption = getSelectedOptions(this.props.limitSelectedSegmentPopulationId, selectOptions)
        return (
            <div>
                <b>Selected Segment</b>
                <NumericInput
                    value={this.props.selectedSegment ? this.props.selectedSegment : undefined}
                    min={0}
                    onChange={this.props.setSelectedSegment}
                    disabled={!this.props.segmentationLoaded}
                    className="form-control"
                    style={this.highlightSegmentInputStyle()}
                />
                {this.highlightSegmentInputValidationMessage()}
                <b>Limit Selected Segment to a Population</b>
                <div style={{ paddingBottom: '10px' }}>
                    <Select
                        value={selectedOption}
                        options={selectOptions}
                        onChange={this.onLimitHighlightedPopulationSelect}
                        isMulti={false}
                        isClearable={true}
                        placeholder={'Select a population...'}
                        styles={SelectStyle}
                        theme={SelectTheme}
                    />
                </div>

                <Checkbox
                    checked={this.props.snapToSelectedSegment}
                    label="Center on Selected Segment"
                    onChange={this.onCheckboxChange(this.props.setSnapToSelectedSegment)}
                />
                <Checkbox
                    checked={this.props.markSelectedSegments}
                    label="Mark Selected Segments on Image"
                    onChange={this.onCheckboxChange(this.props.setMarkSelectedSegments)}
                />
                <b>Segmentation Outline Alpha</b>
                <Slider
                    value={this.props.outlineAlpha * this.sliderMax}
                    onChange={this.onOutlineAlphaSliderChange}
                    max={this.sliderMax}
                    disabled={!this.props.segmentationLoaded}
                />
                <b>Segmentation Fill Alpha</b>
                <Slider
                    value={this.props.fillAlpha * this.sliderMax}
                    onChange={this.onFillAlphaSliderChange}
                    max={this.sliderMax}
                    disabled={!this.props.segmentationLoaded}
                />
                <b>Region Fill Alpha</b>
                <Slider
                    value={this.props.regionAlpha * this.sliderMax}
                    onChange={this.onRegionAlphaSliderChange}
                    max={this.sliderMax}
                    disabled={!this.props.segmentationLoaded}
                />
                <Checkbox
                    checked={this.props.autoLoadSegmentation}
                    label="Automatically Load Segmentation When Switching Images"
                    onChange={this.onCheckboxChange(this.props.setAutoLoadSegmentation)}
                />
                {this.selectedSegmentationFileLabel()}
            </div>
        )
    }
}
