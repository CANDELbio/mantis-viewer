import tinycolor from 'tinycolor2'

export function randomHexColor(): number {
    return Math.round(0xffffff * Math.random())
}

export function randomRGBColor(): { r: number; g: number; b: number } {
    const c = randomHexColor()
    const r = c >> 16
    const g = (c >> 8) & 255
    const b = c & 255
    return { r: r, g: g, b: b }
}

// Gets RGB values from a hex number representing a color.
export function hexToRGB(hex: number): { r: number; g: number; b: number } {
    const r = (hex >> 16) & 255
    const g = (hex >> 8) & 255
    const b = hex & 255
    return { r: r, g: g, b: b }
}

export function hexToString(hex: number): string {
    let str = hex.toString(16)
    str = '000000'.substr(0, 6 - str.length) + str
    return '#' + str
}

export function stringToHex(str: string): number {
    return parseInt(str.replace(/^#/, ''), 16)
}

export function highlightColor(hex: number): number {
    const tc = tinycolor(hexToString(hex))
    return stringToHex(tc.brighten(30).saturate(30).toHexString())
}
