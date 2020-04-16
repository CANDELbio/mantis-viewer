import { randomHexColor, randomRGBColor, hexToRGB } from './ColorHelper'

test('randomHexColor', () => {
    const hexResult = randomHexColor()
    const rgbResult = hexToRGB(hexResult)
    expect(rgbResult['r'] >= 0 && rgbResult['r'] <= 255).toBe(true)
    expect(rgbResult['g'] >= 0 && rgbResult['g'] <= 255).toBe(true)
    expect(rgbResult['b'] >= 0 && rgbResult['b'] <= 255).toBe(true)
})

test('randomRGBColor', () => {
    const rgbResult = randomRGBColor()
    expect(rgbResult['r'] >= 0 && rgbResult['r'] <= 255).toBe(true)
    expect(rgbResult['g'] >= 0 && rgbResult['g'] <= 255).toBe(true)
    expect(rgbResult['b'] >= 0 && rgbResult['b'] <= 255).toBe(true)
})
