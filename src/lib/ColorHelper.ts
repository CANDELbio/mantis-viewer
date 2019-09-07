export function randomHexColor(): number {
    return Math.round(0xffffff * Math.random())
}

export function randomRGBColor(): { r: number; g: number; b: number } {
    let c = randomHexColor()
    let r = c >> 16
    let g = (c >> 8) & 255
    let b = c & 255
    return { r: r, g: g, b: b }
}

// Gets RGB values from a hex number representing a color.
export function hexToRGB(hex: number): { r: number; g: number; b: number } {
    let r = (hex >> 16) & 255
    let g = (hex >> 8) & 255
    let b = hex & 255
    return { r: r, g: g, b: b }
}

export function hexToString(hex: number): string {
    let str = hex.toString(16)
    str = '000000'.substr(0, 6 - str.length) + str
    return '#' + str
}
