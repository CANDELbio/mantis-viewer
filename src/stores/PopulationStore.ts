import { observable, action } from 'mobx'
import * as shortId from 'shortid'
import * as _ from 'underscore'

import { ImageSetStore } from './ImageSetStore'
import { SelectedPopulation } from '../interfaces/ImageInterfaces'
import { randomHexColor } from '../lib/ColorHelper'
import { drawSelectedRegion, findSegmentsInSelection } from '../lib/GraphicsHelper'
import { SelectedSegmentOutlineWidth } from '../definitions/UIDefinitions'

export class PopulationStore {
    public constructor(imageSetStore: ImageSetStore) {
        this.imageSetStore = imageSetStore
        this.initialize()
    }

    private imageSetStore: ImageSetStore
    // An array of the regions selected.
    @observable.ref public selectedPopulations: SelectedPopulation[]
    // ID of a region to be highlighted. Used when mousing over in list of selected regions.
    @observable.ref public highlightedPopulations: string[]

    @action public initialize = (): void => {
        this.selectedPopulations = []
        this.highlightedPopulations = []
    }

    private newROIName(renderOrder: number, namePrefix: string | null): string {
        const name = namePrefix ? namePrefix + ' Selection ' : 'Selection '
        return name + renderOrder.toString()
    }

    @action public setSelectedPopulations = (populations: SelectedPopulation[]): void => {
        if (!_.isEqual(populations, this.selectedPopulations)) {
            this.selectedPopulations = populations
        }
    }

    private getRenderOrder(): number {
        const renderOrders = _.pluck(this.selectedPopulations, 'renderOrder')
        if (renderOrders.length > 0) return Math.max(...renderOrders) + 1
        return 1
    }

    // Can pass in a namePrefix or null to just use the default ROI name. Prefix gets stuck in front of the ROI name.
    // If name is passed in, it overrides namePrefix/default ROI name.
    @action public addSelectedPopulation = (
        regionOutline: number[] | null,
        selectedSegments: number[],
        namePrefix: string | null,
        name?: string | null,
        color?: number | null,
    ): SelectedPopulation => {
        const order = this.getRenderOrder()
        const newPopulation: SelectedPopulation = {
            id: shortId.generate(),
            renderOrder: order,
            regionOutline: regionOutline,
            selectedSegments: selectedSegments,
            name: name ? name : this.newROIName(order, namePrefix),
            color: color ? color : randomHexColor(),
            regionGraphics: null,
            segmentGraphics: null,
            visible: true,
        }
        this.refreshGraphics(newPopulation)
        this.selectedPopulations = this.selectedPopulations.concat([newPopulation])
        return newPopulation
    }

    private refreshGraphics = (population: SelectedPopulation): SelectedPopulation => {
        const imageData = this.imageSetStore.imageStore.imageData
        const segmentationData = this.imageSetStore.segmentationStore.segmentationData
        const regionOutline = population.regionOutline
        if (imageData && segmentationData && regionOutline) {
            const color = population.color
            population.regionGraphics = drawSelectedRegion(regionOutline, color, 1)
            population.selectedSegments = findSegmentsInSelection(population.regionGraphics, segmentationData)
            population.segmentGraphics = segmentationData.segmentOutlineGraphics(
                color,
                SelectedSegmentOutlineWidth,
                population.selectedSegments,
            )
        }
        return population
    }

    @action public addEmptyPopulation = (): void => {
        this.addSelectedPopulation(null, [], 'Empty')
    }

    @action public deleteSelectedPopulation = (id: string): void => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.filter((region): boolean => region.id != id)
        }
    }

    @action public deletePopulationsNotSelectedOnImage = (): void => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.filter(
                (region): boolean | null => region.regionOutline && region.regionOutline.length > 0,
            )
        }
    }

    @action public highlightSelectedPopulation = (id: string): void => {
        this.highlightedPopulations = this.highlightedPopulations.concat([id])
    }

    @action public unhighlightSelectedPopulation = (id: string): void => {
        this.highlightedPopulations = this.highlightedPopulations.filter((regionId): boolean => regionId != id)
    }

    @action public updateSelectedPopulationName = (id: string, newName: string): void => {
        if (this.selectedPopulations != null) {
            // Work around to trigger selectedPopulations change
            // TODO: Try replacing selectedPopulations with non ref and use Mobx toJS to send values to plot window.
            this.selectedPopulations = this.selectedPopulations.slice().map(function (region): SelectedPopulation {
                if (region.id == id) {
                    region.name = newName
                    return region
                } else {
                    return region
                }
            })
        }
    }

    @action public updateSelectedPopulationColor = (id: string, color: number): void => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.slice().map(
                (population): SelectedPopulation => {
                    if (population.id == id) {
                        population.color = color
                        this.refreshGraphics(population)
                        return population
                    } else {
                        return population
                    }
                },
            )
        }
    }

    @action public updateSelectedPopulationVisibility = (id: string, visible: boolean): void => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.slice().map(
                (region): SelectedPopulation => {
                    if (region.id == id) {
                        region.visible = visible
                        return region
                    } else {
                        return region
                    }
                },
            )
        }
    }

    @action public setAllSelectedPopulationVisibility = (visible: boolean): void => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.slice().map(function (region): SelectedPopulation {
                region.visible = visible
                return region
            })
        }
    }

    @action public updateSelectedPopulationSegments = (id: string, segments: number[]): void => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.slice().map(function (region): SelectedPopulation {
                if (region.id == id) {
                    region.selectedSegments = segments
                    return region
                } else {
                    return region
                }
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
}
