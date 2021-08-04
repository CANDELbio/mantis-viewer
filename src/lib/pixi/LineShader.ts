import { Program, Shader } from 'pixi.js'
import frag from './line-shader.frag'
import vert from './line-shader.vert'

export default class LineShader extends Shader {
    constructor() {
        super(Program.from(vert, frag), {
            tint: [1, 1, 1, 1],
            uDivisor: 2,
            thickness: 0.5,
            uAlpha: 1,
        })
    }

    set alpha(value: number) {
        this.uniforms.uAlpha = value
    }
    get alpha(): number {
        return this.uniforms.uAlpha
    }
}
