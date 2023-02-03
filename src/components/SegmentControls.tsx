import { Slider, Checkbox } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import * as React from 'react'
import * as NumericInput from 'react-numeric-input2'
import * as path from 'path'

export interface SegmentControlProps {
    highlightedSegment: number | null
    setHighlightedSegment: (value: number) => void
    highlightedSegmentValid: boolean

    snapToHighlightedSegment: boolean
    setSnapToHighlightedSegment: (value: boolean) => void

    markHighlightedSegments: boolean
    setMarkHighlightedSegments: (value: boolean) => void

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
        if (!this.props.highlightedSegmentValid)
            return {
                input: { borderColor: 'red' },
                paddingBottom: '10px',
            }
        return {}
    }

    private highlightSegmentInputValidationMessage(): JSX.Element {
        const validationMessage = this.props.highlightedSegmentValid ? '' : 'Highlight segment not found'
        return <div style={{ paddingBottom: '10px', color: 'red' }}>{validationMessage}</div>
    }

    public render(): React.ReactElement {
        return (
            <div>
                <b>Highlight Segment</b>
                <NumericInput
                    value={this.props.highlightedSegment ? this.props.highlightedSegment : undefined}
                    min={0}
                    onChange={this.props.setHighlightedSegment}
                    disabled={!this.props.segmentationLoaded}
                    className="form-control"
                    style={this.highlightSegmentInputStyle()}
                />
                {this.highlightSegmentInputValidationMessage()}
                <Checkbox
                    checked={this.props.snapToHighlightedSegment}
                    label="Center on Highlighted Segment"
                    onChange={this.onCheckboxChange(this.props.setSnapToHighlightedSegment)}
                />
                <Checkbox
                    checked={this.props.markHighlightedSegments}
                    label="Mark Highlighted Segments on Image"
                    onChange={this.onCheckboxChange(this.props.setMarkHighlightedSegments)}
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
