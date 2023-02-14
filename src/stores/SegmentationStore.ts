import { observable, action, autorun, computed } from 'mobx'
import * as fs from 'fs'
import * as path from 'path'

import { ImageSetStore } from './ImageSetStore'
import { SegmentOutlineColor, HighlightedSegmentOutlineColor } from '../../src/definitions/UIDefinitions'
import { highlightColor } from '../lib/ColorHelper'
import { SegmentationData } from '../lib/SegmentationData'
import { generatePixelMapKey } from '../lib/SegmentationUtils'

export interface SegmentOutlineAttributes {
    colors: number[]
    alphas: number[]
}

export class SegmentationStore {
    public constructor(imageSetStore: ImageSetStore) {
        this.imageSetStore = imageSetStore
        this.initialize()
    }

    private imageSetStore: ImageSetStore

    @observable public selectedSegmentationFile: string | null
    @observable public segmentationDataLoading: boolean
    @observable.ref public segmentationData: SegmentationData | null

    // Looks for a segmentation file with the same filename from source in dest and sets it if it exists.
    // TODO: Not sure if this should run for every segmentation store whenever the persistedValueStore segmentationBasename changes.
    // Might want to only have this run of this is the active image set.
    private autoSetSegmentationFile = autorun(() => {
        const imageStore = this.imageSetStore.imageStore
        const imageSetDirectory = this.imageSetStore.directory
        const imageData = imageStore.imageData
        const persistedValueStore = this.imageSetStore.projectStore.persistedValueStore
        const segmentationBasename = persistedValueStore.segmentationBasename
        const autoLoadSegmentation = persistedValueStore.autoLoadSegmentation

        // Check if there is a file to load and if image data has loaded (so we know width and height for text segmentation)
        if (segmentationBasename && autoLoadSegmentation && imageData && imageSetDirectory) {
            const imageSubdirectory = persistedValueStore.imageSubdirectory
            const segmentationFile =
                imageSubdirectory && imageSubdirectory.length > 0
                    ? path.join(imageSetDirectory, imageSubdirectory, segmentationBasename)
                    : path.join(imageSetDirectory, segmentationBasename)
            // If the segmentation file exists and it's not equal to the current file, clear segmentation data and set to the new.
            if (fs.existsSync(segmentationFile) && this.selectedSegmentationFile != segmentationFile) {
                this.clearSegmentationData()
                this.setSegmentationFile(segmentationFile)
            }
        }
    })

    // This feels bad using a computed value to just get something from another store (PersistedValueStore).
    // Using this because there is some logic around setting the user highlighted segment id
    // that needs to happen in this store, but we want to persist the user highlighted segment id
    // in case of restart.
    // Would be fixed by refactoring the persisted value store, but not enough time to pay down that
    // tech debt right now.
    @computed get userHighlightedSegment(): number | null {
        const persistedValueStore = this.imageSetStore.projectStore.persistedValueStore
        return persistedValueStore.selectedSegment
    }

    @computed get segmentIdsForUserHighlight(): number[] {
        if (this.segmentationData) {
            const limitHighlightedSegmentPopulationId =
                this.imageSetStore.projectStore.persistedValueStore.limitSelectedSegmentPopulationId
            const selectedPopulations = this.imageSetStore.populationStore.selectedPopulations
            if (limitHighlightedSegmentPopulationId) {
                const limitHighlightedSegmentPopulation = selectedPopulations.find(
                    (p) => p.id == limitHighlightedSegmentPopulationId,
                )
                if (limitHighlightedSegmentPopulation)
                    return limitHighlightedSegmentPopulation.selectedSegments.slice().sort((a, b) => a - b)
            }
            return this.segmentationData.segmentIds
        }
        return []
    }

    @computed get userHighlightedSegmentValid(): boolean {
        const userHighlightedSegment = this.userHighlightedSegment
        if (userHighlightedSegment == null) return true
        if (this.segmentationData) {
            const segmentIds = this.segmentIdsForUserHighlight
            return segmentIds.includes(userHighlightedSegment)
        }
        return true
    }

    // This generates an array of segment colors to use for updating the colors of the PIXI Line object.
    // This gets recomputed when populations are changed or a segment is highlighted.
    // Returns object of arrays instead of array of objects to improve performance with using fill
    // instead of having to iterate over all segments or fill and duplicate objects.
    @computed get outlineAttributes(): SegmentOutlineAttributes | null {
        const segmentationData = this.segmentationData
        if (segmentationData) {
            const imageSetStore = this.imageSetStore
            const persistedValueStore = this.imageSetStore.projectStore.persistedValueStore

            let outlineColors = []
            let outlineAlphas = []
            // Initialize the color array
            const segmentIds = segmentationData.segmentIds
            outlineColors = Array(segmentIds.length).fill(SegmentOutlineColor)
            outlineAlphas = Array(segmentIds.length).fill(
                imageSetStore.projectStore.persistedValueStore.segmentationOutlineAlpha,
            )

            // Set the colors for the selected populations
            const populationStore = imageSetStore.populationStore
            const selectedPopulations = populationStore.selectedPopulations
            const highlightedPopulations = populationStore.highlightedPopulations
            for (const selectedPopulation of selectedPopulations) {
                if (selectedPopulation.visible) {
                    let color = selectedPopulation.color
                    if (highlightedPopulations.indexOf(selectedPopulation.id) > -1) {
                        color = highlightColor(color)
                    }
                    const selectedSegments = selectedPopulation.selectedSegments
                    for (const selectedSegmentId of selectedSegments) {
                        const selectedSegmentIndex = segmentationData.idIndexMap[selectedSegmentId]
                        if (selectedSegmentIndex) {
                            outlineColors[selectedSegmentIndex] = color
                            outlineAlphas[selectedSegmentIndex] = 1
                        }
                    }
                }
            }

            // Highlighting segments that need to be highlighted.
            if (persistedValueStore.markSelectedSegments) {
                const plotStore = imageSetStore.plotStore
                let segmentsToHighlight = plotStore.segmentsHoveredOnPlot.concat(this.mousedOverSegments)
                if (this.userHighlightedSegment)
                    segmentsToHighlight = segmentsToHighlight.concat([this.userHighlightedSegment])
                for (const highlightedSegmentId of segmentsToHighlight) {
                    const highlightedSegmentIndex = segmentationData.idIndexMap[highlightedSegmentId]
                    if (highlightedSegmentIndex) {
                        outlineColors[highlightedSegmentIndex] = HighlightedSegmentOutlineColor
                        outlineAlphas[highlightedSegmentIndex] = 1
                    }
                }
            }

            return { colors: outlineColors, alphas: outlineAlphas }
        }
        return null
    }

    // Computed function that gets the segment features selected on the plot for any segments that are being moused over on the image.
    // Used to display a segment summary of the plotted features for moused over segments
    @computed get mousedOverSegments(): number[] {
        const imageSetStore = this.imageSetStore
        const projectStore = imageSetStore.projectStore
        const segmentationStore = imageSetStore.segmentationStore
        const mousedOverPixel = projectStore.mousedOverPixel
        const segmentationData = segmentationStore.segmentationData
        if (mousedOverPixel && segmentationData) {
            const mousedOverPixelMapKey = generatePixelMapKey(mousedOverPixel.x, mousedOverPixel.y)
            const mousedOverSegments = segmentationData.pixelMap[mousedOverPixelMapKey]
            if (mousedOverSegments) return mousedOverSegments
        }
        return []
    }

    @action private initialize = (): void => {
        this.segmentationDataLoading = false
    }

    @action private setSegmentationDataLoadingStatus = (status: boolean): void => {
        this.segmentationDataLoading = status
    }

    @action private setSegmentationData = (data: SegmentationData): void => {
        // TODO: De-jankify the autoCalculate stuff when setting segmentation data.
        // Kick off calculating segment features after segmentation data has loaded
        this.imageSetStore.projectStore.segmentFeatureStore.autoCalculateSegmentFeatures(this.imageSetStore)
        this.segmentationData = data
        this.setSegmentationDataLoadingStatus(false)
    }

    // Deletes the segmentation data and resets the selected segmentation file and alpha
    @action public clearSegmentationData = (): void => {
        this.selectedSegmentationFile = null
        this.deleteSegmentationData()
    }

    // Just deletes the associated segmentation data.
    // Used in clearSegmentationData
    // And when cleaning up memory in the projectStore.
    @action public deleteSegmentationData = (): void => {
        this.segmentationData = null
    }

    // TODO: De-jankify auto calculating segment features in setSegmentationData when automatically refreshing segmentation data.
    @action public refreshSegmentationData = (): void => {
        const imageData = this.imageSetStore.imageStore.imageData
        const preferencesStore = this.imageSetStore.projectStore.preferencesStore
        if (this.selectedSegmentationFile != null && this.segmentationData == null && imageData != null) {
            this.setSegmentationDataLoadingStatus(true)
            const segmentationData = new SegmentationData()
            segmentationData.loadFile(
                this.selectedSegmentationFile,
                imageData.width,
                imageData.height,
                preferencesStore.optimizeSegmentation,
                this.setSegmentationData,
            )
        }
    }

    @action public setSegmentationFile = (fName: string): void => {
        this.selectedSegmentationFile = fName
        this.refreshSegmentationData()
        this.imageSetStore.imageStore.removeSegmentationFileFromMarkers()
    }

    public setUserHighlightedSegment = (value: number | null): void => {
        if (this.userHighlightedSegment && value == this.userHighlightedSegment + 1) {
            this.incrementUserHighlightedSegment()
        } else if (this.userHighlightedSegment && value == this.userHighlightedSegment - 1) {
            this.decrementUserHighlightedSegment()
        } else {
            this.imageSetStore.projectStore.persistedValueStore.setSelectedSegment(value)
        }
    }

    // If there is no current highlighted segment id sets to the lowest segment id.
    // Otherwise finds and sets the highlighted segment id to the next largest segment id
    public incrementUserHighlightedSegment = (): void => {
        if (this.segmentationData) {
            const segmentIds = this.segmentIdsForUserHighlight
            this.findSetHighlightedSegmentId(segmentIds, (findId, curId) => findId > curId)
        }
    }

    // If there is no current highlighted segment id sets to the highest segment id.
    // Otherwise finds and sets the highlighted segment id to the next smallest segment id
    public decrementUserHighlightedSegment = (): void => {
        if (this.segmentationData) {
            const reversedSegmentIds = this.segmentIdsForUserHighlight.slice().reverse()
            this.findSetHighlightedSegmentId(reversedSegmentIds, (findId, curId) => findId < curId)
        }
    }

    private findSetHighlightedSegmentId(segmentIds: number[], findFn: (findId: number, curId: number) => boolean) {
        const persistedValueStore = this.imageSetStore.projectStore.persistedValueStore
        const curSegmentId = this.userHighlightedSegment
        let nextSegmentId
        if (curSegmentId) nextSegmentId = segmentIds.find((id) => findFn(id, curSegmentId))
        // If there isn't a current segment, or if the current segment is the last segment then set to the first segment in the list.
        nextSegmentId ||= segmentIds[0]
        persistedValueStore.setSelectedSegment(nextSegmentId)
    }
}
