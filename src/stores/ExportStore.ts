import { observable, action, when } from 'mobx'
import * as stringify from 'csv-stringify'
import * as fs from 'fs'
import * as path from 'path'

import { ImageStore } from '../stores/ImageStore'
import { PopulationStore } from '../stores/PopulationStore'
import { ProjectStore } from './ProjectStore'
import { PlotStatistic } from '../definitions/UIDefinitions'
import { writeToFCS } from '../lib/FcsWriter'

export class ExportStore {
    private projectStore: ProjectStore

    // Used to track progress when exporting FCS/Stats for whole project
    @observable.ref public numToExport: number
    @observable.ref public numExported: number

    public constructor(projectStore: ProjectStore) {
        this.projectStore = projectStore
        this.initialize()
    }

    @action private initialize = () => {
        this.numToExport = 0
        this.numExported = 0
    }

    @action public incrementNumToExport = () => {
        this.numToExport += 1
    }

    @action public incrementNumExported = () => {
        this.numExported += 1
        // If we've exported all files, mark done.
        if (this.numExported >= this.numToExport) {
            this.numToExport = 0
            this.numExported = 0
        }
    }

    public exportMarkerIntensisties = (
        filename: string,
        statistic: PlotStatistic,
        imageStore?: ImageStore,
        populationStore?: PopulationStore,
    ) => {
        let projectStore = this.projectStore
        if (imageStore == undefined) imageStore = projectStore.activeImageStore
        let imageData = imageStore.imageData
        let segmentationData = imageStore.segmentationData
        let segmentationStatistics = imageStore.segmentationStatistics
        if (populationStore == undefined) populationStore = projectStore.activePopulationStore
        if (imageData != null && segmentationData != null && segmentationStatistics != null) {
            let markers = imageData.markerNames
            let data = [] as string[][]

            // Generate the header
            let columns = ['Segment ID']
            for (let marker of markers) {
                columns.push(marker)
            }
            columns.push('Centroid X')
            columns.push('Centroid Y')
            columns.push('Populations')

            // Iterate through the segments and calculate the intensity for each marker
            let indexMap = segmentationData.segmentIndexMap
            let centroidMap = segmentationData.centroidMap
            for (let s in indexMap) {
                let segmentId = parseInt(s)
                let segmentData = [s] as string[]
                for (let marker of markers) {
                    if (statistic == 'mean') {
                        segmentData.push(segmentationStatistics.meanIntensity(marker, [segmentId]).toString())
                    } else {
                        segmentData.push(segmentationStatistics.medianIntensity(marker, [segmentId]).toString())
                    }
                }

                // Add the Centroid points
                let segmentCentroid = centroidMap[segmentId]
                segmentData.push(segmentCentroid.x.toString())
                segmentData.push(segmentCentroid.y.toString())

                // Figure out which populations this segment belongs to
                let populations = []
                for (let population of populationStore.selectedPopulations) {
                    if (population.selectedSegments.indexOf(segmentId) > -1) populations.push(population.name)
                }
                segmentData.push(populations.join(','))

                data.push(segmentData)
            }

            // Write to a CSV
            stringify(data, { header: true, columns: columns }, (err, output) => {
                if (err) console.log('Error saving intensities ' + err)
                fs.writeFile(filename, output, err => {
                    if (err) console.log('Error saving intensities ' + err)
                })
            })
        }
    }

    public exportProjectMarkerIntensities = (dirName: string, statistic: PlotStatistic) => {
        let projectStore = this.projectStore
        for (let curDir of this.projectStore.imageSetPaths) {
            // Incrementing num to export so we can have a loading bar.
            this.incrementNumToExport()
            projectStore.loadImageStoreData(curDir)
            let imageStore = projectStore.imageSets[curDir].imageStore
            let populationStore = projectStore.imageSets[curDir].populationStore
            when(
                () => !imageStore.imageDataLoading,
                () => {
                    // If we don't have segmentation, then skip this one.
                    if (imageStore.selectedSegmentationFile) {
                        when(
                            () => !imageStore.segmentationDataLoading && !imageStore.segmentationStatisticsLoading,
                            () => {
                                let selectedDirectory = imageStore.selectedDirectory
                                if (selectedDirectory) {
                                    let imageSetName = path.basename(selectedDirectory)
                                    let filename = imageSetName + '_' + statistic + '.csv'
                                    let filePath = path.join(dirName, filename)
                                    this.exportMarkerIntensisties(filePath, statistic, imageStore, populationStore)
                                    // Mark as done exporting for loading bar.
                                    this.incrementNumExported()
                                    // If this image set shouldn't be in memory, clear it out
                                    if (!projectStore.imageSetHistory.includes(selectedDirectory)) {
                                        imageStore.clearImageData()
                                        imageStore.clearSegmentationData()
                                    }
                                }
                            },
                        )
                    } else {
                        // Mark as success if we're not going to export it
                        this.incrementNumExported()
                    }
                },
            )
        }
    }

    public exportPopulationsToFCS = (
        dirName: string,
        statistic: PlotStatistic,
        filePrefix?: string,
        imageStore?: ImageStore,
        populationStore?: PopulationStore,
    ) => {
        let projectStore = this.projectStore
        if (populationStore == undefined) populationStore = projectStore.activePopulationStore
        for (let population of populationStore.selectedPopulations) {
            // Replace spaces with underscores in the population name and add the statistic being exported
            let filename = population.name.replace(/ /g, '_') + '_' + statistic + '.fcs'
            if (filePrefix) filename = filePrefix + '_' + filename
            let filePath = path.join(dirName, filename)
            if (population.selectedSegments.length > 0) {
                this.exportToFCS(filePath, statistic, population.selectedSegments, imageStore)
            }
        }
    }

    public exportToFCS = (
        filePath: string,
        statistic: PlotStatistic,
        segmentIds?: number[],
        imageStore?: ImageStore,
    ) => {
        let projectStore = this.projectStore
        if (imageStore == undefined) imageStore = projectStore.activeImageStore
        let imageData = imageStore.imageData
        let segmentationData = imageStore.segmentationData
        let segmentationStatistics = imageStore.segmentationStatistics
        if (imageData != null && segmentationData != null && segmentationStatistics != null) {
            let markers = imageData.markerNames
            let data = [] as number[][]
            // Iterate through the segments and calculate the intensity for each marker
            let indexMap = segmentationData.segmentIndexMap
            let centroidMap = segmentationData.centroidMap
            for (let s in indexMap) {
                let segmentId = parseInt(s)
                // If segmentIds isn't defined include this segment, otherwise check if this segment is in segmentIds
                if (segmentIds == undefined || segmentIds.includes(segmentId)) {
                    let segmentData = [] as number[]
                    for (let marker of markers) {
                        if (statistic == 'mean') {
                            segmentData.push(segmentationStatistics.meanIntensity(marker, [segmentId]))
                        } else {
                            segmentData.push(segmentationStatistics.medianIntensity(marker, [segmentId]))
                        }
                    }
                    let segmentCentroid = centroidMap[segmentId]
                    segmentData.push(segmentCentroid.x)
                    segmentData.push(segmentCentroid.y)
                    segmentData.push(segmentId)
                    data.push(segmentData)
                }
            }
            writeToFCS(
                filePath,
                markers.concat(['Centroid X', 'Centroid Y', 'Segment ID']),
                data,
                projectStore.appVersion,
            )
        }
    }

    public exportProjectToFCS = (dirName: string, statistic: PlotStatistic, populations: boolean) => {
        let projectStore = this.projectStore
        for (let curDir of projectStore.imageSetPaths) {
            // Incrementing num to export so we can have a loading bar.
            this.incrementNumToExport()
            projectStore.loadImageStoreData(curDir)
            let imageStore = projectStore.imageSets[curDir].imageStore
            let populationStore = projectStore.imageSets[curDir].populationStore
            when(
                () => !imageStore.imageDataLoading,
                () => {
                    // If we don't have segmentation, then skip this one.
                    if (imageStore.selectedSegmentationFile) {
                        when(
                            () => !imageStore.segmentationDataLoading && !imageStore.segmentationStatisticsLoading,
                            () => {
                                let selectedDirectory = imageStore.selectedDirectory
                                if (selectedDirectory) {
                                    let imageSetName = path.basename(selectedDirectory)
                                    if (populations) {
                                        this.exportPopulationsToFCS(
                                            dirName,
                                            statistic,
                                            imageSetName,
                                            imageStore,
                                            populationStore,
                                        )
                                    } else {
                                        let filename = imageSetName + '_' + statistic + '.fcs'
                                        let filePath = path.join(dirName, filename)
                                        this.exportToFCS(filePath, statistic)
                                    }
                                    // Mark this set of files as loaded for loading bar.
                                    this.incrementNumExported()
                                    // If this image set shouldn't be in memory, clear it out
                                    if (!projectStore.imageSetHistory.includes(selectedDirectory)) {
                                        imageStore.clearImageData()
                                        imageStore.clearSegmentationData()
                                    }
                                }
                            },
                        )
                    } else {
                        // Mark as success if we're not going to export it
                        this.incrementNumExported()
                    }
                },
            )
        }
    }
}
