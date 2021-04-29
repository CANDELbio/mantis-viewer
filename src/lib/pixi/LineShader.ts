import { Program, Shader, utils } from 'pixi.js'
import { LineOptions } from './Line'
import frag from './line-shader.frag'
import vert from './line-shader.vert'

export default class LineShader extends Shader {
    constructor(options: LineOptions) {
        super(Program.from(vert, frag), {
            tint: [1, 1, 1, 1],
            uDivisor: 2,
            thickness: 2,
        })

        let color = null
        const alpha = 1

        if (options.color) {
            const rgb = utils.hex2rgb(options.color)
            color = [rgb[0], rgb[1], rgb[2], alpha]
        } else {
            color = [1, 1, 1, alpha]
        }

        this.uniforms.tint = color
    }
}
