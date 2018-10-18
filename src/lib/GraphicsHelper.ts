import * as PIXI from "pixi.js"
import { SegmentationData } from "./SegmentationData"
import { ImageData } from "./ImageData"
import { ChannelName,
    SelectedRegionAlpha,
    SelectedCentroidColor,
    DefaultSelectedRegionColor } from "../interfaces/UIDefinitions"

import { PixelLocation } from "../interfaces/ImageInterfaces"

// Gets RGB values from a hex number representing a color.
export function hexToRGB(hex: number){
    let r = (hex >> 16) & 255
    let g = (hex >> 8) & 255
    let b = hex & 255
    return {r: r, g: g, b: b}
}

// Given a list of pixel locations to draw, draws those pixels on a canvas of width and height with the passed in rgba color.
function generateSpriteFromPixels(pixels: PixelLocation[], color: number, alpha: number, width: number, height: number) {
    let offScreen = document.createElement("canvas")
    offScreen.width = width
    offScreen.height = height

    let ctx = offScreen.getContext("2d")
    if(ctx) {
        let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
        let canvasData = imageData.data

        let rgbColor = hexToRGB(color)
        for(let pixel of pixels){
            // Canvas data is a linear array that has four entries per pixel.
            // This is how we convert from x, y coords to the start index for the canvas data.
            let i = ((pixel.y * width) + pixel.x) * 4
            canvasData[i] = rgbColor.r
            canvasData[i+1] = rgbColor.g
            canvasData[i+2] = rgbColor.b
            canvasData[i+3] = 255 //alpha
        }
        
        ctx.putImageData(imageData, 0, 0)

    }
    let sprite = new PIXI.Sprite(PIXI.Texture.fromCanvas(offScreen))
    sprite.alpha = alpha
    return(sprite)
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
function drawCross(graphics:PIXI.Graphics, x:number, y:number, armLength: number, armHalfWidth: number){
    graphics.drawPolygon([
        x - armHalfWidth, y + armHalfWidth, //1
        x - armHalfWidth, y + armHalfWidth + armLength,
        x + armHalfWidth, y + armHalfWidth + armLength,
        x + armHalfWidth, y + armHalfWidth,
        x + (armHalfWidth + armLength), y + armHalfWidth,
        x + (armHalfWidth + armLength), y - armHalfWidth,
        x + armHalfWidth, y - armHalfWidth,
        x + armHalfWidth, y - (armHalfWidth + armLength),
        x - armHalfWidth, y - (armHalfWidth + armLength),
        x - armHalfWidth, y - armHalfWidth,
        x - (armHalfWidth + armLength), y - armHalfWidth,
        x - (armHalfWidth + armLength), y + armHalfWidth //12
    ])
}

// When passed a map of segmentIds to their centroids
export function drawCentroids(selectedCentroids:{[key:number] : PixelLocation}, color: number){
    let centroidGraphics = new PIXI.Graphics()

    centroidGraphics.beginFill(color)
    for(let segmentId in selectedCentroids){
        let centroid = selectedCentroids[segmentId]
        drawCross(centroidGraphics, centroid.x, centroid.y, 2, 0.5)
    }
    centroidGraphics.endFill()

    return centroidGraphics
}

// Draws a selected region of the format [x, y, x, y, ...] of the given color and alpha
export function drawSelectedRegion(selection:number[], color:number, alpha:number){
    let selectionGraphics = new PIXI.Graphics()
    selectionGraphics.beginFill(color)
    selectionGraphics.drawPolygon(selection)
    selectionGraphics.endFill()
    selectionGraphics.alpha = alpha
    return selectionGraphics
}

// Returns an array of segmentIds whose centroids collide with the selection in selectionGraphics
function findSegmentsInSelection(selectionGraphics:PIXI.Graphics, segmentationData:SegmentationData){
    let selectedSegments:number[] = []
    for(let segmentId in segmentationData.centroidMap){
        let centroid = segmentationData.centroidMap[segmentId]
        let centroidPoint = new PIXI.Point(centroid.x, centroid.y)
        if(selectionGraphics.containsPoint(centroidPoint)){
            selectedSegments.push(Number(segmentId))
        }
    } 
    return selectedSegments
}

// Cleans up the graphics/sprites passed in.
export function cleanUpStage(stage: PIXI.Container, selectionGraphics:PIXI.Graphics|null, segmentOutlineGraphics: PIXI.Graphics|null){
    if(selectionGraphics != null){
        stage.removeChild(selectionGraphics)
        selectionGraphics.destroy()
    }

    if(segmentOutlineGraphics != null){
        stage.removeChild(segmentOutlineGraphics)
        segmentOutlineGraphics.destroy()
    }
}

// Deletes the selectionGraphics and centroidGraphics being passed in (important when the user is actively selecting and these are being redrawn)
// Then draws a new selectionGraphics of the region, finds the segments and their centroids in that selectionGraphics, and draws the selectedCentroids.
// Returns the selectedCentroids and the graphics objects so that they can be deleted if we are re-drawing.
export function selectRegion(selection:number[], segmentationData: SegmentationData|null, color = DefaultSelectedRegionColor, alpha = SelectedRegionAlpha){

    let selectionGraphics = drawSelectedRegion(selection, color, alpha)
    
    let selectedSegments:number[] = []
    if(segmentationData != null){
        selectedSegments = findSegmentsInSelection(selectionGraphics, segmentationData)
    }

    return {selectionGraphics: selectionGraphics,
        selectedSegments: selectedSegments}
}

// Generates yellow, semi-transparent segments and white centroids for highlighted segments
// TODO: Clean up. Constant values for rgba stuff and other colors.
// TODO: Maybe pregenerate or cache sprite? Seems to be pretty fast to generate on the fly though.
export function generateSelectedSegmentGraphics(segmentationData: SegmentationData, selectedSegments: number[], segmentColor:number, imcData: ImageData) {
    let selectedSegmentMap:{[key:number] : PixelLocation} = {}
    let pixels:PixelLocation[] = []
    for(let segmentId of selectedSegments){
        selectedSegmentMap[segmentId] = segmentationData.centroidMap[segmentId]
        pixels = pixels.concat(segmentationData.segmentLocationMap[segmentId])
    }
    let centroidGraphics = drawCentroids(selectedSegmentMap, SelectedCentroidColor)
    let segmentSprite = generateSpriteFromPixels(pixels, segmentColor, SelectedRegionAlpha, imcData.width, imcData.height)
    return {centroids: centroidGraphics, segments: segmentSprite}
}

// Expects an array containing arrays of pixel locations.
// Each array of pixel locations should be the coordinates of the outline.
// The easiest way to get these is from the SegmentationData segmentOutlineMap
export function drawOutlines(outlines: PixelLocation[][], color: number, width = 1, alpha = 1, alignment = 0.5){
    let outlineGraphics = new PIXI.Graphics()
    outlineGraphics.lineStyle(width, color, alpha, alignment)
    for(let outline of outlines){
        // Copy the outline array so we're not modifying the one being passed in
        outline = outline.slice()
        let start = outline.shift()
        if(start){
            outlineGraphics.moveTo(start.x, start.y)
            for(let point of outline){
                outlineGraphics.lineTo(point.x, point.y)
            }
        }
    }
    return outlineGraphics
}

// Generating brightness filter code for the passed in channel.
// Somewhat hacky workaround without uniforms because uniforms weren't working with Typescript.
export function generateBrightnessFilterCode(
    channelName:ChannelName,
    imcData:ImageData,
    channelMarker: Record<ChannelName, string | null>,
    channelDomain:  Record<ChannelName, [number, number]>){

    let curChannelDomain = channelDomain[channelName]

    // Get the max value for the given channel.
    let marker = channelMarker[channelName]
    let channelMax = 100.0
    if (marker != null){
        channelMax = imcData.minmax[marker].max
    }

    // Get the PIXI channel name (i.e. r, g, b) from the first character of the channelName.
    let channel = channelName.charAt(0)

    // Using slider values to generate m and b for a linear transformation (y = mx + b).
    let b = ((curChannelDomain[0] === 0 ) ? 0 : curChannelDomain[0]/channelMax).toFixed(4)
    let m = ((curChannelDomain[1] === 0) ? 0 : (channelMax/(curChannelDomain[1] - curChannelDomain[0]))).toFixed(4)

    let filterCode = `
    varying vec2 vTextureCoord;
    varying vec4 vColor;

    uniform sampler2D uSampler;
    uniform vec4 uTextureClamp;
    uniform vec4 uColor;

    void main(void)
    {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor.${channel} = min((gl_FragColor.${channel} * ${m}) + ${b}, 1.0);
    }`

    return filterCode
}