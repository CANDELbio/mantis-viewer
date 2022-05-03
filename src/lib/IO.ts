import * as stringify from 'csv-stringify'
import * as fs from 'fs'
import * as path from 'path'
import * as parseCSV from 'csv-parse/lib/sync'
import log from 'electron-log'

import { ImageSetStore } from '../stores/ImageSetStore'
import { writeToFCS } from './FcsWriter'
import { ChannelMarkerMapping, MinMax } from '../interfaces/ImageInterfaces'
import { ChannelName, ImageChannels } from '../definitions/UIDefinitions'

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
            log.error('An error occurred while exporting to CSV:')
            log.error(err)
        }
        fs.writeFile(filename, output, (err): void => {
            if (err) {
                log.error('An error occurred while exporting to CSV:')
                log.error(err)
            }
        })
    })
}

export function exportMarkerIntensities(filename: string, imageSetStore: ImageSetStore): void {
    const projectStore = imageSetStore.projectStore
    const imageSetName = imageSetStore.name
    const imageStore = imageSetStore.imageStore
    const imageData = imageStore.imageData
    const populationStore = imageSetStore.populationStore
    const segmentationStore = imageSetStore.segmentationStore
    const segmentFeatureStore = projectStore.segmentFeatureStore
    const segmentationData = segmentationStore.segmentationData

    if (imageSetName && imageData != null && segmentationData != null) {
        const features = segmentFeatureStore.getFeatureNames(imageSetName)
        const featureValues = segmentFeatureStore.getValues(imageSetName, features)
        const data = [] as string[][]

        // Generate the header
        const columns = ['Segment ID']
        for (const feature of features) {
            columns.push(feature)
        }
        columns.push('Centroid X')
        columns.push('Centroid Y')
        columns.push('Populations')
        // Iterate through the segments and get the intensity for each feature
        const indexMap = segmentationData.pixelIndexMap
        const centroidMap = segmentationData.centroidMap
        for (const s in indexMap) {
            const segmentId = parseInt(s)
            const segmentData = [s] as string[]
            for (const feature of features) {
                segmentData.push(featureValues[feature][segmentId].toString())
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

export function exportToFCS(filePath: string, imageSetStore: ImageSetStore, segmentIds?: number[]): void {
    const projectStore = imageSetStore.projectStore
    const imageSetName = imageSetStore.name
    const imageStore = imageSetStore.imageStore
    const imageData = imageStore.imageData
    const segmentationStore = imageSetStore.segmentationStore
    const segmentFeatureStore = projectStore.segmentFeatureStore
    const segmentationData = segmentationStore.segmentationData

    if (imageSetName && imageData != null && segmentationData != null) {
        const features = segmentFeatureStore.getFeatureNames(imageSetName)
        const featureValues = segmentFeatureStore.getValues(imageSetName, features)
        const data = [] as number[][]
        // Iterate through the segments and calculate the intensity for each marker
        const indexMap = segmentationData.pixelIndexMap
        const centroidMap = segmentationData.centroidMap
        for (const s in indexMap) {
            const segmentId = parseInt(s)
            // If segmentIds isn't defined include this segment, otherwise check if this segment is in segmentIds
            if (segmentIds == undefined || segmentIds.includes(segmentId)) {
                const segmentData = [] as number[]
                for (const feature of features) {
                    segmentData.push(featureValues[feature][segmentId])
                }
                const segmentCentroid = centroidMap[segmentId]
                segmentData.push(segmentCentroid.x)
                segmentData.push(segmentCentroid.y)
                segmentData.push(segmentId)
                data.push(segmentData)
            }
        }
        writeToFCS(filePath, features.concat(['Centroid X', 'Centroid Y', 'Segment ID']), data, projectStore.appVersion)
    }
}

export function exportPopulationsToFCS(dirName: string, imageSetStore: ImageSetStore, filePrefix?: string): void {
    const populationStore = imageSetStore.populationStore
    for (const population of populationStore.selectedPopulations) {
        // Replace spaces with underscores in the population name and add the statistic being exported
        let filename = population.name.replace(/ /g, '_') + '.fcs'
        if (filePrefix) filename = filePrefix + '_' + filename
        const filePath = path.join(dirName, filename)
        if (population.selectedSegments.length > 0) {
            exportToFCS(filePath, imageSetStore, population.selectedSegments)
        }
    }
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

// Returns a map of populations parsed from CSV
// The first map is image to populations
// The second map is population name to segment ids.
export function parseProjectPopulationCSV(
    filename: string,
): Record<string, Record<string, { segments: number[]; color: number | null }>> {
    const input = fs.readFileSync(filename, 'utf8')

    const populations: Record<string, Record<string, { segments: number[]; color: number | null }>> = {}
    const records: string[][] = parseCSV(input, { columns: false })

    for (const row of records) {
        const imageSetName = row[0]
        const segmentId = Number(row[1])
        const populationName = row[2]
        const populationColor = Number(row[3])
        // Check to make sure imageSetName is not empty, segmentId is a proper number and populationName is not empty.
        if (imageSetName && !isNaN(segmentId) && populationName) {
            if (!(imageSetName in populations)) populations[imageSetName] = {}
            if (!(populationName in populations[imageSetName]))
                populations[imageSetName][populationName] = { segments: [], color: null }
            if (populationColor != NaN) populations[imageSetName][populationName].color = populationColor
            populations[imageSetName][populationName].segments.push(segmentId)
        }
    }

    return populations
}

// Returns a map of gates parsed from CSV
// The first map is gate names to features
// The second map is feature name to min/max values for that feature.
export function parseGateCSV(filename: string): Record<string, Record<string, MinMax>> {
    const input = fs.readFileSync(filename, 'utf8')

    const gates: Record<string, Record<string, MinMax>> = {}
    const records: string[][] = parseCSV(input, { columns: false })

    for (const row of records) {
        const featureName = row[0].trim()
        const featureMin = Number(row[1])
        const featureMax = Number(row[2])
        let gateName = row[3]
        // Check to make sure imageSetName is not empty, segmentId is a proper number and populationName is not empty.
        if (featureName && !isNaN(featureMin) && !isNaN(featureMax)) {
            gateName = gateName ? gateName : featureName + ' ' + featureMin.toString() + ' - ' + featureMax.toString()
            if (!(gateName in gates)) gates[gateName] = {}
            gates[gateName][featureName] = { min: featureMin, max: featureMax }
        }
    }

    return gates
}

// Expects input CSV at file path to have a header.
// If imageSet is not included, expects imageSet to be in the 0th column.
// After that, expects marker, segmentId, and then features in the header and values in the data rows.
// Returns a map that is nested four times.
// The first level is keyed on imageSet
// The second level is keyed on the feature
// The third level is keyed on the segmentId
export function parseSegmentDataCSV(
    filePath: string,
    imageSetName?: string,
): {
    data: Record<string, Record<string, Record<number, number>>>
    info: { totalFeatures: number; validFeatures: number; invalidFeatureNames: string[] }
} {
    let totalFeatures = 0
    let validFeatures = 0
    const invalidFeatureNames: string[] = []

    const cellData: Record<string, Record<string, Record<number, number>>> = {}
    const input = fs.readFileSync(filePath, 'utf8')
    const records: string[][] = parseCSV(input, { columns: false })
    const header = records.shift()
    if (header) {
        // If imageSet is included we'll use that, otherwise we get it from the 0 index column in the CSV
        // In this case we offset the other indexes by 1.
        const indexOffset = imageSetName ? 0 : 1
        const features = header?.slice(1 + indexOffset)
        for (const row of records) {
            const curImageSet = imageSetName ? imageSetName : row[0]
            const curSegmentId = parseInt(row[0 + indexOffset])
            const curValues = row.slice(1 + indexOffset).map((v) => parseFloat(v))
            if (!(curImageSet in cellData)) cellData[curImageSet] = {}
            const curImageSetData = cellData[curImageSet]
            features.forEach((curFeature, featureIndex) => {
                const curValue = curValues[featureIndex]
                totalFeatures += 1
                if (!Number.isNaN(curValue)) {
                    validFeatures += 1
                    if (!(curFeature in curImageSetData)) curImageSetData[curFeature] = {}
                    const curFeatureData = curImageSetData[curFeature]
                    curFeatureData[curSegmentId] = curValue
                } else {
                    if (!invalidFeatureNames.includes(curFeature)) invalidFeatureNames.push(curFeature)
                }
            })
        }
    }
    return {
        data: cellData,
        info: {
            totalFeatures: totalFeatures,
            validFeatures: validFeatures,
            invalidFeatureNames: invalidFeatureNames,
        },
    }
}

export function parseChannelMarkerMappingCSV(filename: string): Record<string, ChannelMarkerMapping> {
    const input = fs.readFileSync(filename, 'utf8')

    const mappings: Record<string, ChannelMarkerMapping> = {}
    const records: string[][] = parseCSV(input, { columns: false })

    for (const row of records) {
        const mappingName = row[0]
        const channelName = row[1] as ChannelName
        const markerName = row[2]
        // Check to make sure imageSetName is not empty, segmentId is a proper number and populationName is not empty.
        if (mappingName && channelName && markerName) {
            if (!(mappingName in mappings))
                mappings[mappingName] = {
                    rChannel: null,
                    gChannel: null,
                    bChannel: null,
                    cChannel: null,
                    mChannel: null,
                    yChannel: null,
                    kChannel: null,
                }
            mappings[mappingName][channelName] = markerName
        }
    }

    return mappings
}

export function writeChannelMarkerMappingsCSV(mappings: Record<string, ChannelMarkerMapping>, filename: string): void {
    const output: string[][] = []
    for (const name in mappings) {
        const curMapping = mappings[name]
        for (const s in curMapping) {
            const curChannel = s as ChannelName
            const channelMarker = curMapping[curChannel]
            if (channelMarker) output.push([name, curChannel, channelMarker])
        }
    }
    writeToCSV(output, filename, null)
}

export function saveImageExportLog(
    filepath: string,
    channelMarker: Record<ChannelName, string | null>,
    channelVisibility: Record<ChannelName, boolean>,
    channelDomainValue: Record<ChannelName, [number, number]>,
): void {
    const parsedPath = path.parse(filepath)
    const logPath = path.join(parsedPath.dir, parsedPath.name + '.csv')
    const output: string[][] = []
    const header = ['Channel', 'Marker', 'Low Threshold', 'High Threshold']
    for (const channel of ImageChannels) {
        const curMarker = channelMarker[channel]
        if (curMarker && channelVisibility[channel]) {
            const domainValue = channelDomainValue[channel]
            output.push([channel, curMarker, domainValue[0].toString(), domainValue[1].toString()])
        }
    }
    writeToCSV(output, logPath, header)
}

export function savePopulationTiffExportLog(filepath: string, populationNames: Record<number, string>): void {
    const parsedPath = path.parse(filepath)
    const logPath = path.join(parsedPath.dir, parsedPath.name + '.csv')
    const output: string[][] = []
    for (const populationId in populationNames) {
        output.push([populationId, populationNames[Number(populationId)]])
    }
    writeToCSV(output, logPath, null)
}
