import sqlite3 = require('better-sqlite3')

import * as path from 'path'

import { DbFilename } from '../definitions/UIDefinitions'
import { MinMax } from '../interfaces/ImageInterfaces'

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
}
