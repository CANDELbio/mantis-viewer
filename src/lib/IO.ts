import * as stringify from 'csv-stringify'
import * as fs from 'fs'
import * as path from 'path'
import * as parseCSV from 'csv-parse/lib/sync'

import { ImageSetStore } from '../stores/ImageSetStore'
import { PlotStatistic } from '../definitions/UIDefinitions'
import { writeToFCS } from './FcsWriter'
import { SelectedPopulation } from '../interfaces/ImageInterfaces'

export function writeToCSV(data: string[][], filename: string, headerCols: string[] | null): void {
    let csvOptions: stringify.Options = { header: false }
    if (headerCols) {
        csvOptions = {
            header: true,
            columns: headerCols,
        }
    }
    stringify(data, csvOptions, (err, output): void => {
        if (err) {
            console.log('An error occurred while exporting to CSV:')
            console.log(err)
        }
        fs.writeFile(filename, output, (err): void => {
            if (err) {
                console.log('An error occurred while exporting to CSV:')
                console.log(err)
            }
        })
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function writeToJSON(object: any, filename: string): void {
    const exportingString = JSON.stringify(object)

    // Write data to file
    fs.writeFile(filename, exportingString, 'utf8', function (err): void {
        if (err) {
            console.log('An error occurred while exporting to JSON:')
            console.log(err)
        }
    })
}

export function exportMarkerIntensities(
    filename: string,
    statistic: PlotStatistic,
    imageSetStore: ImageSetStore,
): void {
    const imageStore = imageSetStore.imageStore
    const imageData = imageStore.imageData
    const segmentationStore = imageSetStore.segmentationStore
    const segmentationData = segmentationStore.segmentationData
    const segmentationStatistics = segmentationStore.segmentationStatistics
    const populationStore = imageSetStore.populationStore

    if (imageData != null && segmentationData != null && segmentationStatistics != null) {
        const markers = imageData.markerNames
        const data = [] as string[][]

        // Generate the header
        const columns = ['Segment ID']
        for (const marker of markers) {
            columns.push(marker)
        }
        columns.push('Centroid X')
        columns.push('Centroid Y')
        columns.push('Populations')

        // Iterate through the segments and calculate the intensity for each marker
        const indexMap = segmentationData.segmentIndexMap
        const centroidMap = segmentationData.centroidMap
        for (const s in indexMap) {
            const segmentId = parseInt(s)
            const segmentData = [s] as string[]
            for (const marker of markers) {
                if (statistic == 'mean') {
                    segmentData.push(segmentationStatistics.meanIntensity(marker, [segmentId]).toString())
                } else {
                    segmentData.push(segmentationStatistics.medianIntensity(marker, [segmentId]).toString())
                }
            }

            // Add the Centroid points
            const segmentCentroid = centroidMap[segmentId]
            segmentData.push(segmentCentroid.x.toString())
            segmentData.push(segmentCentroid.y.toString())

            // Figure out which populations this segment belongs to
            const populations = []
            for (const population of populationStore.selectedPopulations) {
                if (population.selectedSegments.indexOf(segmentId) > -1) populations.push(population.name)
            }
            segmentData.push(populations.join(','))

            data.push(segmentData)
        }

        // Write to a CSV
        writeToCSV(data, filename, columns)
    }
}

export function exportToFCS(
    filePath: string,
    statistic: PlotStatistic,
    imageSetStore: ImageSetStore,
    segmentIds?: number[],
): void {
    const projectStore = imageSetStore.projectStore
    const imageStore = imageSetStore.imageStore
    const imageData = imageStore.imageData
    const segmentationStore = imageSetStore.segmentationStore
    const segmentationData = segmentationStore.segmentationData
    const segmentationStatistics = segmentationStore.segmentationStatistics

    if (imageData != null && segmentationData != null && segmentationStatistics != null) {
        const markers = imageData.markerNames
        const data = [] as number[][]
        // Iterate through the segments and calculate the intensity for each marker
        const indexMap = segmentationData.segmentIndexMap
        const centroidMap = segmentationData.centroidMap
        for (const s in indexMap) {
            const segmentId = parseInt(s)
            // If segmentIds isn't defined include this segment, otherwise check if this segment is in segmentIds
            if (segmentIds == undefined || segmentIds.includes(segmentId)) {
                const segmentData = [] as number[]
                for (const marker of markers) {
                    if (statistic == 'mean') {
                        segmentData.push(segmentationStatistics.meanIntensity(marker, [segmentId]))
                    } else {
                        segmentData.push(segmentationStatistics.medianIntensity(marker, [segmentId]))
                    }
                }
                const segmentCentroid = centroidMap[segmentId]
                segmentData.push(segmentCentroid.x)
                segmentData.push(segmentCentroid.y)
                segmentData.push(segmentId)
                data.push(segmentData)
            }
        }
        writeToFCS(filePath, markers.concat(['Centroid X', 'Centroid Y', 'Segment ID']), data, projectStore.appVersion)
    }
}

export function exportPopulationsToFCS(
    dirName: string,
    statistic: PlotStatistic,
    imageSetStore: ImageSetStore,
    filePrefix?: string,
): void {
    const populationStore = imageSetStore.populationStore
    for (const population of populationStore.selectedPopulations) {
        // Replace spaces with underscores in the population name and add the statistic being exported
        let filename = population.name.replace(/ /g, '_') + '_' + statistic + '.fcs'
        if (filePrefix) filename = filePrefix + '_' + filename
        const filePath = path.join(dirName, filename)
        if (population.selectedSegments.length > 0) {
            exportToFCS(filePath, statistic, imageSetStore, population.selectedSegments)
        }
    }
}

export function parseActivePopulationsJSON(filename: string): SelectedPopulation[] {
    const importingContent = JSON.parse(fs.readFileSync(filename, 'utf8'))
    return importingContent
}

export function parseActivePopulationCSV(filename: string): Record<string, number[]> {
    const input = fs.readFileSync(filename, 'utf8')

    const populations: Record<string, number[]> = {}
    const records: string[][] = parseCSV(input, { columns: false })

    for (const row of records) {
        const segmentId = Number(row[0])
        const populationName = row[1]
        // Check to make sure segmentId is a proper number and populationName is not empty or null.
        if (!isNaN(segmentId) && populationName) {
            if (!(populationName in populations)) populations[populationName] = []
            populations[populationName].push(segmentId)
        }
    }

    return populations
}

export function parseProjectPopulationCSV(filename: string): Record<string, Record<string, number[]>> {
    const input = fs.readFileSync(filename, 'utf8')

    const populations: Record<string, Record<string, number[]>> = {}
    const records: string[][] = parseCSV(input, { columns: false })

    for (const row of records) {
        const imageSetName = row[0]
        const segmentId = Number(row[1])
        const populationName = row[2]
        // Check to make sure imageSetName is not empty, segmentId is a proper number and populationName is not empty.
        if (imageSetName && !isNaN(segmentId) && populationName) {
            if (!(imageSetName in populations)) populations[imageSetName] = {}
            if (!(populationName in populations[imageSetName])) populations[imageSetName][populationName] = []
            populations[imageSetName][populationName].push(segmentId)
        }
    }

    return populations
}

// Returns a map that is nested four times.
// The first level is keyed on imageSet
// The second level is keyed on marker
// The third level is keyed on the feature
// The fourth level is keyed on the segmentId
export function parseCellDataCSV(
    filePath: string,
    imageSet?: string,
): Record<string, Record<string, Record<string, Record<number, number>>>> {
    const cellData: Record<string, Record<string, Record<string, Record<number, number>>>> = {}
    const input = fs.readFileSync(filePath, 'utf8')
    const records: string[][] = parseCSV(input, { columns: false })
    const header = records.shift()
    // TODO: Parse CSV into Maps.
    return cellData
}
