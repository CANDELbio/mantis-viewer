import * as React from "react"
import * as PIXI from "pixi.js"
import * as fs from "fs"
import { observer } from "mobx-react"

import { ImageData } from "../lib/ImageData"
import { ChannelName,
    SelectedRegionAlpha,
    HighlightedSelectedRegionAlpha,
    UnselectedCentroidColor,
    DefaultSelectedRegionColor,
    HighlightedSegmentOutlineColor,
    SelectedSegmentOutlineAlpha,
    HighlightedSelectedSegmentOutlineAlpha,
    SelectedSegmentOutlineWidth,
    SegmentOutlineColor,
    SegmentOutlineWidth} from "../interfaces/UIDefinitions"
import { SegmentationData } from "../lib/SegmentationData"
import * as GraphicsHelper from "../lib/GraphicsHelper"
import { SelectedPopulation } from "../interfaces/ImageInterfaces"

export interface ImageProps {

    imageData: ImageData,
    segmentationData: SegmentationData | null
    segmentationFillAlpha: number
    segmentationOutlineAlpha: number
    segmentationCentroidsVisible: boolean
    channelDomain: Record<ChannelName, [number, number]>
    channelMarker: Record<ChannelName, string | null>
    canvasWidth: number
    canvasHeight: number 
    onCanvasDataLoaded: ((data: ImageData) => void),
    selectedRegions: Array<SelectedPopulation> | null,
    addSelectedRegion: ((selectedRegion: number[]|null, selectedSegments: number[]) => void)
    hightlightedRegions: string[]
    highlightedSegmentsFromPlot: number[]
    exportPath: string | null
    onExportComplete: (() => void)
    maxRendererSize: {
        width: number
        height: number
    },
}

@observer
export class ImageViewer extends React.Component<ImageProps, {}> {

    el:HTMLDivElement | null = null

    renderer: PIXI.WebGLRenderer
    rootContainer: PIXI.Container
    stage: PIXI.Container

    imageData: ImageData
    
    // Color filters to use so that the sprites display as the desired color
    channelFilters: Record<ChannelName, PIXI.filters.ColorMatrixFilter>

    // The actual width and height of the stage
    rendererWidth: number
    rendererHeight: number
    // The maximum size the stage can be set to
    maxRendererSize: {width:number, height:number}

    // The minimum scale for zooming. Based on the fixed width/image width
    minScale: number

    // Segmentation data stored locally for two reasons:
    // 1) Calculation of segments/centroids in selected regions
    // 2) If segmentation data being passed in from store are different. If they are
    // We re-render the segmentationSprite and segmentationCentroidGraphics below.
    segmentationData: SegmentationData | null
    segmentationSprite: PIXI.Sprite | null
    segmentationOutlineGraphics: PIXI.Graphics | null
    segmentationCentroidGraphics: PIXI.Graphics | null

    // Selected regions stored locally so that we can compare to the selected regions being passed in from the store
    // If there is a difference, we update this object and the rerender the graphics stored in selectedRegionGraphics
    // selectedRegionGraphics is a map of regionId to Graphics
    // selectedRegionGraphics below
    selectedRegions: SelectedPopulation[] | null
    selectedRegionGraphics:{[key:string] : {region: PIXI.Graphics|null, outline: PIXI.Graphics|null}} | null

    // Same as selected regions stuff above but for segments that have been selected on the scatterplot and need to be highlighted.
    selectedSegmentsFromGraph: number[] = []
    selectedSegmentsFromGraphGraphics: {segments: PIXI.Sprite, centroids: PIXI.Graphics} | null

    // Variables dealing with mouse movement. Either dragging dragging or selecting.
    dragging: boolean
    selecting: boolean

    constructor(props:ImageProps) {
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

        this.minScale = 1.0

        this.dragging = false
        this.selecting = false
    }

    onCanvasDataLoaded = (data: ImageData) => this.props.onCanvasDataLoaded(data)
    addSelectedRegionToStore = (selectedRegion: number[]|null, selectedSegments: number[]) => this.props.addSelectedRegion(selectedRegion, selectedSegments)
    onExportComplete = () => this.props.onExportComplete()

    // Checks to make sure that we haven't panned past the bounds of the stage.
    checkSetStageBounds() {
        // Not able to scroll past top left corner
        if(this.stage.position.x > 0) this.stage.position.x = 0
        if(this.stage.position.y > 0) this.stage.position.y = 0

        // Calculate where the coordinates of the botttom right corner are in relation to the current window/stage size and the scale of the image.
        let minX = this.rendererWidth - (this.imageData.width * this.stage.scale.x)
        let minY = this.rendererHeight - (this.imageData.height * this.stage.scale.y)

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

    addSelect(el:HTMLDivElement){
        let selection:number[] = []
        // Graphics object storing the selected area
        let selectionGraphics: PIXI.Graphics|null = null
        // Graphics object storing the outlines of the selected segments
        let segmentOutlineGraphics: PIXI.Graphics|null = null
        // Array of the selected segment IDs
        let selectedSegments:number[] = []

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

                GraphicsHelper.cleanUpStage(this.stage, selectionGraphics, segmentOutlineGraphics)
                let toUnpack = GraphicsHelper.selectRegion(selection, this.segmentationData, DefaultSelectedRegionColor)

                selectionGraphics = toUnpack.selectionGraphics
                selectedSegments = toUnpack.selectedSegments

                if(this.segmentationData != null) segmentOutlineGraphics = this.segmentationData.segmentOutlineGraphics(DefaultSelectedRegionColor, SelectedSegmentOutlineWidth, selectedSegments)

                this.stage.addChild(selectionGraphics)
                if(segmentOutlineGraphics != null){
                    segmentOutlineGraphics.alpha = SelectedSegmentOutlineAlpha
                    this.stage.addChild(segmentOutlineGraphics)
                }

                this.renderer.render(this.rootContainer)
            }
        })

        // If the mouse is released stop selecting
        el.addEventListener('mouseup', e => {
            if(this.selecting){
                this.addSelectedRegionToStore(selection, selectedSegments)
                // Clear the temp storage now that we've stored the selection.
                selectionGraphics = null
                segmentOutlineGraphics  = null
                this.selecting = false
                selection = []
            }
        })
    }
    
    // Checks the stage scale factor and x,y position to make sure we aren't too zoomed out
    // Or haven't moved the stage outside of the renderer bounds
    checkScale(){
        this.checkSetMinScale()
        this.checkSetStageBounds()
    }

    setScaleFactors(imcData: ImageData, maxRendererSize: {width:number, height:number}){
        // Setting up the scale factor trying to maximize the width
        let scaleFactor = maxRendererSize.width / imcData.width
        let scaledHeight = imcData.height * scaleFactor
        let scaledWidth = maxRendererSize.width

        // If the scaled height is larger than the max allowable, scale to maximize the height.
        if(scaledHeight > maxRendererSize.height){
            scaleFactor = maxRendererSize.height / imcData.height
            scaledHeight = maxRendererSize.height
            scaledWidth = imcData.width * scaleFactor
        }

        // Save the results
        this.rendererWidth = scaledWidth
        this.rendererHeight = scaledHeight
        this.minScale = scaleFactor
    }

    // Resizes the WebGL Renderer and sets the new scale factors accordingly.
    // TODO: Should we update the x,y position and zoom/scale of the stage relative to the resize amount?
    // If so, use this to get started: let resizeFactor = windowWidth / this.rendererWidth
    resizeGraphics(imcData: ImageData, maxRendererSize: {width:number, height:number}){
        this.setScaleFactors(imcData, maxRendererSize)
        this.renderer.resize(this.rendererWidth, this.rendererHeight)
        this.checkScale()
    }

    resetZoom(){
        // Setting the initial scale/zoom of the stage so the image fills the stage when we start.
        this.stage.scale.x = this.minScale
        this.stage.scale.y = this.minScale
    }

    initializeGraphics(imcData: ImageData, maxRendererSize: {width:number, height:number}){
        if(this.el == null) return


        this.setScaleFactors(imcData, maxRendererSize)

        // Setting up the renderer
        this.renderer = new PIXI.WebGLRenderer(this.rendererWidth, this.rendererHeight)
        this.el.appendChild(this.renderer.view)

        // Setting up event listeners
        // TODO: Make sure these don't get added again if a new set of images is selected.
        this.addZoom(this.el)
        this.addPan(this.el)
        this.addSelect(this.el)
    }

    loadChannelGraphics(curChannel:ChannelName,
        imcData: ImageData,
        channelMarker: Record<ChannelName, string | null>,
        channelDomain: Record<ChannelName, [number, number]> ){
        
            let curMarker = channelMarker[curChannel]
            if(curMarker != null){
                let sprite = imcData.sprites[curMarker]
                let brightnessFilterCode = GraphicsHelper.generateBrightnessFilterCode(curChannel, imcData, channelMarker, channelDomain)
                let brightnessFilter = new PIXI.Filter(undefined, brightnessFilterCode, undefined)
                // Delete sprite filters so they get cleared from memory before adding new ones
                sprite.filters = [brightnessFilter, this.channelFilters[curChannel]]
                this.stage.addChild(sprite)
            }
    }

    // Add segmentation data to the stage.
    loadSegmentationGraphics(segmentationData: SegmentationData, segmentationFillAlpha:number, segmentationOutlineAlpha:number, centroidsVisible:boolean){
        if(segmentationData != this.segmentationData){
            this.segmentationData = segmentationData
            this.segmentationSprite = segmentationData.segmentSprite()
            this.segmentationOutlineGraphics = segmentationData.segmentOutlineGraphics(SegmentOutlineColor, SegmentOutlineWidth)
            this.segmentationCentroidGraphics = GraphicsHelper.drawCentroids(segmentationData.centroidMap, UnselectedCentroidColor)
        }
        // Add segmentation cells
        if(this.segmentationSprite!=null){
            this.segmentationSprite.alpha = segmentationFillAlpha
            this.stage.addChild(this.segmentationSprite)
        }

        // Add segementation outlines
        if(this.segmentationOutlineGraphics){
            this.segmentationOutlineGraphics.alpha = segmentationOutlineAlpha
            this.stage.addChild(this.segmentationOutlineGraphics)
        }

        // Add segmentation centroids
        if(this.segmentationCentroidGraphics!=null && centroidsVisible) this.stage.addChild(this.segmentationCentroidGraphics)
    }

    // Generates the graphics objects for regions or segment/cell populations selected by users.
    generateSelectedRegionGraphics(selectedRegions:Array<SelectedPopulation>){
        this.selectedRegions = selectedRegions
        this.selectedRegionGraphics = {}
        for(let region of selectedRegions) {
            if(region.visible){
                this.selectedRegionGraphics[region.id] = {region: null, outline: null}
                if(region.selectedRegion != null) this.selectedRegionGraphics[region.id].region = GraphicsHelper.drawSelectedRegion(region.selectedRegion, region.color, SelectedRegionAlpha)
                if(region.selectedSegments != null && this.segmentationData != null) {
                    this.selectedRegionGraphics[region.id].outline = this.segmentationData.segmentOutlineGraphics(region.color, SelectedSegmentOutlineWidth, region.selectedSegments)
                }
            }
        }
    }

    // Adds the graphics for regions or segment/cell populations selected by users to the stage.
    addSelectedRegionGraphicsToStage(stage: PIXI.Container, highlightedRegions: string[]){
        if(this.selectedRegionGraphics != null){
            for(let regionId in this.selectedRegionGraphics){
                let curGraphics = this.selectedRegionGraphics[regionId]
                // Set the alpha correctly for regions that need to be highlighted
                let regionAlpha = SelectedRegionAlpha
                let outlineAlpha = SelectedSegmentOutlineAlpha
                if(highlightedRegions.indexOf(regionId) > -1){
                    regionAlpha = HighlightedSelectedRegionAlpha
                    outlineAlpha = HighlightedSelectedSegmentOutlineAlpha
                }

                let regionGraphics = curGraphics.region
                if(regionGraphics != null){
                    regionGraphics.alpha = regionAlpha
                    stage.addChild(regionGraphics)
                }

                let outlineGraphics = curGraphics.outline
                if (outlineGraphics != null){
                    outlineGraphics.alpha = outlineAlpha
                    stage.addChild(outlineGraphics)
                }
            }
        }
    }

    // Add the selected ROIs to the stage. Regenerates the PIXI layers if they aren't present.
    loadSelectedRegionGraphics(selectedRegions:Array<SelectedPopulation>, highlightedRegions: string[]){
        // Regenerate the region graphics and the centroids they contain if the selectedRegions have changed
        if(selectedRegions != this.selectedRegions){
            this.generateSelectedRegionGraphics(selectedRegions)
        }
        // Add them to the stage
        this.addSelectedRegionGraphicsToStage(this.stage, highlightedRegions)
    }

    // Generates and adds segments highlighted/moused over on the graph.
    loadHighlightedSegmentGraphics(segmentationData: SegmentationData, highlightedSegments: number[]){
        if(highlightedSegments.length > 0){
            let graphics = segmentationData.segmentOutlineGraphics(HighlightedSegmentOutlineColor, SelectedSegmentOutlineWidth, highlightedSegments)
            this.stage.addChild(graphics)
        }
    }

    exportRenderer(exportPath: string){
        // Get the source canvas that we are exporting from pixi
        let sourceCanvas = this.renderer.extract.canvas()
        let sourceContext = sourceCanvas.getContext('2d')

        if(sourceContext){
            // Convert to a base64 encoded png
            let exportingImage = sourceCanvas.toDataURL('image/png')
            // Replace the header so that we just have the base64 encoded string
            let exportingData = exportingImage.replace(/^data:image\/png;base64,/, "");
            // Save the base64 encoded string to file.
            fs.writeFile(exportPath, exportingData, 'base64', function(err) {
                console.log(err)
            })
        }
    }

    renderImage(el: HTMLDivElement|null, 
        imcData: ImageData, 
        channelMarker: Record<ChannelName, string | null>,
        channelDomain: Record<ChannelName, [number, number]>, 
        segmentationData: SegmentationData | null,
        segmentationFillAlpha: number,
        segmentationOutlineAlpha: number,
        segmentationCentroidsVisible: boolean,
        selectedRegions: Array<SelectedPopulation> | null,
        highlightedRegions: string[],
        highlightedSegmentsFromGraph: number[],
        exportPath: string | null,
        maxRendererSize: {width:number, height:number})
    {
        if(el == null)
            return
        this.el = el

        if(!this.el.hasChildNodes()) {
            this.initializeGraphics(imcData, maxRendererSize)
        }

        // We want to resize graphics and reset zoom if imcData has changed
        if(this.imageData != imcData) {
            this.imageData = imcData
            this.resizeGraphics(imcData, maxRendererSize)
            this.resetZoom()
        }

        // We want to resize the graphics and set the min zoom if the windowWidth has changed
        if(this.maxRendererSize != maxRendererSize){
            this.resizeGraphics(imcData, maxRendererSize)
        }

        this.stage.removeChildren()

        // For each channel setting the brightness and color filters
        for (let s of ["rChannel", "gChannel", "bChannel"]) {
            let curChannel = s as ChannelName
            this.loadChannelGraphics(curChannel, imcData, channelMarker, channelDomain)
        }

        if(segmentationData != null){
            this.loadSegmentationGraphics(segmentationData, segmentationFillAlpha, segmentationOutlineAlpha, segmentationCentroidsVisible)
        }

        if(selectedRegions != null) {
            this.loadSelectedRegionGraphics(selectedRegions, highlightedRegions)
        }

        if(segmentationData != null){
            this.loadHighlightedSegmentGraphics(segmentationData, highlightedSegmentsFromGraph)
        }

        this.renderer.render(this.rootContainer)

        if(exportPath){
            this.exportRenderer(exportPath)
            this.onExportComplete()
        }
        
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
        let segmentationFillAlpha = this.props.segmentationFillAlpha
        let segmentationOutlineAlpha = this.props.segmentationOutlineAlpha
        let segmentationCentroidsVisible = this.props.segmentationCentroidsVisible

        let regions = this.props.selectedRegions

        let highlightedRegions = this.props.hightlightedRegions

        let highlightedSegmentsFromGraph = this.props.highlightedSegmentsFromPlot

        let exportPath = this.props.exportPath

        let maxRendererSize = this.props.maxRendererSize

        return(
            <div className="imcimage"
                    ref={(el) => {this.renderImage(el,
                                                imcData,
                                                channelMarker,
                                                channelDomain,
                                                segmentationData,
                                                segmentationFillAlpha,
                                                segmentationOutlineAlpha,
                                                segmentationCentroidsVisible,
                                                regions,
                                                highlightedRegions,
                                                highlightedSegmentsFromGraph,
                                                exportPath,
                                                maxRendererSize
                                                )
                    }}
            />
        )
    }
}