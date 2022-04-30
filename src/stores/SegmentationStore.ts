import { observable, action, autorun, computed } from 'mobx'
import * as path from 'path'
import * as fs from 'fs'

import { SegmentationData } from '../lib/SegmentationData'
import { ImageSetStore } from './ImageSetStore'
import { generatePixelMapKey } from '../lib/SegmentationUtils'
import { SegmentOutlineColor, HighlightedSegmentOutlineColor } from '../../src/definitions/UIDefinitions'
import { highlightColor } from '../lib/ColorHelper'

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
    @observable public highlightedSegment: number | null

    // Looks for a segmentation file with the same filename from source in dest and sets it if it exists.
    // TODO: Not sure if this should run for every segmentation store whenever the SettingStore segmentationBasename changes.
    // Might want to only have this run of this is the active image set.
    private autoSetSegmentationFile = autorun(() => {
        const imageStore = this.imageSetStore.imageStore
        const imageSetDirectory = this.imageSetStore.directory
        const imageData = imageStore.imageData
        const settingStore = this.imageSetStore.projectStore.settingStore
        const segmentationBasename = settingStore.segmentationBasename
        const autoLoadSegmentation = settingStore.autoLoadSegmentation

        // Check if there is a file to load and if image data has loaded (so we know width and height for text segmentation)
        if (segmentationBasename && autoLoadSegmentation && imageData && imageSetDirectory) {
            const imageSubdirectory = settingStore.imageSubdirectory
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

    // This generates an array of segment colors to use for updating the colors of the PIXI Line object.
    // This gets recomputed when populations are changed or a segment is highlighted.
    // Returns object of arrays instead of array of objects to improve performance with using fill
    // instead of having to iterate over all segments or fill and duplicate objects.
    @computed get outlineAttributes(): SegmentOutlineAttributes | null {
        const segmentationData = this.segmentationData
        if (segmentationData) {
            const imageSetStore = this.imageSetStore

            let outlineColors = []
            let outlineAlphas = []
            // Initialize the color array
            const segmentIds = segmentationData.segmentIds
            outlineColors = Array(segmentIds.length).fill(SegmentOutlineColor)
            outlineAlphas = Array(segmentIds.length).fill(
                imageSetStore.projectStore.settingStore.segmentationOutlineAlpha,
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
            const plotStore = imageSetStore.plotStore
            const segmentsToHighlight = plotStore.segmentsHoveredOnPlot.concat(this.mousedOverSegments)
            for (const highlightedSegmentId of segmentsToHighlight) {
                const highlightedSegmentIndex = segmentationData.idIndexMap[highlightedSegmentId]
                if (highlightedSegmentIndex) {
                    outlineColors[highlightedSegmentIndex] = HighlightedSegmentOutlineColor
                    outlineAlphas[highlightedSegmentIndex] = 1
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

    @action public setHighlightedSegment = (value: number | null): void => {
        this.highlightedSegment = value
    }
}
