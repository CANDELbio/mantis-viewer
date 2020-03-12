import { observable, action } from 'mobx'
import * as fs from 'fs'
import * as shortId from 'shortid'
import * as csvParse from 'csv-parse'
import * as stringify from 'csv-stringify'
import * as _ from 'underscore'

import { SelectedPopulation } from '../interfaces/ImageInterfaces'
import { randomHexColor } from '../lib/ColorHelper'

export class PopulationStore {
    public constructor() {
        this.initialize()
    }
    // An array of the regions selected.
    @observable.ref public selectedPopulations: SelectedPopulation[]
    // ID of a region to be highlighted. Used when mousing over in list of selected regions.
    @observable.ref public highlightedPopulations: string[]

    @action public initialize = () => {
        this.selectedPopulations = []
        this.highlightedPopulations = []
    }

    private newROIName(renderOrder: number, namePrefix: string | null): string {
        let name = namePrefix ? namePrefix + ' Selection ' : 'Selection '
        return name + renderOrder.toString()
    }

    @action public setSelectedPopulations = (populations: SelectedPopulation[]) => {
        if (!_.isEqual(populations, this.selectedPopulations)) {
            this.selectedPopulations = populations
        }
    }

    private getRenderOrder(): number {
        let renderOrders = _.pluck(this.selectedPopulations, 'renderOrder')
        if (renderOrders.length > 0) return Math.max(...renderOrders) + 1
        return 1
    }

    // Can pass in a namePrefix or null to just use the default ROI name. Prefix gets stuck in front of the ROI name.
    // If name is passed in, it overrides namePrefix/default ROI name.
    @action public addSelectedPopulation = (
        selectedRegion: number[] | null,
        selectedSegments: number[],
        namePrefix: string | null,
        name?: string | null,
        color?: number,
    ) => {
        let order = this.getRenderOrder()
        let newRegion = {
            id: shortId.generate(),
            renderOrder: order,
            selectedRegion: selectedRegion,
            selectedSegments: selectedSegments,
            name: name ? name : this.newROIName(order, namePrefix),
            color: color ? color : randomHexColor(),
            visible: true,
        }
        this.selectedPopulations = this.selectedPopulations.concat([newRegion])
        return newRegion
    }

    @action public deleteSelectedPopulation = (id: string) => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.filter(region => region.id != id)
        }
    }

    @action public deletePopulationsNotSelectedOnImage = () => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.filter(
                region => region.selectedRegion && region.selectedRegion.length > 0,
            )
        }
    }

    @action public highlightSelectedPopulation = (id: string) => {
        this.highlightedPopulations = this.highlightedPopulations.concat([id])
    }

    @action public unhighlightSelectedPopulation = (id: string) => {
        this.highlightedPopulations = this.highlightedPopulations.filter(regionId => regionId != id)
    }

    @action public updateSelectedPopulationName = (id: string, newName: string) => {
        if (this.selectedPopulations != null) {
            // Work around to trigger selectedPopulations change
            // TODO: Try replacing selectedPopulations with non ref and use Mobx toJS to send values to plot window.
            this.selectedPopulations = this.selectedPopulations.slice().map(function(region) {
                if (region.id == id) {
                    region.name = newName
                    return region
                } else {
                    return region
                }
            })
        }
    }

    @action public updateSelectedPopulationColor = (id: string, color: number) => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.slice().map(function(region) {
                if (region.id == id) {
                    region.color = color
                    return region
                } else {
                    return region
                }
            })
        }
    }

    @action public updateSelectedPopulationVisibility = (id: string, visible: boolean) => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.slice().map(function(region) {
                if (region.id == id) {
                    region.visible = visible
                    return region
                } else {
                    return region
                }
            })
        }
    }

    @action public setAllSelectedPopulationVisibility = (visible: boolean) => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.slice().map(function(region) {
                region.visible = visible
                return region
            })
        }
    }

    @action public updateSelectedPopulationSegments = (id: string, segments: number[]) => {
        if (this.selectedPopulations != null) {
            this.selectedPopulations = this.selectedPopulations.slice().map(function(region) {
                if (region.id == id) {
                    region.selectedSegments = segments
                    return region
                } else {
                    return region
                }
            })
        }
    }

    @action public addPopulationsFromJSON = (filename: string) => {
        let importingContent = JSON.parse(fs.readFileSync(filename, 'utf8'))
        let importingPopulations: SelectedPopulation[] = importingContent
        importingPopulations.map((population: SelectedPopulation) => {
            this.addSelectedPopulation(
                population.selectedRegion,
                population.selectedSegments,
                null,
                population.name,
                population.color,
            )
        })
    }

    public exportPopulationsToJSON = (filename: string) => {
        let popluationsString = JSON.stringify(this.selectedPopulations)

        // Write data to file
        fs.writeFile(filename, popluationsString, 'utf8', function(err) {
            if (err) {
                console.log('An error occured while writing populations to JSON file.')
            }
            console.log('Populations JSON file has been saved.')
        })
    }

    @action public addPopulationsFromCSV = (filename: string) => {
        let input = fs.readFileSync(filename, 'utf8')

        let populations: Record<string, number[]> = {}

        // Currently we expect the input to be a csv of the format segmentId,populationName
        csvParse(input, { delimiter: ',' }, function(err, output: string[][]) {
            for (let row of output) {
                let segmentId = Number(row[0])
                let populationName = row[1]
                // Check to make sure segmentId is a proper number and populationName is not empty or null.
                if (!isNaN(segmentId) && populationName) {
                    if (!(populationName in populations)) populations[populationName] = []
                    populations[populationName].push(segmentId)
                }
            }
        }).on('end', () => {
            for (let populationName in populations) {
                this.addSelectedPopulation(null, populations[populationName], null, populationName, randomHexColor())
            }
        })
    }

    @action public exportPopulationsToCSV = (filename: string) => {
        let data: string[][] = []
        this.selectedPopulations.map((population: SelectedPopulation) => {
            population.selectedSegments.map((segmentId: number) => {
                data.push([segmentId.toString(), population.name])
            })
        })
        stringify(data, { header: false }, (err, output) => {
            if (err) console.log('Error exporting populations to CSV ' + err)
            fs.writeFile(filename, output, err => {
                if (err) console.log('Error exporting populations to CSV ' + err)
            })
        })
    }
}
