import * as PIXI from 'pixi.js'

import { SegmentationData } from './SegmentationData'
import { ImageData } from './ImageData'
import { ChannelName, ChannelColorMap } from '../definitions/UIDefinitions'
import { PixelLocation } from '../interfaces/ImageInterfaces'

export function imageBitmapToSprite(bitmap: ImageBitmap): PIXI.Sprite {
    let offScreen = document.createElement('canvas')

    offScreen.width = bitmap.width
    offScreen.height = bitmap.height

    let ctx = offScreen.getContext('2d')
    if (ctx) ctx.drawImage(bitmap, 0, 0)
    return new PIXI.Sprite(PIXI.Texture.fromCanvas(offScreen))
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
    let centroidGraphics = new PIXI.Graphics()

    centroidGraphics.beginFill(color)
    for (let segmentId in selectedCentroids) {
        let centroid = selectedCentroids[segmentId]
        drawCross(centroidGraphics, centroid.x, centroid.y, 2, 0.5)
    }
    centroidGraphics.endFill()

    return centroidGraphics
}

// Draws a selected region of the format [x, y, x, y, ...] of the given color and alpha
export function drawSelectedRegion(selection: number[], color: number, alpha: number): PIXI.Graphics {
    let selectionGraphics = new PIXI.Graphics()
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
    let selectedSegments: number[] = []
    if (segmentationData != null) {
        for (let segmentId in segmentationData.centroidMap) {
            let centroid = segmentationData.centroidMap[segmentId]
            let centroidPoint = new PIXI.Point(centroid.x, centroid.y)
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
    let outlineGraphics = new PIXI.Graphics()
    // Always set the alpha to 1.0 and adjust it elsewhere
    // Otherwise PIXI is funny with calculating alpha, and it becomes difficult to set to 1.0 later
    outlineGraphics.lineStyle(width, color, 1, alignment)
    for (let outline of outlines) {
        // Copy the outline array so we're not modifying the one being passed in
        outline = outline.slice()
        let start = outline.shift()
        if (start) {
            outlineGraphics.moveTo(start.x, start.y)
            for (let point of outline) {
                outlineGraphics.lineTo(point.x, point.y)
            }
        }
    }
    return outlineGraphics
}

// Generating brightness filter code for the passed in channel.
export function generateBrightnessFilterCode(): string {
    let filterCode = `
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
): PIXI.UniformDataMap<Record<string, any>> | null {
    let curChannelDomain = channelDomain[channelName]

    // Get the max value for the given channel.
    let marker = channelMarker[channelName]
    if (marker) {
        let channelMax = imcData.minmax[marker].max

        // Using slider values to generate m and b for a linear transformation (y = mx + b).
        let b = curChannelDomain[0] === 0 ? 0 : curChannelDomain[0] / channelMax
        let m = curChannelDomain[1] === 0 ? 0 : channelMax / (curChannelDomain[1] - curChannelDomain[0])

        return {
            m: {
                type: 'f',
                value: m,
            },
            b: {
                type: 'f',
                value: b,
            },
            red: {
                type: 'b',
                value: ['rChannel', 'mChannel', 'yChannel', 'kChannel'].includes(channelName),
            },
            green: {
                type: 'b',
                value: ['gChannel', 'cChannel', 'yChannel', 'kChannel'].includes(channelName),
            },
            blue: {
                type: 'b',
                value: ['bChannel', 'cChannel', 'mChannel', 'kChannel'].includes(channelName),
            },
        }
    } else {
        return null
    }
}

export function drawLegend(
    legendGraphics: PIXI.Graphics,
    imcData: ImageData,
    channelMarkers: Record<ChannelName, string | null>,
): void {
    legendGraphics.clear()
    legendGraphics.removeChildren()

    let legendRectRadius = 3
    let legendPadding = 2 // Padding between text and the edges of the renderer
    let bgBorderWidth = 2 // Width of the white border of the legend
    let textPadding = 1 // Padding between the text and the inner edges of the legend
    let textSpacing = 1 // Spacing between the lines of text for each channel
    let innerBgXY = legendPadding + bgBorderWidth
    let initialTextlXY = innerBgXY + textPadding

    let textWidth = 0
    let textHeight = 0
    let markerText: PIXI.Text[] = []

    // Create channel names
    for (let s in channelMarkers) {
        let curChannel = s as ChannelName
        let curMarker = channelMarkers[curChannel]
        // If a marker is selected for the channel and the image data has a sprite for that marker
        if (curMarker && imcData.sprites[curMarker]) {
            if (textWidth != 0) textHeight += textSpacing // Add spacing to text width if this is not the first one.
            let text = new PIXI.Text(curMarker, {
                fontFamily: 'Arial',
                fontSize: 14,
                fill: ChannelColorMap[curChannel],
                align: 'center',
            })
            let textY = initialTextlXY + textHeight
            text.setTransform(initialTextlXY, textY)
            textHeight += text.height
            textWidth = Math.max(textWidth, text.width)
            markerText.push(text)
        }
    }

    // If we generated marker text, render the legend
    if (markerText.length > 0) {
        let outerLegendWidth = textWidth + (bgBorderWidth + textPadding) * 2
        let outerLegnedHeight = textHeight + (bgBorderWidth + textPadding) * 2
        legendGraphics.beginFill(0xffffff)
        legendGraphics.drawRoundedRect(
            legendPadding,
            legendPadding,
            outerLegendWidth,
            outerLegnedHeight,
            legendRectRadius,
        )
        legendGraphics.endFill()

        let innerLegendWidth = textWidth + textPadding * 2
        let innerLegendHeight = textHeight + textPadding * 2
        legendGraphics.beginFill(0x000000)
        legendGraphics.drawRoundedRect(innerBgXY, innerBgXY, innerLegendWidth, innerLegendHeight, legendRectRadius)
        legendGraphics.endFill()

        for (let textGraphics of markerText) {
            legendGraphics.addChild(textGraphics)
        }
    }
}
