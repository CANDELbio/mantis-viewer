/* eslint @typescript-eslint/no-explicit-any: 0 */
//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

import { Db } from '../lib/Db'
import { parseSegmentDataCSV } from '../lib/IO'
import { SegmentFeatureDbRequest, SegmentFeatureDbResult, ImageSetFeatureResult } from './SegmentFeatureDbWorker'
import { MinMax } from '../interfaces/ImageInterfaces'

// Globals to keep db connection
let basePath: string
let db: Db
// Globals to cache feature values and min maxes
let featureValues: Record<string, Record<string, Record<number, number>>>
let featureMinMaxes: Record<string, Record<string, MinMax>>

function initializeDb(dbPath: string): void {
    if (basePath != dbPath) {
        basePath = dbPath
        db = new Db(basePath)
        featureValues = {}
        featureMinMaxes = {}
    }
}

function importSegmentFeaturesFromCSV(
    basePath: string,
    validImageSets: string[],
    filePath: string,
    imageSet?: string,
): SegmentFeatureDbResult {
    initializeDb(basePath)
    const invalidImageSets: string[] = []
    const parsed = parseSegmentDataCSV(filePath, imageSet)
    const segmentData = parsed.data
    const segmentInfo = parsed.info
    for (const imageSet of Object.keys(segmentData)) {
        if (validImageSets.includes(imageSet)) {
            const imageSetData = segmentData[imageSet]
            for (const feature of Object.keys(imageSetData)) {
                const segmentValues = imageSetData[feature]
                db.deleteFeatures(imageSet, feature)
                db.insertFeatures(imageSet, feature, segmentValues)
            }
        } else {
            if (!invalidImageSets.includes(imageSet)) invalidImageSets.push(imageSet)
        }
    }
    return {
        importedFeatures: segmentInfo.validFeatures,
        totalFeatures: segmentInfo.totalFeatures,
        invalidFeatureNames: segmentInfo.invalidFeatureNames,
        invalidImageSets: invalidImageSets,
    }
}

function getFeatureValues(
    dbPath: string,
    requestedFeatures: { feature: string; imageSetName: string }[],
): SegmentFeatureDbResult {
    initializeDb(dbPath)
    const results: ImageSetFeatureResult[] = []
    for (const feature of requestedFeatures) {
        const curImageSet = feature.imageSetName
        const curFeature = feature.feature

        if (!(curImageSet in featureValues)) featureValues[curImageSet] = {}
        const curFeatureValue = featureValues[curImageSet][curFeature]
        if (!curFeatureValue || Object.keys(curFeatureValue).length == 0)
            featureValues[curImageSet][curFeature] = db.selectValues([curImageSet], curFeature)[curImageSet]

        if (!(curImageSet in featureMinMaxes)) featureMinMaxes[curImageSet] = {}
        const curFeatureMinMaxes = featureMinMaxes[curImageSet][curFeature]
        if (!curFeatureMinMaxes || Object.keys(curFeatureMinMaxes).length == 0)
            featureMinMaxes[curImageSet][curFeature] = db.minMaxValues([curImageSet], curFeature)[curImageSet]

        if (featureValues[curImageSet][curFeature] && featureMinMaxes[curImageSet][curFeature]) {
            results.push({
                feature: curFeature,
                imageSetName: curImageSet,
                values: featureValues[curImageSet][curFeature],
                minMax: featureMinMaxes[curImageSet][curFeature],
            })
        }
    }

    return {
        basePath: basePath,
        featureResults: results,
    }
}

function getFeaturesAvailable(dbPath: string, imageSetName: string): SegmentFeatureDbResult {
    initializeDb(dbPath)
    return { imageSetName: imageSetName, features: db.listFeatures(imageSetName) }
}

function insertFeatureValues(
    dbPath: string,
    imageSetName: string,
    feature: string,
    dataMap: Record<string, number>,
): void {
    initializeDb(dbPath)
    db.deleteFeatures(imageSetName, feature)
    db.insertFeatures(imageSetName, feature, dataMap)
}

ctx.addEventListener(
    'message',
    (message) => {
        const input: SegmentFeatureDbRequest = message.data
        let results: SegmentFeatureDbResult
        try {
            if ('filePath' in input) {
                // Request to import features from CSV
                results = importSegmentFeaturesFromCSV(
                    input.basePath,
                    input.validImageSets,
                    input.filePath,
                    input.imageSet,
                )
            } else if ('requestedFeatures' in input) {
                // Request to get values for feature for passed in image set
                results = getFeatureValues(input.basePath, input.requestedFeatures)
            } else if ('insertData' in input) {
                // Request to insert feature values calculated by SegmentFeatureCalculator into database.
                insertFeatureValues(input.basePath, input.imageSetName, input.feature, input.insertData)
                results = { success: true }
            } else if ('imageSetName' in input) {
                // Request to list features available for the passed in image set
                results = getFeaturesAvailable(input.basePath, input.imageSetName)
            } else {
                results = { error: 'Invalid request' }
            }
        } catch (err) {
            results = { error: err.message }
        }
        results.jobId = input.jobId
        ctx.postMessage(results)
    },
    false,
)
