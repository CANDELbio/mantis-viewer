import { observer } from 'mobx-react'
import * as React from 'react'
import * as NumericInput from 'react-numeric-input2'
import Select from 'react-select'
import { Modal, ModalHeader, ModalBody, Button } from 'reactstrap'
import { PlotTransform, PlotTransformOptions } from '../../definitions/UIDefinitions'
import {
    SelectOption,
    SelectStyle,
    SelectTheme,
    getSelectedOptions,
    generateSelectOptions,
} from '../../lib/SelectUtils'

export interface LegendFeatureModalProps {
    displayModal: boolean
    features: string[]
    selectedFeatures: string[]
    setSelectedFeatures: (x: string[]) => void
    selectedTransform: PlotTransform
    setSelectedTransform: (x: PlotTransform) => void
    setTransformCoefficient: (x: number) => void
    transformCoefficient: number | null
    setEditingLegendFeatures: (editing: boolean) => void
}

@observer
export class LegendFeatureModal extends React.Component<LegendFeatureModalProps, never> {
    public constructor(props: LegendFeatureModalProps) {
        super(props)
    }

    private featureSelectOptions: { value: string; label: string }[]

    private onFeatureSelect = (selected: SelectOption[] | null): void => {
        let features: string[] = []
        if (selected != null)
            features = selected.map((o: SelectOption) => {
                return o.value
            })
        this.props.setSelectedFeatures(features)
    }

    private selectAllFeatures = (): void => {
        this.props.setSelectedFeatures(this.props.features)
    }

    private onTransformSelect = (x: SelectOption): void => {
        if (x != null) this.props.setSelectedTransform(x.value as PlotTransform)
    }

    private onCloseModal = (): void => {
        this.props.setEditingLegendFeatures(false)
    }

    public render(): React.ReactNode {
        let modal = null

        this.featureSelectOptions = generateSelectOptions(this.props.features)
        const selectedFeatureSelectOptions = getSelectedOptions(this.props.selectedFeatures, this.featureSelectOptions)

        const featuresInDb = this.props.features.length != 0
        const featureControlsPlaceholder = featuresInDb
            ? 'Select features to plot...'
            : 'No features present in database...'

        const featureControls = (
            <Select
                value={selectedFeatureSelectOptions}
                options={this.featureSelectOptions}
                onChange={this.onFeatureSelect}
                isMulti={true}
                placeholder={featureControlsPlaceholder}
                styles={SelectStyle}
                theme={SelectTheme}
                isDisabled={!featuresInDb}
            />
        )

        const selectedPlotTransform = getSelectedOptions(this.props.selectedTransform, PlotTransformOptions)
        const transformControls = (
            <Select
                value={selectedPlotTransform}
                options={PlotTransformOptions}
                onChange={this.onTransformSelect}
                isClearable={false}
                styles={SelectStyle}
                theme={SelectTheme}
            />
        )

        const coefficientControls = (
            <div>
                Transform Coefficient
                <NumericInput
                    step={0.01}
                    precision={2}
                    min={0.01}
                    value={this.props.transformCoefficient ? this.props.transformCoefficient : undefined}
                    onChange={this.props.setTransformCoefficient}
                    disabled={this.props.selectedTransform == 'none'}
                    className="form-control"
                />
            </div>
        )

        modal = (
            <Modal isOpen={this.props.displayModal} toggle={this.onCloseModal}>
                <ModalHeader toggle={this.onCloseModal}>Feature Settings for Legend</ModalHeader>
                <ModalBody>
                    <table style={{ width: '475px' }} cellPadding="4">
                        <tbody>
                            <tr>
                                <td>{featureControls}</td>
                            </tr>
                            <tr>
                                <td>
                                    <Button
                                        onClick={this.selectAllFeatures}
                                        style={{ marginBottom: '5px', width: '100%' }}
                                        size="sm"
                                    >
                                        Select All Features{' '}
                                    </Button>
                                </td>
                            </tr>
                            <tr>
                                <td>{transformControls}</td>
                            </tr>
                            <tr>
                                <td>{coefficientControls}</td>
                            </tr>
                        </tbody>
                    </table>
                </ModalBody>
            </Modal>
        )
        return modal
    }
}
