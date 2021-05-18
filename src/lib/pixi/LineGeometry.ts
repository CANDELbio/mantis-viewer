/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-ts-ignore */

import { Geometry, DRAW_MODES, Buffer } from 'pixi.js'
import { PointData } from './Line'

export default class LineGeometry extends Geometry {
    constructor() {
        super()

        const data = Buffer.from([])

        this.addAttribute('direction', [], 1)
            .addAttribute('position', data, 2, undefined, undefined, 0, 4 * 4)
            .addAttribute('next', data, 2, undefined, undefined, 0, 8 * 4)
            .addAttribute('prev', data, 2, undefined, undefined, 0, 0)
            .addAttribute('color', [])
            .addIndex([])

        //@ts-ignore
        this.drawMode = DRAW_MODES.TRIANGLE_STRIP
    }

    init(): void {}

    /*
	convert points data to the mesh
	TODO Optimize by adding a sleep parameter!
	TODO if line is same size - don't create new array
	TODO to much [i] access, create variables
	 */
    update(points: PointData[]): void {
        if (points.length < 2) return

        const buffer = this.getBuffer('position')
        const directionBuffer = this.getBuffer('direction')
        const colorBuffer = this.getBuffer('color')
        const indexBuffer = this.getIndex()

        // 	let size = 2;// *
        // for (var i = 0; i < points.length; i++)
        // {
        // 	if(!points[i-1])
        // 	{

        // 		size++;
        // 	}

        // 	if(points[i])
        // 	{
        // 		size++;
        // 	}
        // 	else if(points[i+1])
        // 	{
        // 		size += 4;
        // 	}
        // }

        const doubleUpArray: number[] = []
        const directionArray: number[] = []
        const index: number[] = []
        const colors: number[] = []

        let count = 0

        let lastPoint = points[points.length - 1]

        this.addPoint(points[0], doubleUpArray, directionArray, colors)

        for (let i = 0; i < points.length; i++) {
            const point = points[i]
            const nextPoint = points[i + 1]
            const previousPoint = points[i - 1]

            if (!previousPoint) {
                this.addPoint(point, doubleUpArray, directionArray, colors)

                index.push(count++, count++)
            }

            if (point) {
                this.addPoint(point, doubleUpArray, directionArray, colors)

                index.push(count++, count++)

                lastPoint = point
            } else if (nextPoint) {
                this.addJoin(lastPoint, doubleUpArray, directionArray, colors)
                index.push(count++, count++)

                this.addJoin(lastPoint, doubleUpArray, directionArray, colors)
                index.push(count++, count++)

                this.addJoin(nextPoint, doubleUpArray, directionArray, colors)
                index.push(count++, count++)

                this.addJoin(nextPoint, doubleUpArray, directionArray, colors)
                index.push(count++, count++)
            }
        }

        this.addPoint(lastPoint, doubleUpArray, directionArray, colors)

        const posArray = new Float32Array(doubleUpArray)
        const dirArray = new Float32Array(directionArray)
        const colorArray = new Float32Array(colors)
        const indexArray = new Uint32Array(index)

        buffer.update(posArray)
        directionBuffer.update(dirArray)
        colorBuffer.update(colorArray)
        indexBuffer.update(indexArray)

        //@ts-ignore
        this.start = 2
        //@ts-ignore
        this.size = index.length - 2

        //console.log(doubleUpArray.length, size * 4)
    }

    reset(): void {}

    addPoint(point: PointData, doubleUpArray: number[], directionArray: number[], colors: number[]): void {
        const color = point.color

        doubleUpArray.push(point.x, point.y)
        doubleUpArray.push(point.x, point.y)

        directionArray.push(-2, 2)

        colors.push(color[0], color[1], color[2], color[3])
        colors.push(color[0], color[1], color[2], color[3])
    }

    addJoin(point: PointData, doubleUpArray: number[], directionArray: number[], colors: number[]): void {
        doubleUpArray.push(point.x, point.y)
        doubleUpArray.push(point.x, point.y)

        directionArray.push(-0, 0)

        colors.push(1, 1, 0, 1)
        colors.push(1, 1, 0, 1)
    }
}
