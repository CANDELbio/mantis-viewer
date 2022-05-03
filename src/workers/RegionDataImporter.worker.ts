/* eslint @typescript-eslint/no-explicit-any: 0 */
//Typescript workaround so that we're interacting with a Worker instead of a Window interface
const ctx: Worker = self as any

import * as parseCSV from 'csv-parse/lib/sync'
import * as path from 'path'
import * as fs from 'fs'

import { RegionDataImporterInput, RegionDataImporterResult, RegionDataImporterError } from './RegionDataImporter'
import { readTiffData } from '../lib/TiffUtils'

function generateRegionMap(v: Float32Array | Uint16Array | Uint8Array): Record<number, number[]> {
    const regionIndexMap: { [key: number]: number[] } = {}

    for (let i = 0; i < v.length; ++i) {
        const regionId = v[i]
        if (regionId != 0) {
            // Adding pixel index to the segmentIndexMap
            if (!(regionId in regionIndexMap)) regionIndexMap[regionId] = []
            regionIndexMap[regionId].push(i)
        }
    }
    return regionIndexMap
}

// Reads in a csv with the same name as the region file
// Parses it as region id, region name
function generateRegionNameMap(filepath: string) {
    const nameMap: Record<number, string> = {}
    const parsedPath = path.parse(filepath)
    const namePath = path.join(parsedPath.dir, parsedPath.name + '.csv')
    if (fs.existsSync(namePath)) {
        const input = fs.readFileSync(namePath, 'utf8')
        const records: string[][] = parseCSV(input, { columns: false })
        for (const row of records) {
            nameMap[Number(row[0])] = row[1]
        }
    }
    return nameMap
}

async function loadRegionsFromTIFF(
    filePath: string,
    imageWidth: number,
    imageHeight: number,
): Promise<RegionDataImporterResult | RegionDataImporterError> {
    try {
        //Decode tiff data
        const tiffData = await readTiffData(filePath, 0)
        if (tiffData.width != imageWidth || tiffData.height != imageHeight) {
            return {
                filePath: filePath,
                error: 'Segmentation file dimensions do not match image dimensions.',
            }
        }
        const regionMap = generateRegionMap(tiffData.data)
        const nameMap = generateRegionNameMap(filePath)
        return { filePath: filePath, regionIndexMap: regionMap, regionNames: nameMap }
    } catch (err) {
        return { filePath: filePath, error: err.message }
    }
}

ctx.addEventListener(
    'message',
    (message) => {
        const input: RegionDataImporterInput = message.data
        loadRegionsFromTIFF(input.filePath, input.width, input.height).then((message) => {
            ctx.postMessage(message)
        })
    },
    false,
)
