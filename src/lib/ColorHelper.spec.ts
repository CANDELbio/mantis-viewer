import { randomHexColor, randomRGBColor, hexToRGB } from './ColorHelper'
import { expect } from 'chai'
import 'mocha'

describe('randomHexColor', () => {
    it('should generate a valid hex color', () => {
        let hexResult = randomHexColor()
        let rgbResult = hexToRGB(hexResult)
        expect(rgbResult['r'] >= 0 && rgbResult['r'] <= 255).to.be.true
        expect(rgbResult['g'] >= 0 && rgbResult['g'] <= 255).to.be.true
        expect(rgbResult['b'] >= 0 && rgbResult['b'] <= 255).to.be.true
    })
})

describe('randomRGBColor', () => {
    it('should generate a valid hex color', () => {
        let rgbResult = randomRGBColor()
        expect(rgbResult['r'] >= 0 && rgbResult['r'] <= 255).to.be.true
        expect(rgbResult['g'] >= 0 && rgbResult['g'] <= 255).to.be.true
        expect(rgbResult['b'] >= 0 && rgbResult['b'] <= 255).to.be.true
    })
})
