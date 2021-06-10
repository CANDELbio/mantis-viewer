import { Program, Shader } from 'pixi.js'
import frag from './line-shader.frag'
import vert from './line-shader.vert'

export default class LineShader extends Shader {
    get alpha(): number {
        return this.uniforms.alpha
    }

    set alpha(value: number) {
        this.uniforms.alpha = value
    }

    constructor() {
        super(Program.from(vert, frag), {
            uDivisor: 2,
            thickness: 2,
            alpha: 1,
        })
    }
}
