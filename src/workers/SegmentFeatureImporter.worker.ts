/* eslint @typescript-eslint/no-explicit-any: 0 */
//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

import { Db } from '../lib/Db'
import { parseSegmentDataCSV } from '../lib/IO'
import { SegmentFeatureImporterInput, SegmentFeatureImporterResult } from './SegmentFeatureImporter'

function importSegmentFeaturesFromCSV(
    basePath: string,
    filePath: string,
    imageSet: string | undefined,
    clearDuplicates: boolean,
): void {
    if (filePath && basePath) {
        const db = new Db(basePath)
        const segmentData = parseSegmentDataCSV(filePath, imageSet)
        for (const imageSet of Object.keys(segmentData)) {
            const imageSetData = segmentData[imageSet]
            for (const feature of Object.keys(imageSetData)) {
                const segmentValues = imageSetData[feature]
                if (clearDuplicates) db.deleteFeatures(imageSet, feature)
                db.insertFeatures(imageSet, feature, segmentValues)
            }
        }
    }
}

ctx.addEventListener(
    'message',
    (message) => {
        const input: SegmentFeatureImporterInput = message.data
        const results: SegmentFeatureImporterResult = {}
        try {
            importSegmentFeaturesFromCSV(input.basePath, input.filePath, input.imageSet, input.clearDuplicates)
        } catch (err) {
            results.error = err.message
        }
        ctx.postMessage(results)
    },
    false,
)
