import * as React from 'react'
import { observer } from 'mobx-react'
import Select from 'react-select'
import { Modal, ModalHeader, ModalBody, Button } from 'reactstrap'
import { Grid, Row, Col } from 'react-flexbox-grid'
import {
    SelectStyle,
    SelectTheme,
    getSelectedOptions,
    generateSelectOptions,
    onClearableSelectChange,
} from '../../lib/SelectHelper'
import path = require('path')

export interface DataImportModalProps {
    open: boolean
    directory: string | null
    openDirectoryPicker: () => void
    closeModal: () => void
    readyToImport: boolean
    import: () => void
    projectDirectories: string[]
    projectCsvs: string[]
    setImageSet: (imageSet: string | null) => void
    imageSet: string | null
    imageSetTiffs: string[]
    imageSetCsvs: string[]
    setSegmentation: (file: string | null) => void
    segmentation: string | null
    setFeatures: (file: string | null) => void
    features: string | null
    setPopulations: (file: string | null) => void
    population: string | null
}

@observer
export class DataImportModal extends React.Component<DataImportModalProps, {}> {
    public constructor(props: DataImportModalProps) {
        super(props)
    }

    private rowStyle = { marginBottom: '5px' }

    private generateForm(): JSX.Element | null {
        let buttonText = 'Click to Select'
        if (this.props.directory) buttonText = path.basename(this.props.directory)
        const imageSetOptions = generateSelectOptions(this.props.projectDirectories)
        const selectedImageSet = getSelectedOptions(this.props.imageSet, imageSetOptions)
        const segmentationOptions = generateSelectOptions(this.props.imageSetCsvs.concat(this.props.imageSetTiffs))
        const selectedSegmentation = getSelectedOptions(this.props.segmentation, segmentationOptions)
        const featureOptions = generateSelectOptions(this.props.projectCsvs)
        const selectedFeature = getSelectedOptions(this.props.features, featureOptions)
        const populationOptions = generateSelectOptions(this.props.projectCsvs)
        const selectedPopulation = getSelectedOptions(this.props.population, populationOptions)
        return (
            <Grid>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Selected Project:</Col>
                    <Col xs={8}>
                        <Button type="button" size="sm" onClick={this.props.openDirectoryPicker}>
                            {buttonText}
                        </Button>
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Selected Image Set:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedImageSet}
                            options={imageSetOptions}
                            onChange={onClearableSelectChange(this.props.setImageSet)}
                            clearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={this.props.projectDirectories.length == 0}
                        />
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Selected Segmentation:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedSegmentation}
                            options={segmentationOptions}
                            onChange={onClearableSelectChange(this.props.setSegmentation)}
                            clearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={!Boolean(this.props.imageSet)}
                        />
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Selected Segment Features:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedFeature}
                            options={featureOptions}
                            onChange={onClearableSelectChange(this.props.setFeatures)}
                            clearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={!Boolean(this.props.segmentation)}
                        />
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Selected Populations:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedPopulation}
                            options={populationOptions}
                            onChange={onClearableSelectChange(this.props.setPopulations)}
                            clearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={!Boolean(this.props.segmentation)}
                        />
                    </Col>
                </Row>
            </Grid>
        )
    }

    public render(): React.ReactNode {
        let modal = null

        if (this.props.open) {
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>Project Import Wizard</ModalHeader>
                    <ModalBody>
                        <Grid>
                            <Row middle="xs" center="xs">
                                <Col xs={12}>{this.generateForm()}</Col>
                            </Row>
                            <Row middle="xs" center="xs">
                                <Col xs={6}>
                                    <Button type="button" size="sm" onClick={this.props.closeModal}>
                                        Cancel
                                    </Button>
                                </Col>
                                <Col xs={6}>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={this.props.import}
                                        disabled={!this.props.readyToImport}
                                    >
                                        Import
                                    </Button>
                                </Col>
                            </Row>
                        </Grid>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
