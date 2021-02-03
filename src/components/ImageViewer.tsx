import * as React from 'react'
import * as PIXI from 'pixi.js'
import * as fs from 'fs'
import * as _ from 'underscore'
import * as Mousetrap from 'mousetrap'
import { observer } from 'mobx-react'
import { SizeMe } from 'react-sizeme'
import { ImageData } from '../lib/ImageData'
import {
    ImageChannels,
    ChannelName,
    SelectedRegionAlpha,
    HighlightedSelectedRegionAlpha,
    HighlightedSegmentOutlineColor,
    SelectedSegmentOutlineAlpha,
    HighlightedSelectedSegmentOutlineAlpha,
    SelectedSegmentOutlineWidth,
    ImageViewerHeightPadding,
} from '../definitions/UIDefinitions'
import { SegmentationData } from '../lib/SegmentationData'
import * as GraphicsHelper from '../lib/GraphicsHelper'
import { randomHexColor } from '../lib/ColorHelper'
import { SelectedPopulation } from '../stores/PopulationStore'

export interface ImageProps {
    imageData: ImageData | null
    segmentationData: SegmentationData | null
    segmentationFillAlpha: number
    segmentationOutlineAlpha: number
    segmentationCentroidsVisible: boolean
    channelDomain: Record<ChannelName, [number, number]>
    channelVisibility: Record<ChannelName, boolean>
    channelMarker: Record<ChannelName, string | null>
    position: { x: number; y: number } | null
    scale: { x: number; y: number } | null
    setPositionAndScale: (position: { x: number; y: number }, scale: { x: number; y: number }) => void
    selectedRegions: SelectedPopulation[] | null
    addSelectedRegion: (pixelIndexes: number[], color: number) => void
    highlightedRegions: string[]
    highlightedSegmentsFromPlot: number[]
    exportPath: string | null
    onExportComplete: () => void
    legendVisible: boolean
    zoomInsetVisible: boolean
    windowHeight: number | null
    onWebGLContextLoss: () => void
}

@observer
export class ImageViewer extends React.Component<ImageProps, {}> {
    private el: HTMLDivElement | null = null

    private renderer: PIXI.Renderer
    private rootContainer: PIXI.Container
    private stage: PIXI.Container

    private imageData: ImageData | null

    private channelMarker: Record<ChannelName, string | null>

    // Color filters to use so that the sprites display as the desired color
    private channelFilters: Record<ChannelName, PIXI.filters.ColorMatrixFilter>

    // The actual width and height of the stage
    private rendererWidth: number
    private rendererHeight: number
    // The maximum size the stage can be set to
    private maxRendererSize: { width: number; height: number } | null

    // The minimum scale for zooming. Based on the fixed width/image width
    private minScale: number

    // Segmentation data stored locally for two reasons:
    // 1) Calculation of segments/centroids in selected regions
    // 2) If segmentation data being passed in from store are different. If they are
    // We re-render the segmentationSprite and segmentationCentroidGraphics below.
    private segmentationData: SegmentationData | null

    private legendGraphics: PIXI.Graphics
    private legendVisible: boolean

    private zoomInsetGraphics: PIXI.Graphics
    private zoomInsetVisible: boolean

    private highlightedSegmentGraphics: PIXI.Graphics

    // Variables dealing with mouse movement. Either dragging dragging or selecting.
    private panState: { active: boolean; x?: number; y?: number }

    // Variables dealing with on image selections
    private selectState: {
        active: boolean
        selection: number[]
        selectedSegments: number[]
        selectionColor: number
        minX: number | null
        maxX: number | null
        minY: number | null
        maxY: number | null
    }
    selectionGraphics: PIXI.Graphics
    selectionSegmentGraphics: PIXI.Graphics

    // If the renderer is full screened or not
    private fullScreen: boolean

    private initializePIXIGlobals(): void {
        // Need a root container to hold the stage so that we can call updateTransform on the stage.

        this.rootContainer?.destroy()
        this.rootContainer = new PIXI.Container()

        this.stage?.destroy()
        this.stage = new PIXI.Container()
        this.stage.interactive = true
        this.rootContainer.addChild(this.stage)

        const destroyOptions = { children: true, texture: true, baseTexture: true }
        this.legendGraphics?.destroy(destroyOptions)
        this.legendGraphics = new PIXI.Graphics()
        this.zoomInsetGraphics?.destroy(destroyOptions)
        this.zoomInsetGraphics = new PIXI.Graphics()

        this.highlightedSegmentGraphics?.destroy(destroyOptions)
        this.highlightedSegmentGraphics = new PIXI.Graphics()

        this.selectionGraphics?.destroy(destroyOptions)
        this.selectionGraphics = new PIXI.Graphics()
        this.selectionSegmentGraphics?.destroy(destroyOptions)
        this.selectionSegmentGraphics = new PIXI.Graphics()
    }

    public constructor(props: ImageProps) {
        super(props)

        this.initializePIXIGlobals()
        this.legendVisible = false
        this.zoomInsetVisible = true

        const redFilter = new PIXI.filters.ColorMatrixFilter()
        redFilter.matrix = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
        redFilter.blendMode = PIXI.BLEND_MODES.ADD

        const greenFilter = new PIXI.filters.ColorMatrixFilter()
        greenFilter.matrix = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
        greenFilter.blendMode = PIXI.BLEND_MODES.ADD

        const blueFilter = new PIXI.filters.ColorMatrixFilter()
        blueFilter.matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]
        blueFilter.blendMode = PIXI.BLEND_MODES.ADD

        const cyanFilter = new PIXI.filters.ColorMatrixFilter()
        cyanFilter.matrix = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]
        cyanFilter.blendMode = PIXI.BLEND_MODES.ADD

        const magentaFilter = new PIXI.filters.ColorMatrixFilter()
        magentaFilter.matrix = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]
        magentaFilter.blendMode = PIXI.BLEND_MODES.ADD

        const yellowFilter = new PIXI.filters.ColorMatrixFilter()
        yellowFilter.matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
        yellowFilter.blendMode = PIXI.BLEND_MODES.ADD

        const blackFilter = new PIXI.filters.ColorMatrixFilter()
        blackFilter.matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]
        blackFilter.blendMode = PIXI.BLEND_MODES.ADD

        this.channelFilters = {
            rChannel: redFilter,
            gChannel: greenFilter,
            bChannel: blueFilter,
            cChannel: cyanFilter,
            mChannel: magentaFilter,
            yChannel: yellowFilter,
            kChannel: blackFilter,
        }

        this.channelMarker = {
            rChannel: null,
            gChannel: null,
            bChannel: null,
            cChannel: null,
            mChannel: null,
            yChannel: null,
            kChannel: null,
        }

        this.minScale = 1.0
        this.initializeSelectState()
        this.initializePanState()
        this.fullScreen = false
    }

    private removeWebGLContextLostListener = (el: HTMLDivElement): void => {
        if (el) {
            const canvases = el.getElementsByTagName('canvas')
            if (canvases.length === 1) {
                canvases[0].removeEventListener('webglcontextlost', this.handleWebGlContextLost)
            }
        }
    }

    private clearEventListeners = (): void => {
        document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
        const el = this.el
        if (el) {
            el.removeEventListener('wheel', this.zoomHandler)
            el.removeEventListener('mousedown', this.panMouseDownHandler)
            el.removeEventListener('mousemove', this.panMouseMoveHandler)
            el.removeEventListener('mouseup', this.panMouseUpHandler)
            el.removeEventListener('mouseout', this.panMouseOutHandler)
            el.removeEventListener('mousedown', this.selectMouseDownHandler)
            el.removeEventListener('mousemove', this.selectMouseMoveHandler)
            el.removeEventListener('mouseup', this.selectMouseUpHandler)
            this.removeWebGLContextLostListener(el)
        }
    }

    public componentWillUnmount = (): void => {
        this.clearEventListeners()
    }

    private clearSelectGraphics = (): void => {
        this.selectionGraphics.clear()
        this.selectionSegmentGraphics.clear()
    }

    private initializeSelectState = (): void => {
        this.clearSelectGraphics()
        this.selectState = {
            active: false,
            selection: [],
            selectedSegments: [],
            selectionColor: 0,
            minX: null,
            maxX: null,
            minY: null,
            maxY: null,
        }
    }

    private initializePanState = (): void => {
        this.panState = { active: false }
    }

    private onExportComplete = (): void => this.props.onExportComplete()

    private addSelectedRegionToStore = (pixelIndexes: number[], color: number): void => {
        this.props.addSelectedRegion(pixelIndexes, color)
    }

    private syncPositionAndScale = (): void => {
        this.props.setPositionAndScale(
            { x: this.stage.position.x, y: this.stage.position.y },
            { x: this.stage.scale.x, y: this.stage.scale.y },
        )
    }

    // Checks to make sure that we haven't panned past the bounds of the stage.
    private checkSetStageBounds(): void {
        if (this.imageData) {
            // Calculate where the coordinates of the bottom right corner are in relation to the current window/stage size and the scale of the image.
            const minX = this.rendererWidth - this.imageData.width * this.stage.scale.x
            const minY = this.rendererHeight - this.imageData.height * this.stage.scale.y

            // Not able to scroll past the bottom right corner
            if (this.stage.position.x < minX) this.stage.position.x = minX
            if (this.stage.position.y < minY) this.stage.position.y = minY

            // Not able to scroll past top left corner
            // Do this check second, because sometimes when we're fully zoomed out we're actually past
            // the bottom right corner
            if (this.stage.position.x > 0) this.stage.position.x = 0
            if (this.stage.position.y > 0) this.stage.position.y = 0
        }
    }

    private checkSetMinScale(): boolean {
        if (this.stage.scale.x < this.minScale && this.stage.scale.y < this.minScale) {
            //Cant zoom out out past the minScale (where the stage fills the renderer)
            this.stage.scale.x = this.minScale
            this.stage.scale.y = this.minScale
            return true
        }
        return false
    }

    // Checks if an x y coordinate is within the image bounds
    private positionInBounds(position: { x: number; y: number }): boolean {
        if (this.imageData) {
            const maxX = this.imageData.width
            const maxY = this.imageData.height
            if (position.x < 0 || position.y < 0 || position.x > maxX || position.y > maxY) return false
            return true
        }
        return false
    }

    private zoom(isZoomIn: boolean): void {
        const beforeTransform = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
        // Only zoom if the user is zooming on the image
        if (this.positionInBounds(beforeTransform)) {
            const direction = isZoomIn ? 1 : -1
            const factor = 1 + direction * 0.05
            this.stage.scale.x *= factor
            this.stage.scale.y *= factor

            const atMinScale = this.checkSetMinScale()

            //If we are actually zooming in/out then move the x/y position so the zoom is centered on the mouse
            if (!atMinScale) {
                this.stage.updateTransform()
                const afterTransform = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)

                this.stage.position.x += (afterTransform.x - beforeTransform.x) * this.stage.scale.x
                this.stage.position.y += (afterTransform.y - beforeTransform.y) * this.stage.scale.y
            }
            this.checkSetStageBounds()
            this.stage.updateTransform()
            this.resizeStaticGraphics(this.legendGraphics)
            this.loadZoomInsetGraphics()
            this.renderer.render(this.rootContainer)
        }
    }

    private zoomHandler = (e: WheelEvent): void => {
        e.stopPropagation()
        e.preventDefault()
        this.zoom(e.deltaY < 0)
        // When the user is done scrolling, update the scale and position with the store.
        _.debounce((): void => {
            this.syncPositionAndScale()
        }, 200)()
    }

    private addZoom(el: HTMLDivElement): void {
        el.addEventListener('wheel', this.zoomHandler)
    }

    // On mousedown set dragging to true and save the mouse position where we started dragging
    private panMouseDownHandler = (): void => {
        const altPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.altKey
        const metaPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.metaKey
        if (!(altPressed | metaPressed)) {
            const pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
            if (this.positionInBounds(pos)) {
                this.panState.active = true
                this.panState.x = pos.x
                this.panState.y = pos.y
            }
        }
    }

    // If the mouse moves and we are dragging, adjust the position of the stage and re-render.
    private panMouseMoveHandler = (): void => {
        if (this.panState.active) {
            const pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
            if (this.positionInBounds(pos) && this.panState.x && this.panState.y) {
                const dx = (pos.x - this.panState.x) * this.stage.scale.x
                const dy = (pos.y - this.panState.y) * this.stage.scale.y
                this.stage.position.x += dx
                this.stage.position.y += dy
                this.checkSetStageBounds()
                this.stage.updateTransform()
                // Moves the legend and zoom inset
                this.resizeStaticGraphics(this.legendGraphics)
                this.loadZoomInsetGraphics()
                // Re-render!
                this.renderer.render(this.rootContainer)
            } else {
                // If the user mouses off of the image, treat this as a mouseout.
                this.panMouseOutHandler()
            }
        }
    }

    // If the mouse is released stop dragging
    private panMouseUpHandler = (): void => {
        if (this.panState.active) {
            this.panState.active = false
            // When the user is done scrolling, update the position and scale
            this.syncPositionAndScale()
        }
    }

    // If the mouse exits the PIXI element stop dragging
    private panMouseOutHandler = (): void => {
        if (this.panState.active) {
            this.panState.active = false
            this.syncPositionAndScale()
        }
    }

    private addPan(el: HTMLDivElement): void {
        el.addEventListener('mousedown', this.panMouseDownHandler)
        el.addEventListener('mousemove', this.panMouseMoveHandler)
        el.addEventListener('mouseup', this.panMouseUpHandler)
        el.addEventListener('mouseout', this.panMouseOutHandler)
    }

    private addPositionToSelection(state: {
        selection: number[]
        minX: number | null
        maxX: number | null
        minY: number | null
        maxY: number | null
    }): void {
        if (this.imageData) {
            const position = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
            // Round here so that we don't have issues using the min and max values in RGBAtoPixelIndexes
            let xPosition = Math.round(position.x)
            let yPosition = Math.round(position.y)

            // If the user is trying to select outside of the top or left edges, stop them
            if (xPosition < 0) xPosition = 0
            if (yPosition < 0) yPosition = 0

            const maxX = this.imageData.width
            const maxY = this.imageData.height

            // If the user is trying to select outside of the bottom or right edges, stop them
            if (xPosition > maxX) xPosition = maxX
            if (yPosition > maxY) yPosition = maxY

            if (state.minX == null || state.minX > xPosition) state.minX = xPosition
            if (state.maxX == null || state.maxX < xPosition) state.maxX = xPosition
            if (state.minY == null || state.minY > yPosition) state.minY = yPosition
            if (state.maxY == null || state.maxY < yPosition) state.maxY = yPosition

            state.selection.push(xPosition)
            state.selection.push(yPosition)
        }
    }

    // On mousedown, if alt is pressed set selecting to true and start adding positions to the selection
    private selectMouseDownHandler = (): void => {
        const state = this.selectState
        const altPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.altKey
        const metaPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.metaKey
        if (altPressed || metaPressed) {
            state.active = true
            state.selectionColor = randomHexColor()
            this.addPositionToSelection(state)
        }
    }

    // If the mouse moves and we are selecting, add the position to the selection and start drawing the
    // selected region and the highlighted segments
    private selectMouseMoveHandler = (): void => {
        const state = this.selectState

        if (state.active) {
            const stage = this.stage
            const selectionGraphics = this.selectionGraphics
            const selectionSegmentGraphics = this.selectionSegmentGraphics
            this.addPositionToSelection(state)

            stage.removeChild(selectionGraphics, selectionSegmentGraphics)

            GraphicsHelper.drawSelectedRegion(
                selectionGraphics,
                state.selection,
                state.selectionColor,
                SelectedRegionAlpha,
            )

            this.resizeStaticGraphics(selectionGraphics)
            selectionGraphics.updateTransform()

            state.selectedSegments = GraphicsHelper.findSegmentsInSelection(selectionGraphics, this.segmentationData)

            selectionGraphics.setTransform(0, 0, 1, 1)

            if (this.segmentationData != null) {
                this.segmentationData.generateOutlineGraphics(
                    selectionSegmentGraphics,
                    state.selectionColor,
                    SelectedSegmentOutlineWidth,
                    state.selectedSegments,
                )
                // Not correctly setting the alpha for some reason.
                selectionSegmentGraphics.alpha = SelectedSegmentOutlineAlpha
            }

            this.stage.addChild(selectionGraphics, selectionSegmentGraphics)

            // Re-draw the legend and zoom inset graphics in case the user is selecting a region under the legend or zoom inset
            // Otherwise the region and segments render over the legend and zoom inset
            this.loadLegendGraphics()
            this.loadZoomInsetGraphics()

            this.renderer.render(this.rootContainer)
        }
    }

    private getSelectionPixelIndexes = (): number[] => {
        const state = this.selectState
        let pixelIndexes: number[] = []
        if (this.imageData && state.minX && state.maxX && state.minY && state.maxY) {
            // Keep track of the starting X and Y positions and X and Y scale to reset at the end
            const initialXPosition = this.stage.position.x
            const initialYPosition = this.stage.position.y
            const initialXScale = this.stage.scale.x
            const initialYScale = this.stage.scale.y

            // Reset the stage X and Y position
            this.stage.position.x = 0
            this.stage.position.y = 0

            // Zoom out the renderer and resize to be the same size as the image width and height
            this.resizeRendererForExport(this.imageData.width, this.imageData.height, 1, 1)

            // Clear all children, add back the current selection, and then re-render so we can export
            this.stage.removeChildren()
            this.stage.addChild(this.selectionGraphics)
            this.renderer.render(this.rootContainer)

            // Get the pixels for the current selection in RGBA format and convert to pixel locations
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            const rawPixels = this.renderer.extract.pixels()
            pixelIndexes = GraphicsHelper.RGBAtoPixelIndexes(
                rawPixels,
                this.imageData.width,
                this.imageData.height,
                state.minX,
                state.maxX,
                state.minY,
                state.maxY,
            )

            // Reset and resize the renderer to the original settings
            this.stage.position.x = initialXPosition
            this.stage.position.y = initialYPosition
            this.resizeRendererForExport(this.rendererWidth, this.rendererHeight, initialXScale, initialYScale)
        }
        return pixelIndexes
    }

    // If the mouse is released stop selecting
    private selectMouseUpHandler = (): void => {
        const state = this.selectState
        if (state.active) {
            const pixelsIndexes = this.getSelectionPixelIndexes()
            this.addSelectedRegionToStore(pixelsIndexes, state.selectionColor)
            // Clear the temp storage now that we've stored the selection.
            this.initializeSelectState()
        }
    }

    private addSelect(el: HTMLDivElement): void {
        el.addEventListener('mousedown', this.selectMouseDownHandler)
        el.addEventListener('mousemove', this.selectMouseMoveHandler)
        el.addEventListener('mouseup', this.selectMouseUpHandler)
    }

    // Checks the stage scale factor and x,y position to make sure we aren't too zoomed out
    // Or haven't moved the stage outside of the renderer bounds
    private checkScale(): void {
        this.checkSetMinScale()
        this.checkSetStageBounds()
    }

    private setScaleFactors(
        imcData: ImageData | null,
        maxRendererSize: { width: number | null; height: number | null },
    ): void {
        if (imcData && maxRendererSize.width != null && maxRendererSize.height != null) {
            this.rendererWidth = maxRendererSize.width
            this.rendererHeight = maxRendererSize.height
            // Scale the scale (i.e. zoom) to be the same for the new renderer size
            const newMinScale = Math.min(maxRendererSize.width / imcData.width, maxRendererSize.height / imcData.height)
            const scaleRatio = newMinScale / this.minScale
            this.stage.scale.x *= scaleRatio
            this.stage.scale.y *= scaleRatio
            this.minScale = newMinScale
        }
    }

    // Resizes the WebGL Renderer and sets the new scale factors accordingly.
    // TODO: Should we update the x,y position and zoom/scale of the stage relative to the resize amount?
    // If so, use this to get started: let resizeFactor = windowWidth / this.rendererWidth
    private resizeGraphics(maxRendererSize: { width: number | null; height: number | null }): void {
        const imcData = this.imageData
        if (maxRendererSize.width && maxRendererSize.height)
            this.maxRendererSize = { width: maxRendererSize.width, height: maxRendererSize.height }
        this.setScaleFactors(imcData, maxRendererSize)
        this.renderer.resize(this.rendererWidth, this.rendererHeight)
        this.checkScale()
    }

    private resetZoom(): void {
        // Setting the initial scale/zoom of the stage so the image fills the stage when we start.
        this.stage.scale.x = this.minScale
        this.stage.scale.y = this.minScale
    }

    // Handles a change to and from fullscreen
    private handleFullscreenChange = (): void => {
        if (document.fullscreenElement) {
            this.fullScreen = true
        } else {
            this.fullScreen = false
        }
    }

    // Adds fullscreen shortcut and event listeners
    private addFullscreen(el: HTMLDivElement): void {
        Mousetrap.bind(['command+f', 'alt+f'], () => {
            const rendererParent = el.parentElement
            if (rendererParent) rendererParent.requestFullscreen()
        })

        document.addEventListener('fullscreenchange', this.handleFullscreenChange)
    }

    private handleWebGlContextLost = (): void => {
        this.clearEventListeners()
        const el = this.el
        if (el) {
            while (el.firstChild) {
                el.removeChild(el.firstChild)
            }
        }
        this.initializePIXIGlobals()
        this.props.onWebGLContextLoss()
    }

    private addWebGLContextLostListener(el: HTMLDivElement): void {
        if (el) {
            const canvases = el.getElementsByTagName('canvas')
            if (canvases.length === 1) {
                const canvas = canvases[0]

                // Development shortcut to simulate the canvas losing WebGL2 context.
                // TODO: Probably want to disable in production builds at some point.
                Mousetrap.bind(['command+w', 'alt+w'], () => {
                    const webgl2Context = canvas.getContext('webgl2', {})
                    if (webgl2Context) {
                        console.log(`Simulating WebGL Context loss.`)
                        webgl2Context.getExtension('WEBGL_lose_context')?.loseContext()
                    }
                })

                canvas.addEventListener('webglcontextlost', this.handleWebGlContextLost)
            }
        }
    }

    private initializeGraphics(
        imcData: ImageData | null,
        maxRendererSize: { width: number | null; height: number | null },
    ): void {
        if (this.el == null) return

        this.setScaleFactors(imcData, maxRendererSize)

        // Setting up the renderer
        this.renderer = new PIXI.Renderer({
            width: this.rendererWidth,
            height: this.rendererHeight,
            transparent: true,
        })
        this.renderer.reset()
        this.el.appendChild(this.renderer.view)

        // Setting up event listeners
        this.addZoom(this.el)
        this.addPan(this.el)
        this.addSelect(this.el)
        this.addFullscreen(this.el)
        this.addWebGLContextLostListener(this.el)
    }

    private loadChannelGraphics(curChannel: ChannelName, channelDomain: Record<ChannelName, [number, number]>): void {
        const imcData = this.imageData
        if (imcData) {
            const channelMarker = this.channelMarker
            const filterCode = GraphicsHelper.generateBrightnessFilterCode()
            const curMarker = channelMarker[curChannel]
            if (curMarker != null) {
                const sprite = imcData.sprites[curMarker]
                const uniforms = GraphicsHelper.generateBrightnessFilterUniforms(
                    curChannel,
                    imcData,
                    channelMarker,
                    channelDomain,
                )
                if (sprite && uniforms) {
                    const brightnessFilter = new PIXI.Filter(undefined, filterCode, uniforms)
                    // Delete sprite filters so they get cleared from memory before adding new ones
                    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                    //@ts-ignore
                    sprite.filters = null
                    sprite.filters = [brightnessFilter, this.channelFilters[curChannel]]
                    this.stage.addChild(sprite)
                }
            }
        }
    }

    // Add segmentation data to the stage.
    private loadSegmentationGraphics(
        segmentationData: SegmentationData | null,
        segmentationFillAlpha: number,
        segmentationOutlineAlpha: number,
        centroidsVisible: boolean,
    ): void {
        if (segmentationData) {
            this.segmentationData = segmentationData
            // Add segmentation cells
            if (segmentationData.fillSprite) {
                segmentationData.fillSprite.alpha = segmentationFillAlpha
                this.stage.addChild(segmentationData.fillSprite)
            }

            // Add segmentation outlines
            if (segmentationData.outlineGraphics) {
                segmentationData.outlineGraphics.alpha = segmentationOutlineAlpha
                this.stage.addChild(segmentationData.outlineGraphics)
            }

            // Add segmentation centroids
            if (segmentationData.centroidGraphics != null && centroidsVisible)
                this.stage.addChild(segmentationData.centroidGraphics)
        }
    }

    // Adds the graphics for regions or segment/cell populations selected by users to the stage.
    private loadSelectedRegionGraphics(
        stage: PIXI.Container,
        selectedRegions: SelectedPopulation[] | null,
        highlightedRegions: string[],
    ): void {
        if (selectedRegions) {
            for (const selectedRegion of selectedRegions) {
                if (selectedRegion.visible) {
                    const regionId = selectedRegion.id
                    // Set the alpha correctly for regions that need to be highlighted
                    let regionAlpha = SelectedRegionAlpha
                    let outlineAlpha = SelectedSegmentOutlineAlpha
                    if (highlightedRegions.indexOf(regionId) > -1) {
                        regionAlpha = HighlightedSelectedRegionAlpha
                        outlineAlpha = HighlightedSelectedSegmentOutlineAlpha
                    }

                    const regionGraphics = selectedRegion.regionGraphics
                    if (regionGraphics != null) {
                        regionGraphics.alpha = regionAlpha
                        stage.addChild(regionGraphics)
                    }

                    const outlineGraphics = selectedRegion.segmentGraphics
                    if (outlineGraphics != null) {
                        outlineGraphics.alpha = outlineAlpha
                        stage.addChild(outlineGraphics)
                    }
                }
            }
        }
    }

    // Generates and adds segments highlighted/moused over on the graph.
    private loadHighlightedSegmentGraphics(highlightedSegments: number[]): void {
        this.stage.removeChild(this.highlightedSegmentGraphics)
        if (this.segmentationData && highlightedSegments.length > 0) {
            this.highlightedSegmentGraphics.clear()
            this.segmentationData.generateOutlineGraphics(
                this.highlightedSegmentGraphics,
                HighlightedSegmentOutlineColor,
                SelectedSegmentOutlineWidth,
                highlightedSegments,
            )
            this.stage.addChild(this.highlightedSegmentGraphics)
        }
    }

    private resizeStaticGraphics(graphics: PIXI.Graphics, xScaleCoefficient = 1, yScaleCoefficient = 1): void {
        this.stage.removeChild(graphics)
        const xScale = 1 / this.stage.scale.x
        const yScale = 1 / this.stage.scale.y
        graphics.setTransform(
            Math.abs(this.stage.position.x) * xScale,
            Math.abs(this.stage.position.y) * yScale,
            xScale * xScaleCoefficient,
            yScale * yScaleCoefficient,
        )
        this.stage.addChild(graphics)
    }

    private loadLegendGraphics(): void {
        const legendVisible = this.legendVisible
        const imcData = this.imageData
        if (imcData && legendVisible) {
            GraphicsHelper.drawLegend(this.legendGraphics, imcData, this.channelMarker)
            this.resizeStaticGraphics(this.legendGraphics)
        } else {
            // Clear out the legend graphics so they don't get redrawn when zooming.
            this.legendGraphics.clear()
            this.legendGraphics.removeChildren()
        }
    }

    private loadZoomInsetGraphics(scaleRatio = 1): void {
        // Adjust minScale by scaleRatio so that we don't show the zoom inset when we shouldn't
        const minScale = this.minScale * scaleRatio
        const imcData = this.imageData
        if (imcData && this.zoomInsetVisible && (this.stage.scale.x > minScale || this.stage.scale.y > minScale)) {
            // In case the image is taller than it is wide, we want to calculate how much of the renderer is visible
            // So that we can draw the zoom inset in the upper right corner of what is visible
            // Use this.render.width instead of rendererWidth for the case when we're exporting the image
            const visibleRendererWidth = Math.min(imcData.width * this.stage.scale.y, this.renderer.width)
            GraphicsHelper.drawZoomInset(
                this.zoomInsetGraphics,
                imcData.width,
                imcData.height,
                visibleRendererWidth,
                this.renderer.height,
                this.stage.width,
                this.stage.height,
                this.stage.position.x,
                this.stage.position.y,
                scaleRatio,
            )
            this.resizeStaticGraphics(this.zoomInsetGraphics)
        } else {
            this.zoomInsetGraphics.clear()
            this.zoomInsetGraphics.removeChildren()
        }
    }

    private setStagePositionAndScale(position: { x: number; y: number }, scale: { x: number; y: number }): void {
        this.stage.position.x = position.x
        this.stage.position.y = position.y
        this.stage.scale.x = scale.x
        this.stage.scale.y = scale.y
        this.stage.updateTransform()
    }

    // Resizes the renderer without resetting zoom/scale, x/y position, and resetting stage bounds.
    private resizeRendererForExport(width: number, height: number, xScale: number, yScale: number): void {
        // Adjust the position so that the same point is still centered if we're zoomed in.
        this.stage.position.x = this.stage.position.x * (width / this.rendererWidth)
        this.stage.position.y = this.stage.position.y * (height / this.rendererHeight)
        const legendXScaleCoefficient = xScale / this.stage.scale.x
        const legendYScaleCoefficient = yScale / this.stage.scale.y
        this.stage.scale.x = xScale
        this.stage.scale.y = yScale
        this.stage.updateTransform()
        this.renderer.resize(width, height)
        if (this.legendVisible)
            this.resizeStaticGraphics(this.legendGraphics, legendXScaleCoefficient, legendYScaleCoefficient)
        this.loadZoomInsetGraphics(legendXScaleCoefficient)
        this.renderer.render(this.rootContainer)
    }

    private exportRenderer(exportPath: string): void {
        if (this.imageData) {
            const initialXScale = this.stage.scale.x
            const initialYScale = this.stage.scale.y

            // The visible portion of the renderer changes as the user resizes, and is most likely
            // not proportional to the aspect ratio of the original image.
            // So we calculate the exportScale and exportWidth and exportHeight by calculating the ratio
            // of the longest dimension to its corresponding dimension on the renderer
            let exportScale = (this.imageData.width / this.rendererWidth) * initialXScale
            let exportWidth = this.imageData.width
            let exportHeight = this.rendererHeight * (this.imageData.width / this.rendererWidth)
            if (this.imageData.height > this.imageData.width) {
                exportScale = (this.imageData.height / this.rendererHeight) * initialYScale
                exportHeight = this.imageData.height
                exportWidth = this.rendererWidth * (this.imageData.height / this.rendererHeight)
            }
            // We want the export size to be the same ratio as the renderer if zoomed in, but
            // when fully zoomed out, the visible portion of the renderer has the same dimensions as the image
            // as the user zooms in the dimensions change to gradually fill the space.
            // The below calculations are to size the export appropriately depending on how zoomed in we are.
            exportWidth = Math.min(exportWidth, this.imageData.width * exportScale)
            exportHeight = Math.min(exportHeight, this.imageData.height * exportScale)

            this.resizeRendererForExport(exportWidth, exportHeight, exportScale, exportScale)

            // Get the source canvas that we are exporting from pixi
            // Need to use ts-ignore for this for some reason it expects an input
            // with the v5 ts types
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            const sourceCanvas = this.renderer.extract.canvas()

            // Return the size of the renderer to its original size
            this.resizeRendererForExport(this.rendererWidth, this.rendererHeight, initialXScale, initialYScale)

            // Save the export to a file
            const sourceContext = sourceCanvas.getContext('2d')
            if (sourceContext) {
                // Convert to a base64 encoded png
                const exportingImage = sourceCanvas.toDataURL('image/png')
                // Replace the header so that we just have the base64 encoded string
                const exportingData = exportingImage.replace(/^data:image\/png;base64,/, '')
                // Save the base64 encoded string to file.
                fs.writeFileSync(exportPath, exportingData, 'base64')
            }
            this.onExportComplete()
        }
    }

    private calculateMaxRendererSize(
        parentElementSize: { width: number | null; height: number | null },
        windowHeight: number | null,
    ): { width: number | null; height: number | null } {
        const maxRendererSize = { width: parentElementSize.width, height: parentElementSize.height }
        if (windowHeight != null && this.fullScreen) maxRendererSize.height = windowHeight
        if (windowHeight != null && !this.fullScreen) maxRendererSize.height = windowHeight - ImageViewerHeightPadding
        return maxRendererSize
    }

    private renderImage(
        el: HTMLDivElement | null,
        imcData: ImageData | null,
        position: { x: number; y: number } | null,
        scale: { x: number; y: number } | null,
        channelMarker: Record<ChannelName, string | null>,
        channelDomain: Record<ChannelName, [number, number]>,
        channelVisibility: Record<ChannelName, boolean>,
        segmentationData: SegmentationData | null,
        segmentationFillAlpha: number,
        segmentationOutlineAlpha: number,
        segmentationCentroidsVisible: boolean,
        selectedRegions: SelectedPopulation[] | null,
        highlightedRegions: string[],
        highlightedSegmentsFromGraph: number[],
        exportPath: string | null,
        legendVisible: boolean,
        zoomInsetVisible: boolean,
        parentElementSize: { width: number | null; height: number | null },
        windowHeight: number | null,
    ): void {
        if (el == null) return
        this.el = el

        const maxRendererSize = this.calculateMaxRendererSize(parentElementSize, windowHeight)

        if (!this.el.hasChildNodes()) {
            this.initializeGraphics(imcData, maxRendererSize)
        }

        // We want to resize graphics and reset zoom if imcData has changed
        if (this.imageData != imcData) {
            this.imageData = imcData
            this.resizeGraphics(maxRendererSize)
            this.resetZoom()
        }

        // Reload saved position and scale
        if (position && scale) this.setStagePositionAndScale(position, scale)

        // We want to resize the graphics and set the min zoom if the windowWidth has changed
        if (
            !this.maxRendererSize ||
            this.maxRendererSize.width != maxRendererSize.width ||
            this.maxRendererSize.height != maxRendererSize.height
        ) {
            this.resizeGraphics(maxRendererSize)
        }

        // Clear the stage in preparation for rendering.
        this.stage.removeChildren()

        this.channelMarker = channelMarker
        // For each channel setting the brightness and color filters
        for (const s of ImageChannels) {
            const curChannel = s as ChannelName
            if (channelVisibility[s]) this.loadChannelGraphics(curChannel, channelDomain)
        }

        //Load segmentation graphics
        this.loadSegmentationGraphics(
            segmentationData,
            segmentationFillAlpha,
            segmentationOutlineAlpha,
            segmentationCentroidsVisible,
        )

        // Load selected region graphics
        this.loadSelectedRegionGraphics(this.stage, selectedRegions, highlightedRegions)

        // Load graphics for any highlighted
        this.loadHighlightedSegmentGraphics(highlightedSegmentsFromGraph)

        // Create the legend for which markers are being displayed
        this.legendVisible = legendVisible
        this.loadLegendGraphics()
        // Update whether or not the zoom inset is visible and then re-render it
        this.zoomInsetVisible = zoomInsetVisible
        this.loadZoomInsetGraphics()

        // Render everything
        this.renderer.render(this.rootContainer)

        // Export the renderer if exportPath is set
        if (exportPath) {
            this.exportRenderer(exportPath)
        }
    }

    public render(): React.ReactNode {
        //Dereferencing these here is necessary for MobX to trigger, because
        //render is the only tracked function (i.e. this will not trigger if
        //the variables are dereferenced inside renderImage)
        const channelMarker = {
            rChannel: this.props.channelMarker.rChannel,
            gChannel: this.props.channelMarker.gChannel,
            bChannel: this.props.channelMarker.bChannel,
            cChannel: this.props.channelMarker.cChannel,
            mChannel: this.props.channelMarker.mChannel,
            yChannel: this.props.channelMarker.yChannel,
            kChannel: this.props.channelMarker.kChannel,
        }

        const channelDomain = {
            rChannel: this.props.channelDomain.rChannel,
            gChannel: this.props.channelDomain.gChannel,
            bChannel: this.props.channelDomain.bChannel,
            cChannel: this.props.channelDomain.cChannel,
            mChannel: this.props.channelDomain.mChannel,
            yChannel: this.props.channelDomain.yChannel,
            kChannel: this.props.channelDomain.kChannel,
        }

        const channelVisibility = {
            rChannel: this.props.channelVisibility.rChannel,
            gChannel: this.props.channelVisibility.gChannel,
            bChannel: this.props.channelVisibility.bChannel,
            cChannel: this.props.channelVisibility.cChannel,
            mChannel: this.props.channelVisibility.mChannel,
            yChannel: this.props.channelVisibility.yChannel,
            kChannel: this.props.channelVisibility.kChannel,
        }

        const imcData = this.props.imageData

        let position: { x: number; y: number } | null = null
        if (this.props.position) position = { x: this.props.position.x, y: this.props.position.y }
        let scale: { x: number; y: number } | null = null
        if (this.props.scale) scale = { x: this.props.scale.x, y: this.props.scale.y }

        const segmentationData = this.props.segmentationData
        const segmentationFillAlpha = this.props.segmentationFillAlpha
        const segmentationOutlineAlpha = this.props.segmentationOutlineAlpha
        const segmentationCentroidsVisible = this.props.segmentationCentroidsVisible

        const regions = this.props.selectedRegions

        const highlightedRegions = this.props.highlightedRegions

        const highlightedSegmentsFromGraph = this.props.highlightedSegmentsFromPlot

        const exportPath = this.props.exportPath

        const legendVisible = this.props.legendVisible

        const zoomInsetVisible = this.props.zoomInsetVisible

        const windowHeight = this.props.windowHeight

        return (
            <SizeMe>
                {({ size }): React.ReactElement => (
                    <div>
                        <div
                            className="imcimage"
                            ref={(el): void => {
                                this.renderImage(
                                    el,
                                    imcData,
                                    position,
                                    scale,
                                    channelMarker,
                                    channelDomain,
                                    channelVisibility,
                                    segmentationData,
                                    segmentationFillAlpha,
                                    segmentationOutlineAlpha,
                                    segmentationCentroidsVisible,
                                    regions,
                                    highlightedRegions,
                                    highlightedSegmentsFromGraph,
                                    exportPath,
                                    legendVisible,
                                    zoomInsetVisible,
                                    size,
                                    windowHeight,
                                )
                            }}
                        />
                    </div>
                )}
            </SizeMe>
        )
    }
}
