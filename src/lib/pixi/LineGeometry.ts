/* eslint-disable @typescript-eslint/no-empty-function */
import { Geometry, DRAW_MODES, Buffer } from 'pixi.js'

export default class LineGeometry extends Geometry {
    drawMode: DRAW_MODES
    start: number
    size: number
    constructor() {
        super()

        const data = Buffer.from([])

        this.addAttribute('direction', [], 1)
            .addAttribute('dist', [], 1)
            .addAttribute('position', data, 2, undefined, undefined, 0, 4 * 4)
            .addAttribute('next', data, 2, undefined, undefined, 0, 8 * 4)
            .addAttribute('prev', data, 2, undefined, undefined, 0, 0)
            .addIndex([])

        this.drawMode = DRAW_MODES.TRIANGLE_STRIP
    }

    init(): void {}

    /*
	convert points data to the mesh
	TODO Optimize by adding a sleep parameter!
	TODO if line is same size - don't create new array
	 */
    update(points: { x: number; y: number }[]): void {
        if (points.length < 2) return

        const buffer = this.getBuffer('position')
        const directionBuffer = this.getBuffer('direction')
        const distBuffer = this.getBuffer('dist')
        const indexBuffer = this.getIndex()

        const doubleUpArray = []
        const directionArray = []
        const distArray = []
        const index = []

        doubleUpArray.push(points[0].x, points[0].y)
        doubleUpArray.push(points[0].x, points[0].y)

        directionArray.push(-1, 1)

        let count = 0

        for (let i = 0; i < points.length; i++) {
            doubleUpArray.push(points[i].x, points[i].y)
            doubleUpArray.push(points[i].x, points[i].y)

            directionArray.push(-1, 1)

            index.push(count++, count++)
        }

        distArray.push(0, 0)

        let lx = points[0].x
        let ly = points[0].y

        let disty = 0

        let i
        for (i = 1; i < points.length; i++) {
            const p = points[i]

            const x = p.x
            const y = p.y

            const dx = x - lx
            const dy = y - ly
            const segDist = Math.sqrt(dx * dx + dy * dy)

            disty += segDist

            lx = x
            ly = y

            distArray.push(disty / 100, disty / 100)
        }

        i--

        doubleUpArray.push(points[i].x, points[i].y)
        doubleUpArray.push(points[i].x, points[i].y)

        directionArray.push(-1, 1)

        distArray.push(disty / 100000, disty / 100000)

        const posArray = new Float32Array(doubleUpArray)
        const dirArray = new Float32Array(directionArray)
        const disArray = new Float32Array(distArray)
        const indexArray = new Uint16Array(index)

        buffer.update(posArray)
        directionBuffer.update(dirArray)
        distBuffer.update(disArray)
        indexBuffer.update(indexArray)

        this.start = 2
        this.size = index.length - 2
    }

    reset(): void {}
}
