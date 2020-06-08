/* eslint @typescript-eslint/no-explicit-any: 0 */
//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

import { Db } from '../lib/Db'
import { parseSegmentDataCSV } from '../lib/IO'
import {
    SegmentFeatureImporterInput,
    SegmentFeatureImporterResult,
    SegmentFeatureImporterError,
} from './SegmentFeatureImporter'

function importSegmentFeaturesFromCSV(
    basePath: string,
    filePath: string,
    validImageSets: string[],
    imageSet: string | undefined,
    clearDuplicates: boolean,
): SegmentFeatureImporterResult {
    const db = new Db(basePath)
    const invalidImageSets: string[] = []
    const parsed = parseSegmentDataCSV(filePath, imageSet)
    const segmentData = parsed.data
    const segmentInfo = parsed.info
    for (const imageSet of Object.keys(segmentData)) {
        if (validImageSets.includes(imageSet)) {
            const imageSetData = segmentData[imageSet]
            for (const feature of Object.keys(imageSetData)) {
                const segmentValues = imageSetData[feature]
                if (clearDuplicates) db.deleteFeatures(imageSet, feature)
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

ctx.addEventListener(
    'message',
    (message) => {
        const input: SegmentFeatureImporterInput = message.data
        let results: SegmentFeatureImporterResult | SegmentFeatureImporterError
        try {
            results = importSegmentFeaturesFromCSV(
                input.basePath,
                input.filePath,
                input.validImageSets,
                input.imageSet,
                input.clearDuplicates,
            )
        } catch (err) {
            results = { error: err.message }
        }
        ctx.postMessage(results)
    },
    false,
)
