import sqlite3 = require('better-sqlite3')

import * as path from 'path'

import { DbFilename } from '../definitions/FileDefinitions'
import { MinMax } from '../interfaces/ImageInterfaces'
import { SelectedPopulation } from '../stores/PopulationStore'

export class Db {
    public basePath: string

    public constructor(basePath: string) {
        this.basePath = basePath
        this.initialize()
    }

    public dbPath(): string {
        return path.join(this.basePath, DbFilename)
    }

    private getConnection(): sqlite3.Database {
        // Uncomment for verbose
        // return new sqlite3(this.dbPath(), { verbose: console.log })
        return new sqlite3(this.dbPath())
    }

    private initialize(): void {
        const db = this.getConnection()
        db.prepare(
            `CREATE TABLE IF NOT EXISTS features (
                image_set TEXT NOT NULL,
                feature TEXT NOT NULL,
                segment_id INTEGER NOT NULL,
                value REAL NOT NULL
            )`,
        ).run()
        db.prepare(
            `CREATE TABLE IF NOT EXISTS settings (
                setting TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL
            )`,
        ).run()
        db.prepare(
            `CREATE TABLE IF NOT EXISTS selections (
                id TEXT NOT NULL UNIQUE,
                image_set TEXT NOT NULL,
                selection_json TEXT NOT NULL
            )`,
        ).run()
        db.close()
    }

    public numFeatures(): number {
        const db = this.getConnection()
        const stmt = db.prepare('SELECT COUNT(*) as count FROM features')
        return stmt.get().count
    }

    public insertFeatures(imageSet: string, feature: string, segmentValues: Record<number, number>): void {
        const db = this.getConnection()
        const insert = db.prepare(`INSERT INTO features (image_set, feature, segment_id, value)
                                   VALUES (@imageSet, @feature, @segmentId, @value)`)

        const insertMany = db.transaction((features) => {
            for (const feature of features) insert.run(feature)
        })

        const features = []
        const segmentIds = Object.keys(segmentValues).map((value) => parseInt(value))
        for (const segmentId of segmentIds) {
            const value = segmentValues[segmentId]
            features.push({ imageSet: imageSet, feature: feature, segmentId: segmentId, value: value })
        }
        insertMany(features)

        db.close()
    }

    public selectValues(imageSets: string[], feature: string): Record<string, Record<number, number>> {
        const results: Record<string, Record<number, number>> = {}
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT image_set, segment_id, value
                                 FROM features
                                 WHERE image_set IN ('${imageSets.join("', '")}') AND
                                 feature = ?`)

        for (const row of stmt.iterate(feature)) {
            if (!(row.image_set in results)) results[row.image_set] = {}
            results[row.image_set][row.segment_id] = row.value
        }

        db.close()
        return results
    }

    public listFeatures(imageSet: string): string[] {
        const results: string[] = []
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT feature
                                 FROM features
                                 WHERE image_set = ?
                                 GROUP BY feature`)

        for (const row of stmt.iterate(imageSet)) {
            results.push(row.feature)
        }

        db.close()
        return results
    }

    public listImageSets(): string[] {
        const results: string[] = []
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT image_set
                                 FROM features
                                 GROUP BY image_set`)

        for (const row of stmt.iterate()) {
            results.push(row.image_set)
        }

        db.close()
        return results
    }

    public featuresPresent(imageSet: string): boolean {
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT COUNT(*) AS count
                                 FROM features
                                 WHERE image_set = ?`)
        const values = stmt.get(imageSet)
        return values.count > 0
    }

    public deleteFeatures(imageSet: string, feature: string): void {
        const db = this.getConnection()
        const stmt = db.prepare(`DELETE FROM features
                                 WHERE image_set = ? AND
                                 feature = ?`)
        stmt.run(imageSet, feature)
    }

    public minMaxValues(imageSets: string[], feature: string): Record<string, MinMax> {
        const results: Record<string, MinMax> = {}
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT image_set, MIN(value) AS min, MAX(value) AS max
                                 FROM features
                                 WHERE image_set IN ('${imageSets.join("', '")}') AND
                                 feature = ?
                                 GROUP BY image_set`)

        for (const row of stmt.iterate(feature)) {
            results[row.image_set] = { min: row.min, max: row.max }
        }
        return results
    }

    public minValue(imageSet: string, feature: string): number {
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT MIN(value) AS min
                                 FROM features
                                 WHERE image_set = ? AND
                                 feature = ?`)
        const minFeature = stmt.get(imageSet, feature)
        return minFeature.min
    }

    public maxValue(imageSet: string, feature: string): number {
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT MAX(value) AS max
                                 FROM features
                                 WHERE image_set = ? AND
                                 feature = ?`)
        const maxFeature = stmt.get(imageSet, feature)
        return maxFeature.max
    }

    public countFeatures(): number {
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT COUNT(*) AS count
                                 FROM features`)
        const values = stmt.get()
        return values.count
    }

    public upsertSettings(settings: Record<string, string | object | number | boolean | undefined | null>): void {
        const db = this.getConnection()
        const insert = db.prepare(`
            INSERT INTO settings(setting,value) VALUES(@setting,@value)
            ON CONFLICT(setting) DO UPDATE SET value=excluded.value;`)
        const insertMany = db.transaction((settings) => {
            for (const setting of settings) insert.run(setting)
        })
        const values: Array<{ setting: string; value: string }> = []
        for (const setting in settings) {
            const value = settings[setting]
            if (value != null || value != undefined) {
                const dbValue = { setting: setting, value: JSON.stringify(value) }
                values.push(dbValue)
            }
        }
        insertMany(values)
        db.close()
    }

    public getSettings(): Record<string, string | object | number | boolean> {
        const results: Record<string, string | object | number | boolean> = {}
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT setting, value
                                 FROM settings`)
        for (const row of stmt.iterate()) {
            results[row.setting] = JSON.parse(row.value)
        }
        return results
    }

    public numSettings(): number {
        const db = this.getConnection()
        const stmt = db.prepare('SELECT COUNT(*) as count FROM settings')
        return stmt.get().count
    }

    public upsertSelections(imageSet: string, selections: SelectedPopulation[]): void {
        const db = this.getConnection()
        const insert = db.prepare(`
            INSERT INTO selections(id,image_set,selection_json) VALUES(@id,@set,@json)
            ON CONFLICT(id) DO UPDATE SET selection_json=excluded.selection_json, image_set=excluded.image_set;`)
        const insertMany = db.transaction((selections) => {
            for (const selection of selections) insert.run(selection)
        })
        const values: Array<{ id: string; set: string; json: string }> = []
        for (const selection of selections) {
            // Making a duplicate so we drop the graphics objects and don't stringify them.
            const savingSelection: SelectedPopulation = {
                id: selection.id,
                renderOrder: selection.renderOrder,
                name: selection.name,
                color: selection.color,
                visible: selection.visible,
                pixelIndexes: selection.pixelIndexes,
                selectedSegments: selection.selectedSegments,
            }
            const dbValue = { id: imageSet + selection.id, set: imageSet, json: JSON.stringify(savingSelection) }
            values.push(dbValue)
        }
        insertMany(values)
        db.close()
    }

    public getSelections(imageSet: string): SelectedPopulation[] {
        const results: SelectedPopulation[] = []
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT selection_json
                                 FROM selections
                                 WHERE image_set = ?`)
        for (const row of stmt.iterate(imageSet)) {
            results.push(JSON.parse(row.selection_json))
        }
        return results
    }

    public deleteSelection(imageSet: string, id: string): void {
        const db = this.getConnection()
        const stmt = db.prepare(`DELETE FROM selections
                                 WHERE id = ?`)
        stmt.run(imageSet + id)
    }

    public numSelections(): number {
        const db = this.getConnection()
        const stmt = db.prepare('SELECT COUNT(*) as count FROM selections')
        return stmt.get().count
    }
}
