import { observable, action, autorun, computed, runInAction, when } from 'mobx'
import _ from 'underscore'
import * as path from 'path'
import * as fs from 'fs'

import { ImageSetStore } from './ImageSetStore'
import { randomHexColor } from '../lib/ColorHelper'
import { pixelIndexesToBitmap } from '../lib/GraphicsUtils'
import { Db } from '../lib/Db'

import { importRegionTiff, RegionDataImporterResult, RegionDataImporterError } from '../workers/RegionDataImporter'

import { TiffWriter } from '../lib/TiffWriter'

// Prefixes for new populations selected from graph or image.
const GraphPopulationNamePrefix = 'Graph'
const ImagePopulationNamePrefix = 'Image'
const ImportedPopulationNamePrefix = 'Imported'

export interface SelectedPopulation {
    id: string
    renderOrder: number
    name: string
    color: number
    visible: boolean
    pixelIndexes?: number[]
    // The IDs of the selected segments
    selectedSegments: number[]
    regionBitmap?: ImageBitmap
}

export class PopulationStore {
    public constructor(imageSetStore: ImageSetStore) {
        this.imageSetStore = imageSetStore
        this.initialize()
    }

    private imageSetStore: ImageSetStore
    private db: Db
    // Set to true when selected regions are loading from a labeled tiff.
    @observable.ref selectionsLoading: boolean
    // An array of the regions selected.
    @observable.ref public selectedPopulations: SelectedPopulation[]
    // ID of a region to be highlighted. Used when mousing over in list of selected regions.
    @observable.ref public highlightedPopulations: string[]
    // Name of feature selected by user in the selected populations -> create population tooltip for creating a new population from a feature and intensity range.
    @observable public selectedFeatureForNewPopulation: string | null

    @action public initialize = (): void => {
        this.selectedPopulations = []
        this.highlightedPopulations = []
        this.selectionsLoading = false
        this.selectedFeatureForNewPopulation = null
        const imageSetName = this.imageSetStore.name
        const projectBasePath = this.imageSetStore.projectStore.settingStore.basePath
        if (projectBasePath) {
            this.db = new Db(projectBasePath)
            when(
                (): boolean => this.imageSetStore.imageStore.imageData != null,
                (): void => this.refreshGraphicsAndSetPopulations(this.db.getSelections(imageSetName)),
            )
        }
    }

    // Computed function that gets the populations for any segments that are being moused over on the image.
    // Returns a map of segment id to a list of the population ids that it belongs to.
    @computed get populationsForMousedOverSegments(): Record<number, string[]> {
        const populationsForSegments: Record<number, string[]> = {}
        const imageSetStore = this.imageSetStore
        const segmentationStore = imageSetStore.segmentationStore
        const mousedOverSegments = segmentationStore.mousedOverSegments
        if (mousedOverSegments) {
            for (const mousedOverSegment of mousedOverSegments) {
                populationsForSegments[mousedOverSegment] = []
                for (const population of this.selectedPopulations) {
                    if (population.selectedSegments.includes(mousedOverSegment)) {
                        populationsForSegments[mousedOverSegment].push(population.id)
                    }
                }
            }
        }
        return populationsForSegments
    }

    // Automatically imports a region tiff file if it's set on the setting store.
    // TODO: Might want to only have this run of this is the active image set.
    private autoImportRegions = autorun(() => {
        const imageSetStore = this.imageSetStore
        const imageSetDirectory = imageSetStore.directory
        const imageSetName = imageSetStore.name
        const imageStore = imageSetStore.imageStore
        // Unused reference to trigger autorun when the image data gets loaded.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const imageData = imageStore.imageData

        const settingStore = imageSetStore.projectStore.settingStore
        const imageSubdirectory = settingStore.imageSubdirectory
        const regionsBasename = settingStore.regionsBasename

        if (imageData != null && regionsBasename) {
            // If the regions basename is set in settings then import regions from that tiff if we haven't already
            const regionsFile =
                imageSubdirectory && imageSubdirectory.length > 0
                    ? path.join(imageSetDirectory, imageSubdirectory, regionsBasename)
                    : path.join(imageSetDirectory, regionsBasename)
            // If the file exists and we haven't already imported from it, import it.
            if (fs.existsSync(regionsFile)) {
                if (!settingStore.regionsFilesLoaded.includes(imageSetName)) {
                    this.importRegionsFromTiff(regionsFile)
                }
                imageStore.removeMarker(regionsBasename)
            }
        }
    })

    // Automatically refreshes all of the graphics when segmentation data changes
    private autoRefreshGraphics = autorun(() => {
        // Refresh all the graphics and selected segments if segmentation has changed
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const segmentationData = this.imageSetStore.segmentationStore.segmentationData
        const imageData = this.imageSetStore.imageStore.imageData
        if (imageData && this.selectedPopulations.length > 0)
            this.refreshGraphicsAndSetPopulations(this.selectedPopulations.slice())
    })

    // Automatically saves populations to the db when they change
    private autoSavePopulations = autorun(() => {
        const imageSetStore = this.imageSetStore
        if (imageSetStore.directory) {
            this.db.upsertSelections(this.imageSetStore.name, this.selectedPopulations)
        }
    })

    private newROIName(renderOrder: number, namePrefix: string | null): string {
        const name = namePrefix ? namePrefix + ' Selection ' : 'Selection '
        return name + renderOrder.toString()
    }

    private getRenderOrder(): number {
        const renderOrders = _.pluck(this.selectedPopulations, 'renderOrder')
        if (renderOrders.length > 0) return Math.max(...renderOrders) + 1
        return 1
    }

    @action private setSelectedPopulations = (populations: SelectedPopulation[]): void => {
        if (!_.isEqual(populations, this.selectedPopulations)) {
            this.selectedPopulations = populations
        }
    }

    @action private addToSelectedPopulations = (newPopulations: SelectedPopulation[]): void => {
        this.selectedPopulations = this.selectedPopulations.concat(newPopulations)
    }

    private refreshGraphics = async (populations: SelectedPopulation[]): Promise<SelectedPopulation[]> => {
        const refreshedPopulations = []
        const imageData = this.imageSetStore.imageStore.imageData
        const segmentationData = this.imageSetStore.segmentationStore.segmentationData
        for (const population of populations) {
            const pixelIndexes = population.pixelIndexes
            if (imageData) {
                // If this selection has pixel indexes (i.e. a region selected on the image)
                // Then we want to refresh the region graphics
                if (pixelIndexes) {
                    population.regionBitmap = await pixelIndexesToBitmap(
                        pixelIndexes,
                        imageData.width,
                        imageData.height,
                    )
                    if (segmentationData) {
                        // If segmentation data is loaded use the region to find the segments selected
                        population.selectedSegments = segmentationData.segmentsInRegion(pixelIndexes)
                    } else {
                        // Otherwise clear the segments selected
                        population.selectedSegments = []
                    }
                }
            }
            refreshedPopulations.push(population)
        }
        return refreshedPopulations
    }

    private refreshGraphicsAndAddToPopulations = (population: SelectedPopulation): void => {
        this.refreshGraphics([population]).then((refreshedPopulation) =>
            this.addToSelectedPopulations(refreshedPopulation),
        )
    }

    public refreshGraphicsAndSetPopulations = (populations: SelectedPopulation[]): void => {
        this.refreshGraphics(populations).then((refreshedPopulations) =>
            this.setSelectedPopulations(refreshedPopulations),
        )
    }

    public createPopulationFromPixels = (regionPixelIndexes: number[], color: number): void => {
        const order = this.getRenderOrder()
        const newPopulation: SelectedPopulation = {
            id: this.db.generateSelectionId(),
            renderOrder: order,
            pixelIndexes: regionPixelIndexes,
            selectedSegments: [],
            name: this.newROIName(order, ImagePopulationNamePrefix),
            color: color ? color : randomHexColor(),
            visible: true,
        }
        // Fancy stuff to get refresh to trigger from async block
        this.refreshGraphicsAndAddToPopulations(newPopulation)
    }

    public createPopulationFromSegments = (
        selectedSegments: number[],
        name?: string,
        color?: number,
    ): SelectedPopulation => {
        const order = this.getRenderOrder()
        const newPopulation: SelectedPopulation = {
            id: this.db.generateSelectionId(),
            renderOrder: order,
            selectedSegments: selectedSegments,
            name: name ? name : this.newROIName(order, GraphPopulationNamePrefix),
            color: color ? color : randomHexColor(),
            visible: true,
        }
        this.addToSelectedPopulations([newPopulation])
        return newPopulation
    }

    public addEmptyPopulation = (): void => {
        const order = this.getRenderOrder()
        const newPopulation: SelectedPopulation = {
            id: this.db.generateSelectionId(),
            renderOrder: order,
            selectedSegments: [],
            name: this.newROIName(order, 'Empty'),
            color: randomHexColor(),
            visible: true,
        }
        this.addToSelectedPopulations([newPopulation])
    }

    @action public deleteSelectedPopulation = (id: string): void => {
        if (this.selectedPopulations) {
            this.selectedPopulations = this.selectedPopulations.filter((region): boolean => region.id != id)
            if (this.db) {
                const imageSetName = this.imageSetStore.name
                this.db.deleteSelection(imageSetName, id)
            }
        }
    }

    // Deletes populations that were not created by selecting a region on the image
    // Used when the user changes the segmentation data so that old populations
    // are not carried over to different segmentation data.
    @action public deletePopulationsNotSelectedOnImage = (): void => {
        if (this.selectedPopulations) {
            const deleting: string[] = []
            this.selectedPopulations = this.selectedPopulations.filter((population): boolean => {
                if (population.pixelIndexes && population.pixelIndexes.length > 0) {
                    return true
                } else {
                    deleting.push(population.id)
                    return false
                }
            })
            if (this.db) {
                const imageSetName = this.imageSetStore.name
                for (const id of deleting) {
                    this.db.deleteSelection(imageSetName, id)
                }
            }
        }
    }

    @action public highlightSelectedPopulation = (id: string): void => {
        this.highlightedPopulations = this.highlightedPopulations.concat([id])
    }

    @action public unHighlightSelectedPopulation = (id: string): void => {
        this.highlightedPopulations = this.highlightedPopulations.filter((regionId): boolean => regionId != id)
    }

    @action public setAllSelectedPopulationVisibility = (visible: boolean): void => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.slice().map(function (region): SelectedPopulation {
                region.visible = visible
                return region
            })
        }
    }

    public getSelectedPopulationsAsArray = (): string[][] => {
        const asArray: string[][] = []
        this.selectedPopulations.map((population: SelectedPopulation): void => {
            population.selectedSegments.map((segmentId: number): void => {
                asArray.push([segmentId.toString(), population.name])
            })
        })
        return asArray
    }

    private regionPresent = (pixelIndexes: number[]): boolean => {
        for (const population of this.selectedPopulations) {
            const curIndexes = population.pixelIndexes
            if (curIndexes && curIndexes.length == pixelIndexes.length) {
                for (let i = 0; i < curIndexes.length; i++) {
                    if (curIndexes[i] != pixelIndexes[i]) break
                    if (i == curIndexes.length - 1) return true
                }
            }
        }
        return false
    }

    @action private markRegionsLoaded = (): void => {
        this.selectionsLoading = false
        const imageSetStore = this.imageSetStore
        const imageSetName = imageSetStore.name
        const settingStore = imageSetStore.projectStore.settingStore
        settingStore.addToRegionFilesLoaded(imageSetName)
    }

    @action private onRegionImportComplete = (result: RegionDataImporterResult | RegionDataImporterError): void => {
        if ('error' in result) {
            this.imageSetStore.projectStore.notificationStore.setErrorMessage(result.error)
        } else {
            const newPopulations: SelectedPopulation[] = []
            const newRegionMap = result.regionIndexMap
            let order = this.getRenderOrder()
            for (const regionIdStr in newRegionMap) {
                const regionId = parseInt(regionIdStr)
                const regionPixels = newRegionMap[regionId]
                // If a region is already selected with the same pixels then don't add this one.
                // We do this because once regions are loaded from a tiff we save them to the db
                // On app reload we reload the saved regions from the db and then also try to reload
                // the regions from a tiff, and we don't want duplicate regions.
                // This seems to be fast and feels simpler than adding an extra db table/field to keep
                // track of the image sets that we've loaded regions from tiffs for.
                // TODO: Might get weird if user deletes regions loaded from tiff and then they get reloaded.
                if (!this.regionPresent(regionPixels)) {
                    const newPopulation = {
                        id: this.db.generateSelectionId(),
                        renderOrder: order,
                        pixelIndexes: regionPixels,
                        selectedSegments: [],
                        name: this.newROIName(regionId, ImportedPopulationNamePrefix),
                        color: randomHexColor(),
                        visible: true,
                    }
                    newPopulations.push(newPopulation)
                    order += 1
                }
            }
            this.refreshGraphics(newPopulations).then((refreshedPopulations) => {
                this.addToSelectedPopulations(refreshedPopulations)
                this.markRegionsLoaded()
            })
        }
    }

    @action public importRegionsFromTiff = (filePath: string): void => {
        const imageData = this.imageSetStore.imageStore.imageData
        if (imageData) {
            this.selectionsLoading = true
            importRegionTiff(
                { filePath: filePath, width: imageData.width, height: imageData.height },
                this.onRegionImportComplete,
            )
        }
    }

    public exportToTiff = (filePath: string): void => {
        const imageData = this.imageSetStore.imageStore.imageData
        if (imageData) {
            const width = imageData.width
            const height = imageData.height
            const length = width * height
            const populationData = new Uint8ClampedArray(length)
            this.selectedPopulations.forEach((population: SelectedPopulation, idx: number): void => {
                if (population.pixelIndexes) {
                    for (const pixel of population.pixelIndexes) {
                        populationData[pixel] = idx + 1
                    }
                }
            })
            // TODO: arrayToFile creates an 8 bit tiff.
            // We should raise an error if there are more than 255 populations.
            TiffWriter.arrayToFile(populationData, width, height, filePath)
        }
    }

    @action public setSelectedFeatureForNewPopulation = (feature: string | null): void => {
        this.selectedFeatureForNewPopulation = feature
    }

    @action private updatePopulationById = (
        id: string,
        updateFn: (population: SelectedPopulation) => SelectedPopulation,
    ): void => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.slice().map((population): SelectedPopulation => {
                if (population.id == id) {
                    return updateFn(population)
                } else {
                    return population
                }
            })
        }
    }

    public updateSelectedPopulationColor = (id: string, color: number): void => {
        if (this.selectedPopulations != null) {
            const updateFn = (p: SelectedPopulation) => {
                p.color = color
                return p
            }
            this.updatePopulationById(id, updateFn)
        }
    }

    public updateSelectedPopulationSegments = (id: string, segments: number[]): void => {
        const updateFn = (p: SelectedPopulation) => {
            p.selectedSegments = segments
            return p
        }
        this.updatePopulationById(id, updateFn)
    }

    public removeSegmentFromPopulation = (segment: number, id: string): void => {
        const updateFn = (p: SelectedPopulation) => {
            const index = p.selectedSegments.indexOf(segment)
            if (index > -1) {
                p.selectedSegments.splice(index, 1)
            }
            return p
        }
        this.updatePopulationById(id, updateFn)
    }

    public addSegmentToPopulation = (segment: number, id: string): void => {
        const updateFn = (p: SelectedPopulation) => {
            p.selectedSegments.push(segment)
            return p
        }
        this.updatePopulationById(id, updateFn)
    }

    @action public updateSelectedPopulationName = (id: string, newName: string): void => {
        const updateFn = (p: SelectedPopulation) => {
            p.name = newName
            return p
        }
        this.updatePopulationById(id, updateFn)
    }

    @action public updateSelectedPopulationVisibility = (id: string, visible: boolean): void => {
        const updateFn = (p: SelectedPopulation) => {
            p.visible = visible
            return p
        }
        this.updatePopulationById(id, updateFn)
    }
}
