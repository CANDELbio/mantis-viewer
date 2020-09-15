import { observable, action, autorun, when } from 'mobx'
import * as fs from 'fs'
import path = require('path')
import { ProjectStore } from './ProjectStore'
import { DbFilename } from '../definitions/UIDefinitions'
import { parseProjectPopulationCSV, parseSegmentDataCSV } from '../lib/IO'

export class ProjectImportStore {
    private projectStore: ProjectStore

    @observable public modalOpen: boolean
    @observable public showDirectoryPicker: boolean

    @observable public directory: string | null
    @observable public projectDirectories: string[]
    @observable public projectCsvs: string[]

    @observable public imageSet: string | null
    @observable public imageSetTiffs: string[]
    @observable public imageSetCsvs: string[]
    @observable public imageSetDirs: string[]

    @observable public projectPopulationFile: string | null
    @observable public numImageSetsInPopulationFile: number | null
    @observable public numPopulationsInPopulationsFile: number | null
    @observable public populationsFileError: boolean
    @observable public projectSegmentFeaturesFile: string | null
    @observable public numImageSetsInFeaturesFile: number | null
    @observable public numFeaturesInFeaturesFile: number | null
    @observable public featuresFileError: boolean
    @observable public imageSetSegmentationFile: string | null
    @observable public imageSetRegionFile: string | null
    @observable public imageSubdirectory: string | null

    @observable public readyToImport: boolean

    public constructor(projectStore: ProjectStore) {
        this.projectStore = projectStore
        this.initialize()
    }

    @action private initialize = (): void => {
        this.modalOpen = false
        this.directory = null
        this.showDirectoryPicker = false
        this.readyToImport = false
        this.populationsFileError = false
        this.featuresFileError = false
        this.projectDirectories = []
        this.projectCsvs = []
        this.clearFileSelections()
    }

    private autoSetReadyToImport = autorun(() => {
        const ready =
            this.directory != null &&
            this.imageSetTiffs.length > 0 &&
            !this.featuresFileError &&
            !this.populationsFileError
        this.setReadyToImport(ready)
    })

    private autoUpdateProjectPopulationStats = autorun(() => {
        this.updateProjectPopulationFileStats(this.directory, this.projectPopulationFile)
    })

    private autoUpdateProjectSegmentFeatureStats = autorun(() => {
        this.updateProjectSegmentFeatureStats(this.directory, this.projectSegmentFeaturesFile)
    })
    @action setReadyToImport = (value: boolean): void => {
        this.readyToImport = value
    }

    @action public setModalOpen = (open: boolean): void => {
        this.modalOpen = open
    }

    @action public cancelImport = (): void => {
        this.modalOpen = false
        this.setDirectory(null)
    }

    @action private clearFileSelections = (): void => {
        this.setImageSet(null)
        this.projectPopulationFile = null
        this.projectSegmentFeaturesFile = null
        this.imageSetSegmentationFile = null
        this.imageSetRegionFile = null
        this.imageSubdirectory = null
    }

    @action public setDirectory = (directory: string | null): void => {
        this.directory = directory
        this.clearFileSelections()
        this.updateProjectDirectoriesAndFiles()
    }

    @action public setShowDirectoryPicker = (show: boolean): void => {
        this.showDirectoryPicker = show
    }

    @action private updateProjectDirectoriesAndFiles = (): void => {
        const dirs = []
        const csvs = []
        if (this.directory) {
            const entries = fs.readdirSync(this.directory, { withFileTypes: true })
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    dirs.push(entry.name)
                } else if (entry.isFile()) {
                    const lowerFileName = entry.name.toLowerCase()
                    if (lowerFileName.endsWith('csv')) csvs.push(entry.name)
                }
            }
        }
        this.projectDirectories = dirs
        this.projectCsvs = csvs
        // Default the selected image set to the first directory in the project
        if (this.projectDirectories.length > 0) this.setImageSet(this.projectDirectories[0])
    }

    @action public setImageSet = (imageSet: string | null): void => {
        this.imageSet = imageSet
        if (imageSet == null) {
            this.setImageSetSegmentationFile(null)
        }
        this.updateImageSetFiles()
    }

    @action public updateImageSetFiles = (): void => {
        const tiffs = []
        const csvs = []
        const dirs = []
        if (this.directory && this.imageSet) {
            const imageSetPath = path.join(this.directory, this.imageSet)
            const entries = fs.readdirSync(imageSetPath, { withFileTypes: true })
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    dirs.push(entry.name)
                } else if (entry.isFile()) {
                    const lowerFileName = entry.name.toLowerCase()
                    if (lowerFileName.endsWith('tif') || lowerFileName.endsWith('tiff')) tiffs.push(entry.name)
                    if (lowerFileName.endsWith('csv') || lowerFileName.endsWith('txt')) csvs.push(entry.name)
                }
            }
        }
        this.imageSetTiffs = tiffs
        this.imageSetCsvs = csvs
        this.imageSetDirs = dirs
    }

    @action public setProjectPopulationFile = (file: string | null): void => {
        this.projectPopulationFile = file
    }

    @action public updateProjectSegmentFeatureStats = (
        directory: string | null,
        projectPopulationFile: string | null,
    ): void => {
        if (directory && projectPopulationFile) {
            try {
                const filePath = path.join(directory, projectPopulationFile)
                const parsed = parseSegmentDataCSV(filePath)
                const features = parsed.data
                const imageSets: Set<string> = new Set()
                const featureNames: Set<string> = new Set()
                for (const curImageSet of Object.keys(features)) {
                    imageSets.add(curImageSet)
                    const curFeatures = features[curImageSet]
                    for (const curFeature of Object.keys(curFeatures)) {
                        featureNames.add(curFeature)
                    }
                }
                this.numImageSetsInFeaturesFile = imageSets.size
                this.numFeaturesInFeaturesFile = featureNames.size
            } catch (e) {
                console.log('Error parsing project features file:')
                console.log(e)
                this.numImageSetsInFeaturesFile = null
                this.numFeaturesInFeaturesFile = null
                this.featuresFileError = true
            }
        } else {
            this.numImageSetsInFeaturesFile = null
            this.numFeaturesInFeaturesFile = null
            this.featuresFileError = false
        }
    }

    @action public setProjectSegmentFeaturesFile = (file: string | null): void => {
        this.projectSegmentFeaturesFile = file
    }

    @action public updateProjectPopulationFileStats = (
        directory: string | null,
        projectFeatureFile: string | null,
    ): void => {
        if (directory && projectFeatureFile) {
            try {
                const filePath = path.join(directory, projectFeatureFile)
                const populations = parseProjectPopulationCSV(filePath)
                const imageSets: Set<string> = new Set()
                const populationNames: Set<string> = new Set()
                for (const curImageSet of Object.keys(populations)) {
                    imageSets.add(curImageSet)
                    const curPopulations = populations[curImageSet]
                    for (const curPopulation of Object.keys(curPopulations)) {
                        populationNames.add(curPopulation)
                    }
                }
                this.numImageSetsInPopulationFile = imageSets.size
                this.numPopulationsInPopulationsFile = populationNames.size
            } catch (e) {
                console.log('Error parsing project population file:')
                console.log(e)
                this.numImageSetsInPopulationFile = null
                this.numPopulationsInPopulationsFile = null
                this.populationsFileError = true
            }
        } else {
            this.numImageSetsInPopulationFile = null
            this.numPopulationsInPopulationsFile = null
            this.populationsFileError = false
        }
    }

    @action public setImageSetSegmentationFile = (file: string | null): void => {
        this.imageSetSegmentationFile = file
        if (file == null) {
            this.setProjectPopulationFile(null)
            this.setProjectSegmentFeaturesFile(null)
        }
    }

    @action setImageSetRegionFile = (file: string | null): void => {
        this.imageSetRegionFile = file
    }

    @action public setImageSubdirectory = (file: string | null): void => {
        this.imageSubdirectory = file
    }

    public import = (): void => {
        const projectStore = this.projectStore
        if (projectStore.imageSetPaths.length > 0) {
            projectStore.notificationStore.setCheckImportProject(true)
        } else {
            this.continueImport()
        }
    }

    private eraseDbIfExists = (): void => {
        if (this.directory) {
            const dbPath = path.join(this.directory, DbFilename)
            if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
        }
    }

    // Not sure if it's better to have this logic in here
    // or to have it in the project store and trigger when a flag gets set to true.
    @action public continueImport = (): void => {
        this.modalOpen = false
        if (this.directory) {
            const projectStore = this.projectStore
            // If we're importing through the project import wizard then this should be a new project or the user has agreed to reinitialize.
            this.eraseDbIfExists()
            projectStore.openProject(this.directory, this.imageSubdirectory)
            const activeImageSet = projectStore.activeImageSetStore
            const activeImageStore = activeImageSet.imageStore
            const activeSegmentationStore = activeImageSet.segmentationStore
            when(
                (): boolean => !activeImageStore.imageDataLoading,
                (): void => {
                    const segmentationFile = this.imageSetSegmentationFile
                    const activeImageSetName = projectStore.activeImageSetPath
                    if (activeImageSetName && segmentationFile) {
                        const segmentationPath = path.join(activeImageSetName, segmentationFile)
                        if (fs.existsSync(segmentationPath)) {
                            projectStore.setSegmentationBasename(segmentationPath)
                        } else {
                            const msg =
                                'Unable to find segmentation file ' +
                                segmentationFile +
                                ' in image set ' +
                                activeImageSetName
                            projectStore.notificationStore.setErrorMessage(msg)
                        }
                        when(
                            (): boolean => !activeSegmentationStore.segmentationDataLoading,
                            (): void => {
                                if (this.directory) {
                                    const regionFile = this.imageSetRegionFile
                                    if (regionFile) {
                                        const regionPath = path.join(activeImageSetName, regionFile)
                                        if (fs.existsSync(segmentationPath)) {
                                            projectStore.importRegionTiff(regionPath)
                                        } else {
                                            const msg =
                                                'Unable to find region file ' +
                                                regionFile +
                                                ' in image set ' +
                                                activeImageSetName
                                            projectStore.notificationStore.setErrorMessage(msg)
                                        }
                                    }
                                    if (this.projectPopulationFile)
                                        projectStore.importProjectPopulationsFromCSV(
                                            path.join(this.directory, this.projectPopulationFile),
                                        )
                                    if (this.projectSegmentFeaturesFile)
                                        projectStore.setImportingSegmentFeaturesValues(
                                            path.join(this.directory, this.projectSegmentFeaturesFile),
                                            true,
                                        )
                                }
                                // Reinitialize when we're done loading if we have segmentation data to load
                                this.initialize()
                            },
                        )
                    } else {
                        // Reinitialize when we're done loading if we have don't segmentation data to load
                        this.initialize()
                    }
                },
            )
        }
    }
}
