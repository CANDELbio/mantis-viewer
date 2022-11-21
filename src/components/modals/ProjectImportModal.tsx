/* eslint-disable no-extra-boolean-cast */
import { observer } from 'mobx-react'
import * as React from 'react'
import { Grid, Row, Col } from 'react-flexbox-grid'
import Select from 'react-select'
import { Modal, ModalHeader, ModalBody, Button } from 'reactstrap'
import * as path from 'path'
import { FeatureCalculationOption, FeatureCalculationOptions } from '../../definitions/UIDefinitions'
import {
    SelectStyle,
    SelectTheme,
    SelectOption,
    getSelectedOptions,
    generateSelectOptions,
    onClearableSelectChange,
} from '../../lib/SelectUtils'

export interface ProjectImportModalProps {
    open: boolean
    directory: string | null
    openDirectoryPicker: () => void
    closeModal: () => void
    readyToImport: boolean
    import: () => void
    projectDirectories: string[]
    projectTextFiles: string[]
    setImageSet: (imageSet: string | null) => void
    imageSet: string | null
    imageSetTiffs: string[]
    imageSetTextFiles: string[]
    imageSetDirs: string[]
    imageSubdir: string | null
    setImageSubdir: (file: string | null) => void
    setSegmentation: (file: string | null) => void
    segmentation: string | null
    calculateFeatures: FeatureCalculationOption
    setCalculateFeatures: (value: FeatureCalculationOption) => void
    setRegion: (file: string | null) => void
    region: string | null
    imageSetIsStacked: boolean
    setProjectMarkerNames: (file: string | null) => void
    projectMarkerNames: string | null
    setImageSetMarkerNames: (file: string | null) => void
    imageSetMarkerNames: string | null
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
export class ProjectImportModal extends React.Component<ProjectImportModalProps, Record<string, never>> {
    public constructor(props: ProjectImportModalProps) {
        super(props)
    }

    private rowStyle = { marginBottom: '5px' }

    private onCalculateFeaturesSelect = (x: SelectOption): void => {
        if (x != null) this.props.setCalculateFeatures(x.value as FeatureCalculationOption)
    }

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
        const segmentationOptions = generateSelectOptions(this.props.imageSetTextFiles.concat(this.props.imageSetTiffs))
        const selectedSegmentation = getSelectedOptions(this.props.segmentation, segmentationOptions)
        const projectTextOptions = generateSelectOptions(this.props.projectTextFiles)
        const selectedProjectMarkerNames = getSelectedOptions(this.props.projectMarkerNames, projectTextOptions)
        const selectedProjectFeatures = getSelectedOptions(this.props.projectFeatures, projectTextOptions)
        const imageSetTextOptions = generateSelectOptions(this.props.imageSetTextFiles)
        const selectedImageSetFeatures = getSelectedOptions(this.props.imageSetFeatures, imageSetTextOptions)
        const selectedImageSetMarkerNames = getSelectedOptions(this.props.imageSetMarkerNames, imageSetTextOptions)
        const selectedPopulation = getSelectedOptions(this.props.population, projectTextOptions)
        const selectedCalculateFeatures = getSelectedOptions(this.props.calculateFeatures, FeatureCalculationOptions)

        let projectStats = null
        if (directory) {
            projectStats = (
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4} />
                    <Col xs={8}>Directory has {projectDirectories.length} images</Col>
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
            featureStatsBody = `File has ${numFeatures} features across ${numImageSetsWithFeatures} images`
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
            populationStatsBody = `File has ${numPopulations} populations across ${numImageSetsWithPopulations} images`
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
                    <Col xs={4}>Representative Image Directory:</Col>
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
                    <Col xs={4}>Project Marker Name Override File:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedProjectMarkerNames}
                            options={projectTextOptions}
                            onChange={onClearableSelectChange(this.props.setProjectMarkerNames)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={!this.props.imageSetIsStacked || Boolean(this.props.imageSetMarkerNames)}
                        />
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Image Marker Name Override File:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedImageSetMarkerNames}
                            options={imageSetTextOptions}
                            onChange={onClearableSelectChange(this.props.setImageSetMarkerNames)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={!this.props.imageSetIsStacked || Boolean(this.props.projectMarkerNames)}
                        />
                    </Col>
                </Row>
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Project Segment Features File:</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedProjectFeatures}
                            options={projectTextOptions}
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
                            options={imageSetTextOptions}
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
                            options={projectTextOptions}
                            onChange={onClearableSelectChange(this.props.setPopulations)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={!Boolean(this.props.segmentation)}
                        />
                    </Col>
                </Row>
                {populationStats}
                <Row middle="xs" center="xs" style={this.rowStyle}>
                    <Col xs={4}>Calculate Segment Features (mean, median, and area):</Col>
                    <Col xs={8}>
                        <Select
                            value={selectedCalculateFeatures}
                            options={FeatureCalculationOptions}
                            onChange={this.onCalculateFeaturesSelect}
                            isClearable={false}
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
