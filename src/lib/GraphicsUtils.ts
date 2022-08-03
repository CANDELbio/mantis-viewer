import { ColorMatrix } from '@pixi/filter-color-matrix'
import * as d3Scale from 'd3-scale'
import * as PIXI from 'pixi.js'

import { hexToRGB } from './ColorHelper'
import { ImageData } from './ImageData'
import { Line, PointData } from './pixi/Line'
import { applyTransform } from './plot/Helper'
import { SegmentationData } from './SegmentationData'
import { ChannelName, PlotTransform } from '../definitions/UIDefinitions'
import { ChannelColorMapping, ChannelMarkerMapping, Coordinate } from '../interfaces/ImageInterfaces'
import { generatePixelMapKey } from '../lib/SegmentationUtils'
import { SelectedPopulation } from '../stores/PopulationStore'

export function imageBitmapToSprite(bitmap: ImageBitmap, blurPixels: boolean): PIXI.Sprite {
    const spriteOptions = { format: PIXI.FORMATS.LUMINANCE, scaleMode: PIXI.SCALE_MODES.LINEAR }
    if (!blurPixels) spriteOptions.scaleMode = PIXI.SCALE_MODES.NEAREST
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const sprite = PIXI.Sprite.from(bitmap, spriteOptions)
    if (!blurPixels) sprite.roundPixels = false
    return sprite
}

export function hexToFilterMatrix(hex: number): ColorMatrix {
    const rgbColor = hexToRGB(hex)
    return [rgbColor.r / 255, 0, 0, 0, 0, 0, rgbColor.g / 255, 0, 0, 0, 0, 0, rgbColor.b / 255, 0, 0, 0, 0, 0, 1, 0]
}

export function highlightCoordinate(
    graphics: PIXI.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
): void {
    graphics
        .lineStyle({ width: 2, alpha: 1, color: 0xffffff })
        .moveTo(x, 0)
        .lineTo(x, height)
        .moveTo(0, y)
        .lineTo(width, y)
}

// Draws a selected region of the format [x, y, x, y, ...] of the given color and alpha
export function drawSelectedRegion(
    selectionGraphics: PIXI.Graphics,
    selection: number[],
    color: number,
    alpha: number,
): void {
    selectionGraphics.clear()
    selectionGraphics.beginFill(color)
    selectionGraphics.drawPolygon(selection)
    selectionGraphics.endFill()
    selectionGraphics.alpha = alpha
}

// Returns an array of segmentIds whose centroids collide with the selection in selectionGraphics
export function findSegmentsInSelection(
    selectionGraphics: PIXI.Graphics | PIXI.Sprite,
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

// Expects an array containing arrays of pixel locations.
// Each array of pixel locations should be the coordinates of the outline.
// The easiest way to get these is from the SegmentationData segmentOutlineMap
export function drawOutlines(line: Line, outlines: Coordinate[][], color: number): void {
    for (const outline of outlines) {
        // Always set the alpha to 1.0 and adjust it elsewhere
        // Otherwise PIXI is funny with calculating alpha, and it becomes difficult to set to 1.0 later
        line.addShape({ points: outline as PointData[], color: color, alpha: 1 })
    }
}

export function generateBrightnessFilterUniforms(
    channelName: ChannelName,
    imcData: ImageData,
    channelMarker: Record<ChannelName, string | null>,
    channelDomain: Record<ChannelName, [number, number]>,
): { transformMin: number; transformMax: number } | null {
    const curChannelDomain = channelDomain[channelName]

    // Get the max value for the given channel.
    const marker = channelMarker[channelName]
    if (marker) {
        const channelMinMax = imcData.minmax[marker]
        if (channelMinMax) {
            const intensityScale = d3Scale
                .scaleLinear()
                .domain([channelMinMax.min, channelMinMax.max])
                .range([0.0, 1.0])

            // Convert from MinMax domain to 0,1
            const transformMin = intensityScale(curChannelDomain[0])
            const transformMax = intensityScale(curChannelDomain[1])

            return {
                transformMin: transformMin,
                transformMax: transformMax,
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
    channelsOnLegend: boolean,
    channelMarkers: ChannelMarkerMapping,
    channelColors: ChannelColorMapping,
    channelVisibility: Record<ChannelName, boolean>,
    populationsOnLegend: boolean,
    populations: SelectedPopulation[] | null,
    segmentSummaryOnLegend: boolean,
    mousedOverSegments: number[],
    plotTransform: PlotTransform,
    transformCoefficient: number | null,
    segmentFeaturesForLegend: Record<number, Record<string, number>>,
    segmentPopulationsForLegend: Record<number, string[]>,
    regionsOnLegend: boolean,
    regionsForLegend: string[],
): void {
    legendGraphics.clear()
    legendGraphics.removeChildren()

    const legendRectRadius = 3
    const legendPadding = 2 // Padding between text and the edges of the renderer
    const bgBorderWidth = 2 // Width of the white border of the legend
    const textPadding = 1 // Padding between the text and the inner edges of the legend
    const textSpacing = 1 // Spacing between the lines of text for each channel
    const innerBgXY = legendPadding + bgBorderWidth
    const initialTextXY = innerBgXY + textPadding

    let textWidth = 0
    let textHeight = 0
    const legendText: PIXI.Text[] = []

    let spacerHeight = 0

    const addText = (text: string, color: number): void => {
        if (textWidth != 0) textHeight += textSpacing // Add spacing to text width if this is not the first one.
        const pixiText = new PIXI.Text(text, {
            fontFamily: 'Arial',
            fontSize: 14,
            fill: color,
            align: 'center',
        })
        const textY = initialTextXY + textHeight
        pixiText.setTransform(initialTextXY, textY)
        textHeight += pixiText.height
        textWidth = Math.max(textWidth, pixiText.width)
        legendText.push(pixiText)
        if (spacerHeight == 0) spacerHeight = pixiText.height
    }

    // Create channel names
    if (channelsOnLegend) {
        for (const s in channelMarkers) {
            const curChannel = s as ChannelName
            const curMarker = channelMarkers[curChannel]
            // If a marker is selected for the channel and the image data has a sprite for that marker
            if (channelVisibility[curChannel] && curMarker && imcData.bitmaps[curMarker]) {
                addText(curMarker, channelColors[curChannel])
            }
        }
    }

    // Keep track of the number of channels on the legend.
    // If there are channels on the legend and populations will be added
    // We will add a spacer to separate the sections
    const numChannelsOnLegend = legendText.length

    // Create population names
    if (populationsOnLegend && populations != null) {
        let spacerAdded = false
        for (const population of populations) {
            if (population.visible) {
                if (!spacerAdded && numChannelsOnLegend > 0) {
                    textHeight += spacerHeight
                    spacerAdded = true
                }
                addText(population.name, population.color)
            }
        }
    }

    if (segmentSummaryOnLegend && mousedOverSegments.length > 0) {
        if (legendText.length > 0) textHeight += spacerHeight
        for (const segmentId of mousedOverSegments) {
            addText('Hovered: Segment ' + segmentId, 0xffffff)
            // Create population names for populations that the highlighted segment belongs to.
            if (populations != null) {
                const segmentPopulations = segmentPopulationsForLegend[segmentId]
                if (segmentPopulations) {
                    for (const population of populations) {
                        if (segmentPopulations.includes(population.id)) {
                            addText(population.name, population.color)
                        }
                    }
                }
            }
            const segmentFeatures = segmentFeaturesForLegend[segmentId]
            if (segmentFeatures) {
                if (plotTransform != 'none') {
                    const transformLabel = plotTransform == 'log' ? 'Log10' : 'ArcSinh'
                    addText(transformLabel + ' transformed values', 0xffffff)
                }
                for (const segmentFeature of Object.keys(segmentFeatures)) {
                    const segmentFeatureValue = applyTransform(
                        segmentFeatures[segmentFeature],
                        plotTransform,
                        transformCoefficient,
                    )
                    const featureValueString = segmentFeatureValue
                        ? Number(segmentFeatureValue.toFixed(4)).toString()
                        : 'NA'
                    // Feels silly, but calling to fixed first to round to 4 decimals,
                    // then back to number and to string to drop trailing 0s.
                    addText(segmentFeature + ': ' + featureValueString, 0xffffff)
                }
            }
        }
    } else if (populations != null && regionsOnLegend && regionsForLegend.length > 0) {
        if (legendText.length > 0) textHeight += spacerHeight
        addText('Hovered:', 0xffffff)
        for (const population of populations) {
            if (regionsForLegend.includes(population.id)) {
                addText(population.name, population.color)
            }
        }
    }

    // If we generated marker text, render the legend
    if (legendText.length > 0) {
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

        for (const textGraphics of legendText) {
            legendGraphics.addChild(textGraphics)
        }
    }
}

// Expects an array from a PIXI pixel extract that has four entries per pixel (r, g, b, a) with flipped Y indexes.
// Turns this into an array of pixel indexes of the pixels that have non-zero alpha values.
// Uses min and max x and y values to constrain the region where it's looking for non-zero alpha values.
// Used to get the pixels from a drawn selection to find the segments in that selection
export function RGBAtoPixelIndexes(
    RGBAValues: Uint8Array | Uint8ClampedArray,
    width: number,
    height: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
): number[] {
    const indexes: Set<number> = new Set()
    for (let y = minY; y <= maxY; y++) {
        // PIXI Pixel extract flips the Y values, so we need to flip them back here.
        const flippedY = height - y - 1
        for (let x = minX; x <= maxX; x++) {
            const flippedIndex = flippedY * width + x
            const RGBAIndex = flippedIndex << 2
            // If the alpha is set for this pixel then add the non-flipped pixel index.
            if (RGBAValues[RGBAIndex + 3] > 0) {
                const pixelIndex = y * width + x
                indexes.add(pixelIndex)
            }
        }
    }
    return Array.from(indexes)
}

// Generates a sprite of width and height with the pixels at the passed in indexes set to 100% alpha.
// Also builds a set that contains a string of x_y coordinates for pixels in the sprite/region
export async function processPixelIndexes(
    indexes: number[],
    width: number,
    height: number,
): Promise<{ bitmap: ImageBitmap; set: Set<string> }> {
    const set = new Set<string>()
    const canvas = document.createElement('canvas')

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')

    if (ctx) {
        const imageData = ctx.getImageData(0, 0, width, height)
        const canvasData = imageData.data

        for (const pixelIndex of indexes) {
            // Convert the pixel index to x, y and add to the set.
            const x = pixelIndex % width
            const y = Math.floor(pixelIndex / width)
            set.add(generatePixelMapKey(x, y))

            // Get the index on the canvas by multiplying by 4 (i.e. bitshifting by 2)
            const canvasIndex = pixelIndex << 2
            canvasData[canvasIndex] = 255
            canvasData[canvasIndex + 1] = 255
            canvasData[canvasIndex + 2] = 255
            canvasData[canvasIndex + 3] = 255
        }
        ctx.putImageData(imageData, 0, 0)
    }
    const bitmap = await createImageBitmap(canvas)

    return { bitmap: bitmap, set: set }
}

export function drawBackgroundRect(graphics: PIXI.Graphics, width: number, height: number) {
    graphics.clear()
    graphics.removeChildren()
    graphics.beginFill(0x000000).drawRect(0, 0, width, height).endFill()
}
