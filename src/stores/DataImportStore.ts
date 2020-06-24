import { observable, action, autorun, when } from 'mobx'
import * as fs from 'fs'
import path = require('path')
import { ProjectStore } from './ProjectStore'

export class DataImportStore {
    private projectStore: ProjectStore

    @observable public modalOpen: boolean
    @observable public showDirectoryPicker: boolean

    @observable public directory: string | null
    @observable public projectDirectories: string[]
    @observable public projectCsvs: string[]

    @observable public imageSet: string | null
    @observable public imageSetTiffs: string[]

    @observable public projectPopulationFile: string | null
    @observable public projectSegmentFeaturesFile: string | null
    @observable public imageSetSegmentationFile: string | null

    @observable public readyToImport: boolean

    public constructor(projectStore: ProjectStore) {
        this.projectStore = projectStore
        this.initialize()
    }

    @action public initialize = (): void => {
        this.modalOpen = false
        this.showDirectoryPicker = false
        this.readyToImport = false
        this.projectDirectories = []
        this.projectCsvs = []
        this.imageSetTiffs = []
    }

    private autoSetSegmentationFile = autorun(() => {
        const ready = this.directory != null && this.imageSetTiffs.length > 0
        this.setReadyToImport(ready)
    })

    @action setReadyToImport = (value: boolean): void => {
        this.readyToImport = value
    }

    @action public setModalOpen = (open: boolean): void => {
        this.modalOpen = open
    }

    @action public setDirectory = (directory: string | null): void => {
        this.directory = directory
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
            this.projectDirectories = dirs
            this.projectCsvs = csvs
        }
    }

    @action public setImageSet = (imageSet: string | null): void => {
        this.imageSet = imageSet
    }

    @action public updateImageSetTiffs = (): void => {
        const tiffs = []
        if (this.directory && this.imageSet) {
            const imageSetPath = path.join(this.directory, this.imageSet)
            const entries = fs.readdirSync(imageSetPath, { withFileTypes: true })
            for (const entry of entries) {
                if (entry.isFile()) {
                    const lowerFileName = entry.name.toLowerCase()
                    if (lowerFileName.endsWith('tif') || lowerFileName.endsWith('tiff')) tiffs.push(entry.name)
                }
            }
        }
        this.imageSetTiffs = tiffs
    }

    @action public setProjectPopulationFile = (file: string | null): void => {
        this.projectPopulationFile = file
    }

    @action public setProjectSegmentFeaturesFile = (file: string | null): void => {
        this.projectSegmentFeaturesFile = file
    }

    @action public setImageSetSegmentationFile = (file: string | null): void => {
        this.imageSetSegmentationFile = file
    }

    // Not sure if it's better to have this logic in here
    // or to have it in the project store and trigger when a flag gets set to true.
    @action public import = (): void => {
        this.modalOpen = false
        if (this.directory) {
            const projectStore = this.projectStore
            projectStore.openProject(this.directory)
            const activeImageSet = projectStore.activeImageSetStore
            const activeImageStore = activeImageSet.imageStore
            const activeSegmentationStore = activeImageSet.segmentationStore
            when(
                (): boolean => !activeImageStore.imageDataLoading,
                (): void => {
                    if (this.directory && this.imageSetSegmentationFile) {
                        const segmentationPath = path.join(this.directory, this.imageSetSegmentationFile)
                        projectStore.setSegmentationBasename(segmentationPath)
                        when(
                            (): boolean => !activeSegmentationStore.segmentationDataLoading,
                            (): void => {
                                if (this.projectPopulationFile)
                                    projectStore.importProjectPopulationsFromCSV(this.projectPopulationFile)
                                if (this.projectSegmentFeaturesFile)
                                    projectStore.setImportingSegmentFeaturesValues(
                                        this.projectSegmentFeaturesFile,
                                        true,
                                    )
                            },
                        )
                    }
                },
            )
        }
    }
}
