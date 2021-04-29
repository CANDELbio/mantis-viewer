/* eslint-disable @typescript-eslint/ban-ts-ignore */
//import * as PIXI from 'pixi.js'
import { Mesh, DRAW_MODES } from 'pixi.js'
import { Coordinate } from '../../interfaces/ImageInterfaces'
import LineGeometry from './LineGeometry'
import LineShader from './LineShader'

export interface LineOptions {
    color: number
}

export class Line extends Mesh {
    constructor(options: LineOptions) {
        const geometry = new LineGeometry()
        const shader = new LineShader(options)

        // @ts-ignore
        super(geometry, shader, null, DRAW_MODES.TRIANGLE_STRIP)

        this.state.depthTest = false
        this.state.culling = false

        this.start = 2
    }

    update(points: Coordinate[]): void {
        // @ts-ignore
        this.geometry.update(points)

        // @ts-ignore
        this.size = this.geometry.indexBuffer.data.length - 2

        this.visible = points.length > 2
    }

    asleep(): boolean {
        return true
    }

    reset(): void {
        // TODO reset!
        // @ts-ignore
        this.geometry.reset()
    }
}
