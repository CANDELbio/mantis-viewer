/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Buffer, DRAW_MODES, Geometry, TYPES, utils } from 'pixi.js'

import { PointData } from './Line'

export interface ShapeData {
    color: number
    alpha: number
    points: PointData[]

    // used internally
    _start?: number
    _size?: number
    _colorCache?: number
    _alphaCache?: number
}

interface RenderData {
    doubleUpArray: Float32Array
    directionArray: Float32Array
    colors: Uint8Array
    index: number
}

export default class LineGeometry extends Geometry {
    shapes: ShapeData[]
    private _dirty: boolean
    private _colorDirty: boolean
    private _size = -1
    private _session: RenderData

    constructor() {
        super()

        const data = Buffer.from([])

        this.addAttribute('direction', [], 1)
            .addAttribute('position', data, 2, undefined, undefined, 0, 4 * 4)
            .addAttribute('next', data, 2, undefined, undefined, 0, 8 * 4)
            .addAttribute('prev', data, 2, undefined, undefined, 0, 0)
            .addAttribute('color', [], 4, true, TYPES.UNSIGNED_BYTE, 0, 0)
        //	.addIndex([]);

        //@ts-ignore
        this.drawMode = DRAW_MODES.TRIANGLE_STRIP

        this.shapes = []
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    init(): void {}

    addShape(shape: ShapeData): void {
        this.shapes.push(shape)
        this._dirty = true
    }

    clear(): void {
        this.shapes = []
    }

    updateShape(): void {
        this._dirty = true
    }

    updateColor(): void {
        this._colorDirty = true
    }

    /*
	convert points data to the mesh
	TODO Optimize by adding a sleep parameter!
	TODO if line is same size - don't create new array
	TODO to much [i] access, create variables
	 */
    update(): void {
        if (this._dirty) {
            this._dirty = false
            this._colorDirty = false

            this._buildLine()
        } else if (this._colorDirty) {
            this._updateColor()
        }
    }

    private _updateColor(): void {
        const colorBuffer = this.getBuffer('color')
        const tempRGB = [1, 1, 1]

        const colorArray = colorBuffer.data

        for (let i = 0; i < this.shapes.length; i++) {
            const shape = this.shapes[i]

            if (shape._colorCache !== shape.color || shape._alphaCache !== shape.alpha) {
                shape._colorCache = shape.color
                shape._alphaCache = shape.alpha

                //@ts-ignore
                let index = shape._start * 4 * 2

                const color = utils.hex2rgb(shape.color, tempRGB)

                //@ts-ignore
                for (let j = 0; j < shape._size; j++) {
                    //@ts-ignore
                    colorArray[index++] = color[0] * 255
                    //@ts-ignore
                    colorArray[index++] = color[1] * 255
                    //@ts-ignore
                    colorArray[index++] = color[2] * 255
                    //@ts-ignore
                    colorArray[index++] = shape.alpha * 255

                    //@ts-ignore
                    colorArray[index++] = color[0] * 255
                    //@ts-ignore
                    colorArray[index++] = color[1] * 255
                    //@ts-ignore
                    colorArray[index++] = color[2] * 255
                    //@ts-ignore
                    colorArray[index++] = shape.alpha * 255
                }
            }
        }

        colorBuffer.update()
    }

    private _buildLine(): void {
        const buffer = this.getBuffer('position')
        const directionBuffer = this.getBuffer('direction')
        const colorBuffer = this.getBuffer('color')

        const size = this._calculateBufferSize()

        if (this._size !== size) {
            this._size = size
            this._session = {
                doubleUpArray: new Float32Array(size * 4),
                directionArray: new Float32Array(size * 2),
                colors: new Uint8Array(size * 4 * 2),
                index: 0,
            }
        }

        const session = this._session

        session.index = 0

        let lastPoint = null

        const color = [0, 0, 0, 1]

        for (let i = 0; i < this.shapes.length; i++) {
            const shape = this.shapes[i]
            const points = shape.points
            const firstPoint = points[0]

            shape._start = session.index

            utils.hex2rgb(shape.color, color)

            if (lastPoint) {
                // join!
                this._addPoint(lastPoint, color, session, true)

                this._addPoint(lastPoint, color, session, true)

                this._addPoint(firstPoint, color, session, true)

                this._addPoint(firstPoint, color, session, true)
            } else {
                this._addPoint(firstPoint, color, session, false)
            }

            // first point!
            this._addPoint(firstPoint, color, session, false)

            // new shape!
            for (let j = 0; j < points.length; j++) {
                const point = points[j]

                this._addPoint(point, color, session, false)

                lastPoint = point
            }

            // close the shape...
            if (true) {
                this._addPoint(firstPoint, color, session, false)
                this._addPoint(firstPoint, color, session, false)

                lastPoint = firstPoint
            }

            shape._size = session.index - shape._start
        }

        //@ts-ignore
        this._addPoint(lastPoint, color, session, false)

        buffer.update(session.doubleUpArray)
        directionBuffer.update(session.directionArray)
        colorBuffer.update(session.colors)

        //@ts-ignore
        this.start = 2
        //@ts-ignore
        this.size = size * 2 - 4 - 2
    }

    private _calculateBufferSize(): number {
        let size = (this.shapes.length - 1) * 3

        for (let i = 0; i < this.shapes.length; i++) {
            size += 4 + this.shapes[i].points.length
        }

        size++

        return size
    }

    private _addPoint(point: PointData, color: number[], session: RenderData, joint: boolean): void {
        const { doubleUpArray, directionArray, colors, index } = session

        doubleUpArray[index * 4] = point.x
        doubleUpArray[index * 4 + 1] = point.y
        doubleUpArray[index * 4 + 2] = point.x
        doubleUpArray[index * 4 + 3] = point.y

        const length = joint ? 0 : 1.25

        directionArray[index * 2] = -length
        directionArray[index * 2 + 1] = length

        colors[index * 8] = color[0] * 255
        colors[index * 8 + 1] = color[1] * 255
        colors[index * 8 + 2] = color[2] * 255
        colors[index * 8 + 3] = color[3] * 255

        colors[index * 8 + 4] = color[0] * 255
        colors[index * 8 + 5] = color[1] * 255
        colors[index * 8 + 6] = color[2] * 255
        colors[index * 8 + 7] = color[3] * 255

        session.index++
    }
}
