import { Db } from './Db'
import * as path from 'path'
import * as fs from 'fs'

let db: Db

beforeAll(() => {
    const basePath = path.join(process.cwd(), 'test')
    db = new Db(basePath)
})

afterAll(() => {
    fs.unlinkSync(db.dbPath())
})

test('constructor', () => {
    expect(fs.existsSync(db.dbPath())).toBe(true)
})

test('numFeatures', () => {
    expect(db.numFeatures()).toEqual(0)
})

const imageSet1 = 'set1'
const imageSet2 = 'set2'
const feature = 'feature1'
const segmentValues1 = { 1: 1.0, 2: 2.0, 3: 3.0 }
const segmentValues2 = { 1: 4.0, 2: 5.0, 3: 6.0 }

test('insertFeatures', () => {
    db.insertFeatures(imageSet1, feature, segmentValues1)
    db.insertFeatures(imageSet2, feature, segmentValues2)
    expect(db.numFeatures()).toEqual(6)
})

test('selectValues', () => {
    const selectedFeatures = db.selectValues([imageSet1, imageSet2], feature)
    expect(selectedFeatures[imageSet1]).toEqual(segmentValues1)
    expect(selectedFeatures[imageSet2]).toEqual(segmentValues2)
})

test('featuresPresent', () => {
    const present = db.featuresPresent(imageSet1)
    const notPresent = db.featuresPresent('not present')
    expect(present).toBe(true)
    expect(notPresent).toBe(false)
})

test('listFeatures', () => {
    const features = db.listFeatures(imageSet1)
    expect(features).toEqual([feature])
})

test('maxValue', () => {
    const maxValue = db.maxValue(imageSet1, feature)
    expect(maxValue).toEqual(3.0)
})

test('minValue', () => {
    const minValue = db.minValue(imageSet1, feature)
    expect(minValue).toEqual(1.0)
})

test('minMaxValues', () => {
    const minMaxes = db.minMaxValues([imageSet1, imageSet2], feature)
    expect(minMaxes[imageSet1]).toEqual({ min: 1.0, max: 3.0 })
    expect(minMaxes[imageSet2]).toEqual({ min: 4.0, max: 6.0 })
})

test('deleteFeatures', () => {
    db.deleteFeatures(imageSet1, feature)
    expect(db.numFeatures()).toEqual(3)
    db.deleteFeatures(imageSet2, feature)
    expect(db.numFeatures()).toEqual(0)
})

test('upsertSettings', () => {
    db.upsertSettings({ hello: 'world' })
    expect(db.numSettings()).toEqual(1)
    db.upsertSettings({ hello: 'goodbye' })
    db.upsertSettings({ test: 123 })
    db.upsertSettings({ float: 3.14 })
    db.upsertSettings({ value: { foo: 'bar' } })
    expect(db.numSettings()).toEqual(4)
})

test('getSettings', () => {
    expect(db.getSettings()).toEqual({
        hello: 'goodbye',
        test: 123,
        float: 3.14,
        value: { foo: 'bar' },
    })
})
