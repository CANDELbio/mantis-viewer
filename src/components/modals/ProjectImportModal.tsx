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

export interface ProjectImportModalProps {
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
    imageSetDirs: string[]
    imageSubdir: string | null
    setImageSubdir: (file: string | null) => void
    setSegmentation: (file: string | null) => void
    segmentation: string | null
    setRegion: (file: string | null) => void
    region: string | null
    setFeatures: (file: string | null) => void
    features: string | null
    setPopulations: (file: string | null) => void
    population: string | null
}

@observer
export class ProjectImportModal extends React.Component<ProjectImportModalProps, {}> {
    public constructor(props: ProjectImportModalProps) {
        super(props)
    }

    private rowStyle = { marginBottom: '5px' }

    private generateForm(): JSX.Element | null {
        let buttonText = 'Click to Select'
        if (this.props.directory) buttonText = path.basename(this.props.directory)
        const imageSetOptions = generateSelectOptions(this.props.projectDirectories)
        const selectedImageSet = getSelectedOptions(this.props.imageSet, imageSetOptions)
        const imageDirectoryOptions = generateSelectOptions(this.props.imageSetDirs)
        const selectedImageSubdir = getSelectedOptions(this.props.imageSubdir, imageDirectoryOptions)
        const regionOptions = generateSelectOptions(this.props.imageSetTiffs)
        const selectedRegion = getSelectedOptions(this.props.region, regionOptions)
        const segmentationOptions = generateSelectOptions(this.props.imageSetCsvs.concat(this.props.imageSetTiffs))
        const selectedSegmentation = getSelectedOptions(this.props.segmentation, segmentationOptions)
        const featureOptions = generateSelectOptions(this.props.projectCsvs)
        const selectedFeature = getSelectedOptions(this.props.features, featureOptions)
        const populationOptions = generateSelectOptions(this.props.projectCsvs)
        const selectedPopulation = getSelectedOptions(this.props.population, populationOptions)
        return (
            <Grid>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Project Directory:</Col>
                    <Col xs={8}>
                        <Button type="button" size="sm" onClick={this.props.openDirectoryPicker}>
                            {buttonText}
                        </Button>
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Representative Image Set:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedImageSet}
                            options={imageSetOptions}
                            onChange={onClearableSelectChange(this.props.setImageSet)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={this.props.projectDirectories.length == 0}
                        />
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Image Subdirectory:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedImageSubdir}
                            options={imageDirectoryOptions}
                            onChange={onClearableSelectChange(this.props.setImageSubdir)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={this.props.imageSetDirs.length == 0}
                        />
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Region File:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedRegion}
                            options={regionOptions}
                            onChange={onClearableSelectChange(this.props.setRegion)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={!Boolean(this.props.imageSet)}
                        />
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Segmentation File:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedSegmentation}
                            options={segmentationOptions}
                            onChange={onClearableSelectChange(this.props.setSegmentation)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={!Boolean(this.props.imageSet)}
                        />
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Segment Features File:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedFeature}
                            options={featureOptions}
                            onChange={onClearableSelectChange(this.props.setFeatures)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={!Boolean(this.props.segmentation)}
                        />
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Populations File:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedPopulation}
                            options={populationOptions}
                            onChange={onClearableSelectChange(this.props.setPopulations)}
                            isClearable={true}
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
                    <ModalHeader>Import New Project</ModalHeader>
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
