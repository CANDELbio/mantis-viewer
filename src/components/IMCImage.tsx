import * as React from "react"
import * as PIXI from "pixi.js"
import { observer } from "mobx-react"
import { IMCData } from "../lib/IMCData"
import { ChannelName } from "../interfaces/UIDefinitions"
import { SegmentationData, PixelLocation } from "../lib/SegmentationData";
import * as Shortid from 'shortid'

export interface IMCImageProps {

    imageData: IMCData,
    segmentationData: SegmentationData | null
    segmentationAlpha: number
    channelDomain: Record<ChannelName, [number, number]>
    channelMarker: Record<ChannelName, string | null>
    canvasWidth: number
    canvasHeight: number 
    onCanvasDataLoaded: ((data: ImageData) => void),
    windowWidth: number | null,
    selectedRegions: Array<IMCImageSelection> | null,
    addSelectedRegion: ((region: IMCImageSelection) => void)
    segmentsSelectedOnGraph: number[]
    addSelectedSegments: ((regionId:string, segmentIds:number[]) => void)

}

export interface IMCImageSelection {
    id: string
    // The coordinates of the selected region. In PIXI polygon format [x1, y1, x2, y2, ...]
    selectedRegion: number[]
    name: string
    notes: string | null
}

@observer
export class IMCImage extends React.Component<IMCImageProps, {}> {

    el:HTMLDivElement | null = null

    renderer: PIXI.WebGLRenderer
    rootContainer: PIXI.Container
    stage: PIXI.Container
    
    // Color filters to use so that the sprites display as the desired color
    channelFilters: Record<ChannelName, PIXI.filters.ColorMatrixFilter>

    // The width at which the stage should be fixed.
    rendererWidth: number
    // The scaled height of the stage.
    scaledHeight: number
    // The minimum scale for zooming. Based on the fixed width/image width
    minScale: number

    // Segmentation data stored locally for two reasons:
    // 1) Calculation of segments/centroids in selected regions
    // 2) If segmentation data being passed in from store are different. If they are
    // We re-render the segmentationSprite and segmentationCentroidGraphics below.
    segmentationData: SegmentationData | null
    segmentationSprite: PIXI.Sprite | null
    segmentationCentroidGraphics: PIXI.Graphics | null

    // Selected regions stored locally so that we can compare to the selected regions being passed in from the store
    // If there is a difference, we update this object and the rerender the graphics stored in selectedRegionGraphics
    // selectedRegionGraphics below
    selectedRegions: Array<IMCImageSelection> | null
    selectedRegionGraphics: Array<PIXI.Graphics> | null

    // Same as selected regions stuff above but for segments that have been selected on the scatterplot and need to be highlighted.
    selectedSegmentsFromGraph: number[] = []
    selectedSegmentsFromGraphGraphics: PIXI.Graphics | null

    // Variables dealing with mouse movement. Either dragging dragging or selecting.
    dragging: boolean
    selecting: boolean

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

        this.rendererWidth = 700
        this.minScale = 1.0

        this.dragging = false
        this.selecting = false
    }

    onCanvasDataLoaded = (data: ImageData) => this.props.onCanvasDataLoaded(data)
    addSelectedRegionToStore = (region: IMCImageSelection) => this.props.addSelectedRegion(region)
    addSelectedSegmentsToStore = (regionId:string, segmentIds:number[]) => this.props.addSelectedSegments(regionId, segmentIds)

    // Checks to make sure that we haven't panned past the bounds of the stage.
    checkSetStageBounds() {
        // Not able to scroll past top left corner
        if(this.stage.position.x > 0) this.stage.position.x = 0
        if(this.stage.position.y > 0) this.stage.position.y = 0

        // Calculate where the coordinates of the botttom right corner are in relation to the current window/stage size and the scale of the image.
        let minX = this.rendererWidth - (this.props.imageData.width * this.stage.scale.x)
        let minY = this.scaledHeight - (this.props.imageData.height * this.stage.scale.y)

        // Not able to scroll past the bottom right corner
        if(this.stage.position.x < minX) this.stage.position.x = minX
        if(this.stage.position.y < minY) this.stage.position.y = minY
    }

    checkSetMinScale(){
        if (this.stage.scale.x < this.minScale && this.stage.scale.y < this.minScale) {
            //Cant zoom out out past the minScale (where the stage fills the renderer)
            this.stage.scale.x = this.minScale
            this.stage.scale.y = this.minScale
            return true
        }
        return false
    }

    zoom(isZoomIn:boolean) {
        let beforeTransform = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
        
        let direction = isZoomIn ? 1 : -1
        let factor = (1 + direction * 0.05)
        this.stage.scale.x *= factor
        this.stage.scale.y *= factor

        let atMinScale = this.checkSetMinScale()

        //If we are actually zooming in/out then move the x/y position so the zoom is centered on the mouse
        if (!atMinScale) {
            this.stage.updateTransform()
            let afterTransform = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)

            this.stage.position.x += (afterTransform.x - beforeTransform.x) * this.stage.scale.x
            this.stage.position.y += (afterTransform.y - beforeTransform.y) * this.stage.scale.y
        }
        this.checkSetStageBounds()
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
                this.checkSetStageBounds()
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

    // Returns a map of segmentId to centroid for the segments/centroids that collide with the selection in selectionGraphics
    findSegmentCentroidsInSelection(selectionGraphics:PIXI.Graphics, segmentationData:SegmentationData|null){
        if(segmentationData != null){
            let selectedSegments:{[key:number] : PixelLocation}  = {}
            for(let segmentId in segmentationData.centroidMap){
                let centroid = segmentationData.centroidMap[segmentId]
                let centroidPoint = new PIXI.Point(centroid.x, centroid.y)
                if(selectionGraphics.containsPoint(centroidPoint)){
                    selectedSegments[segmentId] = centroid
                }
            } 
            return selectedSegments
        } else {
            return null
        }
    }

    drawSelectedCentroids(selectedCentroids:{[key:number] : PixelLocation}, color: number){
        let centroidGraphics = new PIXI.Graphics()
        centroidGraphics.beginFill(color)
        for(let segment in selectedCentroids){
            let centroid = selectedCentroids[segment]
            this.drawCross(centroidGraphics, centroid.x, centroid.y, 2, 0.5)
        }
        centroidGraphics.endFill()
        return centroidGraphics
    }

    drawSelectedRegion(selection:number[], color:number, alpha:number){
        let selectionGraphics = new PIXI.Graphics()
        selectionGraphics.beginFill(color)
        selectionGraphics.drawPolygon(selection)
        selectionGraphics.endFill()
        selectionGraphics.alpha = alpha
        return selectionGraphics
    }

    newROIName(){
        if (this.props.selectedRegions == null) return "Selection 1"
        return "Selection " + (this.props.selectedRegions.length + 1).toString()
    }

    // Deletes the selectionGraphics and centroidGraphics being passed in (important when the user is actively selecting and these are being redrawn)
    // Then draws a new selectionGraphics of the region, finds the segments and their centroids in that selectionGraphics, and draws the selectedCentroids.
    // Returns the selectedCentroids and the graphics objects so that they can be deleted if we are re-drawing.
    selectRegion(stage: PIXI.Container,
        selection:number[],
        selectionGraphics:PIXI.Graphics|null,
        selectedCentroids: {[key:number] : PixelLocation}|null,
        centroidGraphics: PIXI.Graphics|null = null){

        if(selectionGraphics != null){
            stage.removeChild(selectionGraphics)
            selectionGraphics.destroy()
        }

        if(centroidGraphics != null){
            stage.removeChild(centroidGraphics)
            centroidGraphics.destroy()
        }

        selectionGraphics = this.drawSelectedRegion(selection, 0xf1c40f, 0.5)
        selectedCentroids = this.findSegmentCentroidsInSelection(selectionGraphics, this.segmentationData)

        if(selectedCentroids != null){
            centroidGraphics = this.drawSelectedCentroids(selectedCentroids, 0xffffff)
        }

        return {selectionGraphics: selectionGraphics, selectedCentroids: selectedCentroids, centroidGraphics: centroidGraphics}
    }

    // Converts a selectedCentroids map (segmentId to centroid PixelLocation) to an array of segmentIds and adds to the store.
    addSelectedCentroidsToStore(regionId: string, selectedCentroids: {[key:number] : PixelLocation}|null){
        let selectedSegments = []
        if (selectedCentroids != null) {
            for(let segmentId in selectedCentroids){
                selectedSegments.push(Number(segmentId))
            }
        }
        this.addSelectedSegmentsToStore(regionId, selectedSegments)
    }

    addSelect(el:HTMLDivElement){
        let selection:number[] = []
        // Graphics object storing the selected area
        let selectionGraphics: PIXI.Graphics|null = null
        // Array of PixelLocations of the selected centroids
        let selectedCentroids: {[key:number] : PixelLocation}|null = null
        //Graphics object storing the selected centroids
        let centroidGraphics: PIXI.Graphics|null = null


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

                let toUnpack = this.selectRegion(this.stage, selection, selectionGraphics, selectedCentroids, centroidGraphics)
                selectionGraphics = toUnpack.selectionGraphics
                selectedCentroids = toUnpack.selectedCentroids
                centroidGraphics = toUnpack.centroidGraphics

                this.stage.addChild(selectionGraphics)
                if(centroidGraphics != null) this.stage.addChild(centroidGraphics)

                this.renderer.render(this.rootContainer)
            }
        })

        // If the mouse is released stop selecting
        el.addEventListener('mouseup', e => {
            if(this.selecting){
                if(selectionGraphics != null) {
                    let region = {
                        id: Shortid.generate(),
                        selectedRegion: selection,
                        name: this.newROIName(),
                        notes: null
                    }
                    // Add to the global collection of selected layers
                    this.addSelectedRegionToStore(region)

                    this.addSelectedCentroidsToStore(region.id, selectedCentroids)
                }
                // Clear the temp storage now that we've stored the selection.
                selectionGraphics = null
                centroidGraphics  = null
                selectedCentroids = null
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
        return graphics
    }

    // Checks the stage scale factor and x,y position to make sure we aren't too zoomed out
    // Or haven't moved the stage outside of the renderer bounds
    checkScale(){
        this.checkSetMinScale()
        this.checkSetStageBounds()
    }

    setScaleFactors(imcData: IMCData){
        // Setting up the scale factor to account for the fixed width
        let scaleFactor = this.rendererWidth / imcData.width
        let width = imcData.width * scaleFactor
        let height = imcData.height * scaleFactor
        this.minScale = scaleFactor
        this.scaledHeight = height
        this.checkScale()
    }

    // Resizes the WebGL Renderer and sets the new scale factors accordingly.
    // TODO: Should we update the x,y position and zoom/scale of the stage relative to the resize amount?
    // If so, use this to get started: let resizeFactor = windowWidth / this.rendererWidth
    resizeGraphics(imcData: IMCData, windowWidth: number){
        this.rendererWidth = windowWidth
        this.setScaleFactors(imcData)
        this.renderer.resize(this.rendererWidth, this.scaledHeight)
    }

    initializeGraphics(imcData: IMCData, windowWidth: number){
        if(this.el == null) return

        this.rendererWidth = windowWidth
        this.setScaleFactors(imcData)

        // Setting up the renderer
        this.renderer = new PIXI.WebGLRenderer(this.rendererWidth, this.scaledHeight)
        this.el.appendChild(this.renderer.view)

        // Setting the initial scale/zoom of the stage so the image fills the stage when we start.
        this.stage.scale.x = this.minScale
        this.stage.scale.y = this.minScale

        // Setting up event listeners
        // TODO: Make sure these don't get added again if a new set of images is selected.
        this.addZoom(this.el)
        this.addPan(this.el)
        this.addSelect(this.el)
    }

    loadChannelGraphics(curChannel:ChannelName,
        imcData: IMCData,
        channelMarker: Record<ChannelName, string | null>,
        channelDomain: Record<ChannelName, [number, number]> ){
        
            let curMarker = channelMarker[curChannel]
            if(curMarker != null){
                let sprite = imcData.sprites[curMarker]
                let brightnessFilterCode = this.generateBrightnessFilterCode(curChannel, imcData, channelMarker, channelDomain)
                let brightnessFilter = new PIXI.Filter(undefined, brightnessFilterCode, undefined)
                // Delete sprite filters so they get cleared from memory before adding new ones
                sprite.filters = [brightnessFilter, this.channelFilters[curChannel]]
                this.stage.addChild(sprite)
            }
    }

    // Add segmentation data to the stage.
    loadSegmentationGraphics(segmentationData: SegmentationData, segmentationAlpha:number){
        if(segmentationData != this.segmentationData){
            this.segmentationData = segmentationData
            this.segmentationSprite = segmentationData.segmentSprite
            this.segmentationCentroidGraphics = this.drawSegmentCentroids(segmentationData, 0xf1c40f) // fill yellow
        }
        // Add segmentation cells
        if(this.segmentationSprite!=null){
            this.segmentationSprite.alpha = segmentationAlpha/10
            this.stage.addChild(this.segmentationSprite)
        }

        // Add segmentation centroids
        if(this.segmentationCentroidGraphics!=null) this.stage.addChild(this.segmentationCentroidGraphics)
    }

    // Add the selected ROIs to the stage. Regenerates the PIXI layers if they aren't present.
    loadSelectedRegionGraphics(selectedRegions:Array<IMCImageSelection>){
        if(selectedRegions != this.selectedRegions){
            this.selectedRegions = selectedRegions
            this.selectedRegionGraphics = []
            for(let region of selectedRegions) {
                let toUnpack = this.selectRegion(this.stage, region.selectedRegion, null, null, null)
                this.addSelectedCentroidsToStore(region.id, toUnpack.selectedCentroids)
                this.selectedRegionGraphics.push(toUnpack.selectionGraphics)
                if(toUnpack.centroidGraphics != null)this.selectedRegionGraphics.push(toUnpack.centroidGraphics)
            }
        }
        if(this.selectedRegionGraphics != null){
            for(let graphics of this.selectedRegionGraphics){
                this.stage.addChild(graphics)
            }
        }
    }

    loadSelectedSegmentGraphics(segmentationData: SegmentationData, selectedSegments: number[]){
        if(selectedSegments != this.selectedSegmentsFromGraph){
            this.selectedSegmentsFromGraph = selectedSegments
            let selectedSegmentMap:{[key:number] : PixelLocation} = {}
            for(let segmentId of selectedSegments){
                selectedSegmentMap[segmentId] = segmentationData.centroidMap[segmentId]
            }
            this.selectedSegmentsFromGraphGraphics = this.drawSelectedCentroids(selectedSegmentMap, 0xff0000)
        }
        if(this.selectedSegmentsFromGraphGraphics != null){
            this.stage.addChild(this.selectedSegmentsFromGraphGraphics)
        }
    }

    renderImage(el: HTMLDivElement|null, 
        imcData: IMCData, 
        channelMarker: Record<ChannelName, string | null>,
        channelDomain: Record<ChannelName, [number, number]>, 
        segmentationData: SegmentationData | null,
        segmentationAlpha: number,
        selectedRegions: Array<IMCImageSelection> | null,
        selectedSegmentsFromGraph: number[],
        windowWidth: number) {

        if(el == null)
            return
        this.el = el

        if(!this.el.hasChildNodes()) {
            this.initializeGraphics(imcData, windowWidth)
        }

        if(this.rendererWidth != windowWidth){
            this.resizeGraphics(imcData, windowWidth)
        }

        this.stage.removeChildren()

        // For each channel setting the brightness and color filters
        for (let s of ["rChannel", "gChannel", "bChannel"]) {
            let curChannel = s as ChannelName
            this.loadChannelGraphics(curChannel, imcData, channelMarker, channelDomain)
        }

        if(segmentationData != null){
            this.loadSegmentationGraphics(segmentationData, segmentationAlpha)
        }

        if(selectedRegions != null) {
            this.loadSelectedRegionGraphics(selectedRegions)
        }

        if(segmentationData != null){
            this.loadSelectedSegmentGraphics(segmentationData, selectedSegmentsFromGraph)
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

        let regions = this.props.selectedRegions

        let selectedSegmentsFromGraph = this.props.segmentsSelectedOnGraph

        let renderWidth = 700
        if(this.props.windowWidth != null){
            // We need to set the render width smaller than the window width to account for the controls around it.
            // Since we're using a React Fluid Grid we need to account for the fact that the controls around it will
            // become larger as the window becomes larger
            // Not perfect as the scale seems to be logarithmic at the edges, but works for now.
            renderWidth = (this.props.windowWidth/12) * 4.75
        } 

        return(
            <div className="imcimage"
                    ref={(el) => {this.renderImage(el, imcData, channelMarker, channelDomain, segmentationData, segmentationAlpha, regions, selectedSegmentsFromGraph, renderWidth)}}
            />
        )
    }
}