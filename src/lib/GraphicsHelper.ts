import * as PIXI from 'pixi.js'

import { SegmentationData } from './SegmentationData'
import { ImageData } from './ImageData'
import { ChannelName, ChannelColorMap } from '../definitions/UIDefinitions'
import { PixelLocation } from '../interfaces/ImageInterfaces'

export function imageBitmapToSprite(bitmap: ImageBitmap, blurPixels: boolean): PIXI.Sprite {
    const offScreen = document.createElement('canvas')

    offScreen.width = bitmap.width
    offScreen.height = bitmap.height

    const ctx = offScreen.getContext('2d')
    if (ctx) ctx.drawImage(bitmap, 0, 0)
    const spriteOptions = blurPixels ? undefined : { scaleMode: PIXI.SCALE_MODES.NEAREST }
    const sprite = PIXI.Sprite.from(offScreen, spriteOptions)
    if (!blurPixels) sprite.roundPixels = false
    return sprite
}

// Draws a cross in the following order centered at X and Y
//
//       (2) *     * (3)
//
// (12)* (1) *     * (4) * (5)
//
// (11)* (10)*     * (7) * (6)
//
//      (9) *      * (8)
//
function drawCross(graphics: PIXI.Graphics, x: number, y: number, armLength: number, armHalfWidth: number): void {
    graphics.drawPolygon([
        x - armHalfWidth,
        y + armHalfWidth, //1
        x - armHalfWidth,
        y + armHalfWidth + armLength,
        x + armHalfWidth,
        y + armHalfWidth + armLength,
        x + armHalfWidth,
        y + armHalfWidth,
        x + (armHalfWidth + armLength),
        y + armHalfWidth,
        x + (armHalfWidth + armLength),
        y - armHalfWidth,
        x + armHalfWidth,
        y - armHalfWidth,
        x + armHalfWidth,
        y - (armHalfWidth + armLength),
        x - armHalfWidth,
        y - (armHalfWidth + armLength),
        x - armHalfWidth,
        y - armHalfWidth,
        x - (armHalfWidth + armLength),
        y - armHalfWidth,
        x - (armHalfWidth + armLength),
        y + armHalfWidth, //12
    ])
}

// When passed a map of segmentIds to their centroids
export function drawCentroids(selectedCentroids: { [key: number]: PixelLocation }, color: number): PIXI.Graphics {
    const centroidGraphics = new PIXI.Graphics()

    centroidGraphics.beginFill(color)
    for (const segmentId in selectedCentroids) {
        const centroid = selectedCentroids[segmentId]
        drawCross(centroidGraphics, centroid.x, centroid.y, 2, 0.5)
    }
    centroidGraphics.endFill()

    return centroidGraphics
}

// Draws a selected region of the format [x, y, x, y, ...] of the given color and alpha
export function drawSelectedRegion(selection: number[], color: number, alpha: number): PIXI.Graphics {
    const selectionGraphics = new PIXI.Graphics()
    selectionGraphics.beginFill(color)
    selectionGraphics.drawPolygon(selection)
    selectionGraphics.endFill()
    selectionGraphics.alpha = alpha
    return selectionGraphics
}

// Returns an array of segmentIds whose centroids collide with the selection in selectionGraphics
export function findSegmentsInSelection(
    selectionGraphics: PIXI.Graphics,
    segmentationData: SegmentationData | null,
): number[] {
    const selectedSegments: number[] = []
    if (segmentationData != null) {
        for (const segmentId in segmentationData.centroidMap) {
            const centroid = segmentationData.centroidMap[segmentId]
            const centroidPoint = new PIXI.Point(centroid.x, centroid.y)
            if (selectionGraphics.containsPoint(centroidPoint)) {
                selectedSegments.push(Number(segmentId))
            }
        }
    }
    return selectedSegments
}

// Cleans up the graphics/sprites passed in.
// Used to delete selectionGraphics and segmentOutlineGraphics when a user is actively selecting.
export function cleanUpStage(
    stage: PIXI.Container,
    selectionGraphics: PIXI.Graphics | null,
    segmentOutlineGraphics: PIXI.Graphics | null,
): void {
    if (selectionGraphics != null) {
        stage.removeChild(selectionGraphics)
        selectionGraphics.destroy()
    }

    if (segmentOutlineGraphics != null) {
        stage.removeChild(segmentOutlineGraphics)
        segmentOutlineGraphics.destroy()
    }
}

// Expects an array containing arrays of pixel locations.
// Each array of pixel locations should be the coordinates of the outline.
// The easiest way to get these is from the SegmentationData segmentOutlineMap
export function drawOutlines(
    outlines: PixelLocation[][],
    color: number,
    width: number,
    alignment = 0.5,
): PIXI.Graphics {
    const outlineGraphics = new PIXI.Graphics()
    // Always set the alpha to 1.0 and adjust it elsewhere
    // Otherwise PIXI is funny with calculating alpha, and it becomes difficult to set to 1.0 later
    outlineGraphics.lineStyle(width, color, 1, alignment)
    for (let outline of outlines) {
        // Copy the outline array so we're not modifying the one being passed in
        outline = outline.slice()
        const start = outline.shift()
        if (start) {
            outlineGraphics.moveTo(start.x, start.y)
            for (const point of outline) {
                outlineGraphics.lineTo(point.x, point.y)
            }
        }
    }
    return outlineGraphics
}

// Generating brightness filter code for the passed in channel.
export function generateBrightnessFilterCode(): string {
    const filterCode = `
    varying vec2 vTextureCoord;
    varying vec4 vColor;

    uniform sampler2D uSampler;
    uniform vec4 uTextureClamp;
    uniform vec4 uColor;

    uniform float b;
    uniform float m;

    uniform bool red;
    uniform bool green;
    uniform bool blue;

    void main(void)
    {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
        if(red == true)
        {
            gl_FragColor.r = min((gl_FragColor.r * m) + b, 1.0);
        }
        if(green == true)
        {
            gl_FragColor.g = min((gl_FragColor.g * m) + b, 1.0);
        }
        if (blue == true)
        {
            gl_FragColor.b = min((gl_FragColor.b * m) + b, 1.0);
        }

    }`

    return filterCode
}

export function generateBrightnessFilterUniforms(
    channelName: ChannelName,
    imcData: ImageData,
    channelMarker: Record<ChannelName, string | null>,
    channelDomain: Record<ChannelName, [number, number]>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> | null {
    const curChannelDomain = channelDomain[channelName]

    // Get the max value for the given channel.
    const marker = channelMarker[channelName]
    if (marker) {
        const channelMinMax = imcData.minmax[marker]
        if (channelMinMax) {
            const channelMax = channelMinMax.max

            // Using slider values to generate m and b for a linear transformation (y = mx + b).
            const b = curChannelDomain[0] === 0 ? 0 : curChannelDomain[0] / channelMax
            const m = curChannelDomain[1] === 0 ? 0 : channelMax / (curChannelDomain[1] - curChannelDomain[0])

            return {
                m: m,
                b: b,
                red: ['rChannel', 'mChannel', 'yChannel', 'kChannel'].includes(channelName),
                green: ['gChannel', 'cChannel', 'yChannel', 'kChannel'].includes(channelName),
                blue: ['bChannel', 'cChannel', 'mChannel', 'kChannel'].includes(channelName),
            }
        }
    }
    return null
}

function drawHollowRectangle(
    graphics: PIXI.Graphics,
    color: number,
    x: number,
    y: number,
    width: number,
    height: number,
    lineWidth: number,
): void {
    const x1 = x
    const y1 = y
    const x2 = x1 + width
    const y2 = y1 + height

    const hx1 = x1 + lineWidth
    const hy1 = y1 + lineWidth
    const hx2 = x2 - lineWidth
    const hy2 = y2 - lineWidth

    graphics.beginFill(color)
    graphics.drawPolygon([x1, y1, x2, y1, x2, y2, x1, y2])
    graphics.beginHole()
    graphics.drawPolygon([hx1, hy1, hx2, hy1, hx2, hy2, hx1, hy2])
    graphics.endHole()
    graphics.endFill()
}

export function drawZoomInset(
    insetGraphics: PIXI.Graphics,
    imageWidth: number,
    imageHeight: number,
    rendererWidth: number,
    rendererHeight: number,
    stageWidth: number,
    stageHeight: number,
    stageX: number,
    stageY: number,
    scaleRatio = 1,
): void {
    insetGraphics.clear()
    insetGraphics.removeChildren()

    // Width of the lines being drawn
    const lineWidth = 2 * scaleRatio
    // Padding between the outside border and the renderer. Set as a constant.
    const borderPadding = 2 * scaleRatio
    // Height of the zoom inset outside border. Set as a constant.
    const borderHeight = 60 * scaleRatio
    const insetRatio = borderHeight / imageHeight
    const borderWidth = imageWidth * insetRatio
    const borderX = rendererWidth - (borderWidth + borderPadding)
    const borderY = borderPadding

    drawHollowRectangle(insetGraphics, 0xffffff, borderX, borderY, borderWidth, borderHeight, lineWidth)

    const xZoomRatio = rendererWidth / stageWidth
    const yZoomRatio = rendererHeight / stageHeight

    let insetHeight = borderHeight * yZoomRatio
    let insetWidth = borderWidth * xZoomRatio
    const insetX = borderX + (Math.abs(stageX) / stageWidth) * borderWidth
    const insetY = borderY + (Math.abs(stageY) / stageHeight) * borderHeight

    // If the inset is running over the edge of the outside border
    // we change the height so that it stops at the border.
    if (insetX + insetWidth > borderX + borderWidth) insetWidth = borderX + borderWidth - insetX
    if (insetY + insetHeight > borderY + borderHeight) insetHeight = borderY + borderHeight - insetY

    drawHollowRectangle(insetGraphics, 0xffffff, insetX, insetY, insetWidth, insetHeight, lineWidth)
}

export function drawLegend(
    legendGraphics: PIXI.Graphics,
    imcData: ImageData,
    channelMarkers: Record<ChannelName, string | null>,
): void {
    legendGraphics.clear()
    legendGraphics.removeChildren()

    const legendRectRadius = 3
    const legendPadding = 2 // Padding between text and the edges of the renderer
    const bgBorderWidth = 2 // Width of the white border of the legend
    const textPadding = 1 // Padding between the text and the inner edges of the legend
    const textSpacing = 1 // Spacing between the lines of text for each channel
    const innerBgXY = legendPadding + bgBorderWidth
    const initialTextlXY = innerBgXY + textPadding

    let textWidth = 0
    let textHeight = 0
    const markerText: PIXI.Text[] = []

    // Create channel names
    for (const s in channelMarkers) {
        const curChannel = s as ChannelName
        const curMarker = channelMarkers[curChannel]
        // If a marker is selected for the channel and the image data has a sprite for that marker
        if (curMarker && imcData.sprites[curMarker]) {
            if (textWidth != 0) textHeight += textSpacing // Add spacing to text width if this is not the first one.
            const text = new PIXI.Text(curMarker, {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: ChannelColorMap[curChannel],
                align: 'center',
            })
            const textY = initialTextlXY + textHeight
            text.setTransform(initialTextlXY, textY)
            textHeight += text.height
            textWidth = Math.max(textWidth, text.width)
            markerText.push(text)
        }
    }

    // If we generated marker text, render the legend
    if (markerText.length > 0) {
        const outerLegendWidth = textWidth + (bgBorderWidth + textPadding) * 2
        const outerLegnedHeight = textHeight + (bgBorderWidth + textPadding) * 2
        legendGraphics.beginFill(0xffffff)
        legendGraphics.drawRoundedRect(
            legendPadding,
            legendPadding,
            outerLegendWidth,
            outerLegnedHeight,
            legendRectRadius,
        )
        legendGraphics.endFill()

        const innerLegendWidth = textWidth + textPadding * 2
        const innerLegendHeight = textHeight + textPadding * 2
        legendGraphics.beginFill(0x000000)
        legendGraphics.drawRoundedRect(innerBgXY, innerBgXY, innerLegendWidth, innerLegendHeight, legendRectRadius)
        legendGraphics.endFill()

        for (const textGraphics of markerText) {
            legendGraphics.addChild(textGraphics)
        }
    }
}
