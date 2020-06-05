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

const imageSet = 'set1'
const feature = 'feature1'
const segmentValues = { 1: 1.0, 2: 2.0, 3: 3.0 }

test('insertFeatures', () => {
    db.insertFeatures(imageSet, feature, segmentValues)
    expect(db.numFeatures()).toEqual(3)
})

test('selectValues', () => {
    const selectedFeatures = db.selectValues(imageSet, feature)
    expect(selectedFeatures).toEqual(segmentValues)
})

test('featuresPresent', () => {
    const present = db.featuresPresent(imageSet)
    const notPresent = db.featuresPresent('set2')
    expect(present).toBe(true)
    expect(notPresent).toBe(false)
})

test('listFeatures', () => {
    const features = db.listFeatures(imageSet)
    expect(features).toEqual([feature])
})

test('maxValue', () => {
    const maxValue = db.maxValue(imageSet, feature)
    expect(maxValue).toEqual(3.0)
})

test('minValue', () => {
    const minValue = db.minValue(imageSet, feature)
    expect(minValue).toEqual(1.0)
})

test('minMaxValues', () => {
    const minMax = db.minMaxValues(imageSet, feature)
    expect(minMax).toEqual({ min: 1.0, max: 3.0 })
})

test('deleteFeatures', () => {
    db.deleteFeatures(imageSet, feature)
    expect(db.numFeatures()).toEqual(0)
})
