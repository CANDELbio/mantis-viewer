import better = require('better-sqlite3')

import * as path from 'path'
import { DbFilename } from '../definitions/UIDefinitions'

export class Db {
    private basePath: string
    private db: better.Database

    public constructor(basePath: string) {
        this.basePath = basePath
        this.initialize()
    }

    public dbPath(): string {
        return path.join(this.basePath, DbFilename)
    }

    private getConnection(): better.Database {
        return new better(this.dbPath(), { verbose: console.log })
    }

    private initialize(): void {
        const db = this.getConnection()
        db.prepare(
            `CREATE TABLE IF NOT EXISTS features (
                image_set TEXT NOT NULL,
                marker TEXT,
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

    public insertFeatures(
        imageSet: string,
        marker: string,
        feature: string,
        segmentValues: Record<number, number>,
    ): void {
        const db = this.getConnection()
        const insert = db.prepare(`INSERT INTO features (image_set, marker, feature, segment_id, value)
                                   VALUES (@imageSet, @marker, @feature, @segmentId, @value)`)

        const insertMany = db.transaction((features) => {
            for (const feature of features) insert.run(feature)
        })

        const features = []
        const segmentIds = Object.keys(segmentValues).map((value) => parseInt(value))
        for (const segmentId of segmentIds) {
            const value = segmentValues[segmentId]
            features.push({ imageSet: imageSet, marker: marker, feature: feature, segmentId: segmentId, value: value })
        }
        insertMany(features)

        db.close()
    }

    public selectFeatures(imageSet: string, marker: string, feature: string): Record<number, number> {
        const results: Record<number, number> = {}
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT segment_id, value
                                 FROM features
                                 WHERE image_set = ? AND
                                 marker = ? AND
                                 feature = ?`)

        for (const row of stmt.iterate(imageSet, marker, feature)) {
            results[row.segment_id] = row.value
        }

        db.close()
        return results
    }

    public minValue(imageSet: string, marker: string, feature: string): number {
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT MIN(value) AS min
                                 FROM features
                                 WHERE image_set = ? AND
                                 marker = ? AND
                                 feature = ?`)
        const minFeature = stmt.get(imageSet, marker, feature)
        return minFeature.min
    }

    public maxValue(imageSet: string, marker: string, feature: string): number {
        const db = this.getConnection()
        const stmt = db.prepare(`SELECT MAX(value) AS max
                                 FROM features
                                 WHERE image_set = ? AND
                                 marker = ? AND
                                 feature = ?`)
        const maxFeature = stmt.get(imageSet, marker, feature)
        return maxFeature.max
    }
}
