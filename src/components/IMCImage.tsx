import * as React from "react"
import * as ReactDOM from "react-dom"
import * as d3Array from "d3-array"
import * as fs from "fs"
import * as PIXI from "pixi.js"
import { ImageStore } from "../stores/ImageStore"
import { observer } from "mobx-react"
import { IMCData } from "../lib/IMCData"
import { ChannelName } from "../interfaces/UIDefinitions"
import { quantile } from "../lib/utils"
import { SelectionLayer } from "./SelectionLayer"
import { BrushEventHandler } from "../interfaces/UIDefinitions"
import { SegmentationData, PixelLocation } from "../lib/SegmentationData";

export interface IMCImageProps {

    imageData: IMCData,
    segmentationData: SegmentationData | null
    segmentationAlpha: number
    channelDomain: Record<ChannelName, [number, number]>
    channelMarker: Record<ChannelName, string | null>
    canvasWidth: number
    canvasHeight: number 
    onCanvasDataLoaded: ((data: ImageData) => void)

}

@observer
export class IMCImage extends React.Component<IMCImageProps, undefined> {

    el:HTMLDivElement | null = null

    renderer: PIXI.WebGLRenderer
    rootContainer: PIXI.Container
    stage: PIXI.Container

    channelFilters: Record<ChannelName, PIXI.filters.ColorMatrixFilter>

    // The width at which the stage should be fixed.
    fixedWidth: number
    // The scaled height of the stage.
    scaledHeight: number
    // The minimum scale for zooming. Based on the fixed width/image width
    minScale: number

    segmentationData: SegmentationData | null

    // Variables dealing with mouse movement. Either dragging dragging or selecting.
    dragging: boolean
    selecting: boolean
    // An array of Graphics containing polygons of selected regions
    selected: Array<PIXI.Graphics>

    constructor(props:IMCImageProps) {
        super(props)

        // Need a root container to hold the stage so that we can call updateTransform on the stage.
        this.rootContainer = new PIXI.Container()
        this.stage = new PIXI.Container()
        this.stage.interactive = true
        this.rootContainer.addChild(this.stage)

        let redFilter = new PIXI.filters.ColorMatrixFilter()
        redFilter.matrix = [
            1, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 0, 1, 0
        ]
        redFilter.blendMode = PIXI.BLEND_MODES.ADD

        let greenFilter = new PIXI.filters.ColorMatrixFilter()
        greenFilter.matrix = [
            0, 0, 0, 0, 0,
            0, 1, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 0, 1, 0
        ]
        greenFilter.blendMode = PIXI.BLEND_MODES.ADD

        let blueFilter = new PIXI.filters.ColorMatrixFilter()
        blueFilter.matrix = [
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 1, 0, 0,
            0, 0, 0, 1, 0
        ]
        blueFilter.blendMode = PIXI.BLEND_MODES.ADD

       this.channelFilters = {
            rChannel: redFilter,
            gChannel: greenFilter,
            bChannel: blueFilter
        }

        this.fixedWidth = 675
        this.minScale = 1.0

        this.dragging = false
        this.selecting = false
        this.selected = new Array<PIXI.Graphics>()
    }

    onCanvasDataLoaded = (data: ImageData) => this.props.onCanvasDataLoaded(data)

    // Checks to make sure that we haven't panned past the bounds of the stage.
    checkStageBounds() {
        // Not able to scroll past top left corner
        if(this.stage.position.x > 0) this.stage.position.x = 0
        if(this.stage.position.y > 0) this.stage.position.y = 0

        // Calculate where the coordinates of the botttom right corner are in relation to the current window/stage size and the scale of the image.
        let minX = this.fixedWidth - (this.props.imageData.width * this.stage.scale.x)
        let minY = this.scaledHeight - (this.props.imageData.height * this.stage.scale.y)

        // Not able to scroll past the bottom right corner
        if(this.stage.position.x < minX) this.stage.position.x = minX
        if(this.stage.position.y < minY) this.stage.position.y = minY
    }

    zoom(isZoomIn:boolean) {
        let beforeTransform = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
        
        let direction = isZoomIn ? 1 : -1
        let factor = (1 + direction * 0.05)
        this.stage.scale.x *= factor
        this.stage.scale.y *= factor

        if (this.stage.scale.x < this.minScale && this.stage.scale.y < this.minScale) {
            //Cant zoom out out past 1
            this.stage.scale.x = this.minScale
            this.stage.scale.y = this.minScale
        } else {
            //If we are actually zooming in/out then move the x/y position so the zoom is centered on the mouse
            this.stage.updateTransform()
            let afterTransform = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)

            this.stage.position.x += (afterTransform.x - beforeTransform.x) * this.stage.scale.x
            this.stage.position.y += (afterTransform.y - beforeTransform.y) * this.stage.scale.y
        }
        this.checkStageBounds()
        this.stage.updateTransform()
        this.renderer.render(this.rootContainer)
    }

    addZoom(el:HTMLDivElement) {
        el.addEventListener("wheel", e => {
            e.stopPropagation()
            e.preventDefault()
            this.zoom(e.deltaY < 0)
        })
    }

    addPan(el:HTMLDivElement) {
        let mouseDownX:number, mouseDownY:number

        // On mousedown set dragging to true and save the mouse position where we started dragging
        el.addEventListener("mousedown", e => {
            let altPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.altKey
            if(!altPressed){
                this.dragging = true
                let pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
                mouseDownX = pos.x
                mouseDownY = pos.y
            }
        })

        // If the mouse moves and we are dragging, adjust the position of the stage and rerender.
        el.addEventListener("mousemove", e => {
            if(this.dragging){
                let pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
                let dx = (pos.x - mouseDownX) * this.stage.scale.x
                let dy = (pos.y - mouseDownY) * this.stage.scale.y

                this.stage.position.x += dx
                this.stage.position.y += dy
                this.checkStageBounds()
                this.stage.updateTransform()
                this.renderer.render(this.rootContainer)
            }
        })

        // If the mouse is released stop dragging
        el.addEventListener('mouseup', e => {
            if(this.dragging) { this.dragging = false }
        })

        // If the mouse exits the PIXI element stop dragging
        el.addEventListener('mouseout', e => {
            if(this.dragging) { this.dragging = false }
        })
    }
    
    drawSelection(selection:number[]){
        let selectionGraphics = new PIXI.Graphics()
        selectionGraphics.beginFill(0xf1c40f)
        selectionGraphics.drawPolygon(selection)
        selectionGraphics.endFill()
        selectionGraphics.alpha = 0.5
        this.stage.addChild(selectionGraphics)
        this.renderer.render(this.rootContainer)
        return selectionGraphics
    }

    segmentsInSelection(selectionGraphics:PIXI.Graphics){
        let selectedSegments = new Array<PixelLocation>()
        if(this.segmentationData != null){
            
            for(let segment in this.segmentationData.centroidMap){
                let centroid = this.segmentationData.centroidMap[segment]
                let x = (centroid.x * this.stage.scale.x) + this.stage.position.x
                let y = (centroid.y * this.stage.scale.y) + this.stage.position.y
                let centridPoint = new PIXI.Point(x, y)
                if(selectionGraphics.containsPoint(centridPoint)){
                    selectedSegments.push(centroid)
                }
            } 
        }
        return selectedSegments
    }

    addSelect(el:HTMLDivElement){
        let selection:number[] = []
        let selectionGraphics: PIXI.Graphics|null = null
        // On mousedown, if alt is pressed set selecting to true and save the mouse position where we started selecting
        el.addEventListener("mousedown", e => {
            let altPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.altKey
            if(altPressed){
                this.selecting = true
                let pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
                selection.push(pos.x)
                selection.push(pos.y)
            }
        })

        // If the mouse moves and we are dragging, adjust the position of the stage and rerender.
        el.addEventListener("mousemove", e => {
            if(this.selecting){
                let pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
                selection.push(pos.x)
                selection.push(pos.y)

                if(selectionGraphics != null){
                    this.stage.removeChild(selectionGraphics)
                    selectionGraphics.destroy()
                }

                selectionGraphics = this.drawSelection(selection)
            }
        })

        // If the mouse is released stop selecting
        el.addEventListener('mouseup', e => {
            if(this.selecting){
                if(selectionGraphics != null) {
                    this.selected.push(selectionGraphics)
                    let selectedSegments = this.segmentsInSelection(selectionGraphics)
                    console.log(selectedSegments)

                    let graphics = new PIXI.Graphics()
                    graphics.beginFill(0xe74c3c)
    
                    for(let centroid of selectedSegments){
                        this.drawCross(graphics, centroid.x, centroid.y, 2, 0.5)
                    }
                    graphics.endFill()
                    this.stage.addChild(graphics)
                    this.renderer.render(this.rootContainer)
                }

                selectionGraphics = null
                this.selecting = false
                selection = []
            }
        })
    }
    
    // Generating brightness filter code for the passed in channel.
    // Somewhat hacky workaround without uniforms because uniforms weren't working with Typescript.
    generateBrightnessFilterCode = ( 
        channelName:ChannelName,
        imcData:IMCData, 
        channelMarker: Record<ChannelName, string | null>,
        channelDomain:  Record<ChannelName, [number, number]>) => {

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
    drawCross(graphics:PIXI.Graphics, x:number, y:number, armLength: number, armHalfWidth: number){
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

    drawSegmentCentroids(segmentationData: SegmentationData, color: number) {
        let graphics = new PIXI.Graphics()
        let centroids = segmentationData.centroidMap

        graphics.beginFill(color)

        for(let key in centroids){
            let centroid = centroids[key]
            this.drawCross(graphics, centroid.x, centroid.y, 2, 0.5)
        }
        graphics.endFill()
        this.stage.addChild(graphics)
    }

    renderImage(el: HTMLDivElement, 
        imcData: IMCData, 
        channelMarker: Record<ChannelName, string | null>,
        channelDomain: Record<ChannelName, [number, number]>, 
        segmentationData: SegmentationData | null,
        segmentationAlpha: number) {

        if(el == null)
            return
        this.el = el

        if(!this.el.hasChildNodes()) {
            // Setting up the scale factor to account for the fixed width
            let scaleFactor = this.fixedWidth / imcData.width
            let width = imcData.width * scaleFactor
            let height = imcData.height * scaleFactor
            this.minScale = scaleFactor
            this.scaledHeight = height

            // Setting the initial scale/zoom of the stage so the image fills the stage when we start.
            this.stage.scale.x = scaleFactor
            this.stage.scale.y = scaleFactor

            // Setting up the renderer
            this.renderer = new PIXI.WebGLRenderer(width, height)
            el.appendChild(this.renderer.view)
        
            // Setting up event listeners
            // TODO: Clear these or don't add them again if a new set of images is selected.
            this.addZoom(this.el)
            this.addPan(this.el)
            this.addSelect(this.el)
        }

        this.stage.removeChildren()

        // For each channel setting the brightness and color filters
        for (let s of ["rChannel", "gChannel", "bChannel"]) {
            let curChannel = s as ChannelName
            let curMarker = channelMarker[curChannel] 
            if(curMarker != null) {
                let brightnessFilterCode = this.generateBrightnessFilterCode(curChannel, imcData, channelMarker, channelDomain)
                let brightnessFilter = new PIXI.Filter(undefined, brightnessFilterCode, undefined)
                let sprite = imcData.sprites[curMarker]
                // Delete sprite filters so they get cleared from memory before adding new ones
                sprite.filters = null
                sprite.filters = [brightnessFilter, this.channelFilters[curChannel]]
                this.stage.addChild(sprite)
            }
        }

        // If we have segmentation data then draw the segmentation sprite and render the centroids.
        if(segmentationData != null){
            this.segmentationData = segmentationData
            let sprite = segmentationData.segmentSprite
            sprite.alpha = segmentationAlpha/10
            this.stage.addChild(sprite)
            this.drawSegmentCentroids(segmentationData, 0xf1c40f) // fill yellowv
        }

        // Add the selected ROIs to the stage
        for(let g of this.selected) {
            this.stage.addChild(g)
        }
   
        this.renderer.render(this.rootContainer)
        
    }

    render() {
        //Dereferencing these here is necessary for Mobx to trigger, because
        //render is the only tracked function (i.e. this will not trigger if
        //the variables are dereferenced inside renderImage)
        console.log("Rendering image")
        let channelMarker = {
            rChannel: this.props.channelMarker.rChannel,
            gChannel: this.props.channelMarker.gChannel,
            bChannel: this.props.channelMarker.bChannel
        }
        let channelDomain = {
            rChannel: this.props.channelDomain.rChannel,
            gChannel: this.props.channelDomain.gChannel,
            bChannel: this.props.channelDomain.bChannel
        }
        
        let imcData = this.props.imageData

        let segmentationData = this.props.segmentationData
        let segmentationAlpha = this.props.segmentationAlpha

        return(
            <div className="imcimage"
                    ref={(el) => {this.renderImage(el, imcData, channelMarker, channelDomain, segmentationData, segmentationAlpha)}}
            />
        )
    }
}