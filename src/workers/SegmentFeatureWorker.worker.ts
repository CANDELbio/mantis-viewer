/* eslint @typescript-eslint/no-explicit-any: 0 */
//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

import { Db } from '../lib/Db'
import { parseSegmentDataCSV } from '../lib/IO'
import { SegmentFeatureWorkerInput, SegmentFeatureWorkerResult } from './SegmentFeatureWorker'

function importSegmentFeaturesFromCSV(basePath: string, filePath: string, imageSet: string | undefined): void {
    if (filePath && basePath) {
        const db = new Db(basePath)
        const segmentData = parseSegmentDataCSV(filePath, imageSet)
        for (const imageSet of Object.keys(segmentData)) {
            const imageSetData = segmentData[imageSet]
            for (const feature of Object.keys(imageSetData)) {
                const segmentValues = imageSetData[feature]
                db.deleteFeatures(imageSet, null, feature)
                db.insertFeatures(imageSet, null, feature, segmentValues)
            }
        }
    }
}

ctx.addEventListener(
    'message',
    (message) => {
        const input: SegmentFeatureWorkerInput = message.data
        const results: SegmentFeatureWorkerResult = {}
        try {
            importSegmentFeaturesFromCSV(input.basePath, input.filePath, input.imageSet)
        } catch (err) {
            results.error = err.message
        }
        ctx.postMessage(results)
    },
    false,
)
