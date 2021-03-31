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
    setProjectFeatures: (file: string | null) => void
    projectFeatures: string | null
    setImageSetFeatures: (file: string | null) => void
    imageSetFeatures: string | null
    numFeatures: number | null
    numImageSetsWithFeatures: number | null
    featuresError: boolean
    setPopulations: (file: string | null) => void
    population: string | null
    numPopulations: number | null
    numImageSetsWithPopulations: number | null
    populationError: boolean
}

@observer
export class ProjectImportModal extends React.Component<ProjectImportModalProps, {}> {
    public constructor(props: ProjectImportModalProps) {
        super(props)
    }

    private rowStyle = { marginBottom: '5px' }

    private generateForm(): JSX.Element | null {
        const directory = this.props.directory
        const projectDirectories = this.props.projectDirectories
        let buttonText = 'Click to Select'

        if (directory) buttonText = path.basename(directory)
        const imageSetOptions = generateSelectOptions(projectDirectories)
        const selectedImageSet = getSelectedOptions(this.props.imageSet, imageSetOptions)
        const imageDirectoryOptions = generateSelectOptions(this.props.imageSetDirs)
        const selectedImageSubdir = getSelectedOptions(this.props.imageSubdir, imageDirectoryOptions)
        const regionOptions = generateSelectOptions(this.props.imageSetTiffs)
        const selectedRegion = getSelectedOptions(this.props.region, regionOptions)
        const segmentationOptions = generateSelectOptions(this.props.imageSetCsvs.concat(this.props.imageSetTiffs))
        const selectedSegmentation = getSelectedOptions(this.props.segmentation, segmentationOptions)
        const projectFeatureOptions = generateSelectOptions(this.props.projectCsvs)
        const selectedProjectFeatures = getSelectedOptions(this.props.projectFeatures, projectFeatureOptions)
        const imageSetFeatureOptions = generateSelectOptions(this.props.imageSetCsvs)
        const selectedImageSetFeatures = getSelectedOptions(this.props.imageSetFeatures, imageSetFeatureOptions)
        const populationOptions = generateSelectOptions(this.props.projectCsvs)
        const selectedPopulation = getSelectedOptions(this.props.population, populationOptions)

        let projectStats = null
        if (directory) {
            projectStats = (
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4} />
                    <Col xs={8}>Directory has {projectDirectories.length} image sets</Col>
                </Row>
            )
        }

        const numFeatures = this.props.numFeatures
        const numImageSetsWithFeatures = this.props.numImageSetsWithFeatures
        let featureStatsBody = null
        let featureStats = null
        let projectFeatureStats = null
        let imageSetFeatureStats = null
        if (this.props.featuresError) {
            featureStatsBody = 'Error parsing segment features file'
        } else if (numFeatures && numImageSetsWithFeatures) {
            featureStatsBody = `File has ${numFeatures} features across ${numImageSetsWithFeatures} image sets`
        }

        if (featureStatsBody)
            featureStats = (
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4} />
                    <Col xs={8}>{featureStatsBody}</Col>
                </Row>
            )

        if (featureStatsBody && this.props.projectFeatures) projectFeatureStats = featureStats
        if (featureStatsBody && this.props.imageSetFeatures) imageSetFeatureStats = featureStats

        const numPopulations = this.props.numPopulations
        const numImageSetsWithPopulations = this.props.numImageSetsWithPopulations
        let populationStatsBody = null
        let populationStats = null
        if (this.props.populationError) {
            populationStatsBody = 'Error parsing populations file'
        } else if (numPopulations && numImageSetsWithPopulations) {
            populationStatsBody = `File has ${numPopulations} populations across ${numImageSetsWithPopulations} image sets`
        }

        if (populationStatsBody) {
            populationStats = (
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4} />
                    <Col xs={8}>{populationStatsBody}</Col>
                </Row>
            )
        }

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
                {projectStats}
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
                    <Col xs={4}>Project Segment Features File:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedProjectFeatures}
                            options={projectFeatureOptions}
                            onChange={onClearableSelectChange(this.props.setProjectFeatures)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={!Boolean(this.props.segmentation) || Boolean(this.props.imageSetFeatures)}
                        />
                    </Col>
                </Row>
                {projectFeatureStats}
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Image Segment Features File:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedImageSetFeatures}
                            options={imageSetFeatureOptions}
                            onChange={onClearableSelectChange(this.props.setImageSetFeatures)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={!Boolean(this.props.segmentation) || Boolean(this.props.projectFeatures)}
                        />
                    </Col>
                </Row>
                {imageSetFeatureStats}
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
                {populationStats}
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
