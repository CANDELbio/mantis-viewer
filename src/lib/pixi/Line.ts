/* eslint-disable @typescript-eslint/ban-ts-comment */
// TODO: Move this into it's own library.
//import * as PIXI from 'pixi.js'
import { Mesh, DRAW_MODES, Renderer } from 'pixi.js'
import LineGeometry, { ShapeData } from './LineGeometry'
import LineShader from './LineShader'

export interface LineOptions {
    color: number
}

export interface PointData {
    x: number
    y: number
}

export class Line extends Mesh {
    constructor() {
        const geometry = new LineGeometry()
        const shader = new LineShader()

        //@ts-ignore
        super(geometry, shader, null, DRAW_MODES.TRIANGLE_STRIP)

        this.state.depthTest = false
        this.state.culling = false

        this.start = 2
    }

    addShape(shape: ShapeData): void {
        ;(this.geometry as LineGeometry).addShape(shape)
    }

    clear(): void {
        ;(this.geometry as LineGeometry).clear()
    }

    updateData(colors: number[], alphas: number[]): void {
        ;(this.geometry as LineGeometry).updateData(colors, alphas)
    }

    render(renderer: Renderer): void {
        ;(this.geometry as LineGeometry).update()

        //@ts-ignore
        this.size = this.geometry.size

        //this.visible = points.length > 2;

        super.render(renderer)
    }

    asleep(): boolean {
        return true
    }

    reset(): void {
        // TODO reset!
        //@ts-ignore
        this.geometry.reset()
    }
}
