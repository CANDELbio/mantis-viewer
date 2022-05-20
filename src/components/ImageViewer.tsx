/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as React from 'react'
import * as PIXI from 'pixi.js'
import { ColorMatrixFilter } from '@pixi/filter-color-matrix'
import * as fs from 'fs'
import _ from 'underscore'
import log from 'electron-log'
import { observer } from 'mobx-react'
import { SizeMe } from 'react-sizeme'
import { ImageData } from '../lib/ImageData'
import {
    ImageChannels,
    ChannelName,
    SelectedRegionAlpha,
    HighlightedSelectedRegionAlpha,
    ImageViewerHeightPadding,
    SegmentOutlineColor,
    PlotTransform,
} from '../definitions/UIDefinitions'
import { SegmentationData } from '../lib/SegmentationData'
import * as GraphicsHelper from '../lib/GraphicsUtils'
import { randomHexColor } from '../lib/ColorHelper'
import { SelectedPopulation } from '../stores/PopulationStore'
import { ChannelColorMapping, ChannelMarkerMapping, Coordinate } from '../interfaces/ImageInterfaces'
import { Line } from '../lib/pixi/Line'
import brightnessFilter from '../lib/brightness-filter.glsl'
import hotkeys from 'hotkeys-js'
import { SegmentOutlineAttributes } from '../stores/SegmentationStore'
import { IDestroyOptions } from 'pixi.js'

export interface ImageProps {
    imageData: ImageData | null
    segmentationData: SegmentationData | null
    segmentationFillAlpha: number
    segmentOutlineAttributes: SegmentOutlineAttributes | null
    channelDomain: Record<ChannelName, [number, number]>
    channelVisibility: Record<ChannelName, boolean>
    channelMarker: ChannelMarkerMapping
    channelColor: ChannelColorMapping
    positionAndScale: { position: Coordinate; scale: Coordinate } | null
    setPositionAndScale: (position: Coordinate, scale: Coordinate) => void
    selectedPopulations: SelectedPopulation[]
    addSelectedPopulation: (pixelIndexes: number[], color: number) => void
    highlightedPopulations: string[]
    highlightedSegments: number[]
    mousedOverSegmentsFromImage: number[]
    exportPath: string | null
    onExportComplete: () => void
    channelLegendVisible: boolean
    populationLegendVisible: boolean
    featureLegendVisible: boolean
    plotTransform: PlotTransform
    transformCoefficient: number | null
    zoomInsetVisible: boolean
    windowHeight: number | null
    onWebGLContextLoss: () => void
    setMousedOverPixel: (location: Coordinate | null) => void
    segmentFeaturesInLegend: Record<number, Record<string, number>>
    segmentPopulationsInLegend: Record<number, string[]>
    blurPixels: boolean
}

@observer
export class ImageViewer extends React.Component<ImageProps, Record<string, never>> {
    private el: HTMLDivElement | null = null

    private renderer: PIXI.Renderer
    private rootContainer: PIXI.Container
    private stage: PIXI.Container
    private backgroundGraphics: PIXI.Graphics

    private imageData: ImageData | null

    private channelMarker: Record<ChannelName, string | null>
    private channelSprite: Record<ChannelName, PIXI.Sprite | null>
    private channelVisibility: Record<ChannelName, boolean>

    // Whether or not pixels should be blurred for the channel sprites
    private blurPixels: boolean | undefined

    // Color filters to use so that the sprites display as the desired color
    private channelFilters: Record<ChannelName, ColorMatrixFilter>

    // The actual width and height of the stage
    private rendererWidth: number
    private rendererHeight: number
    // The maximum size the stage can be set to
    private maxRendererSize: { width: number; height: number } | null

    // The minimum scale for zooming. Based on the fixed width/image width
    private minScale: number

    // Segmentation data stored locally for two reasons:
    // 1) Calculation of segments/centroids in selected regions
    // 2) If segmentation data being passed in from store are different we need to
    // re-render all of the graphics associated with the segmentation data.
    private segmentationData: SegmentationData | null
    private segmentOutlineAttributes: SegmentOutlineAttributes | null
    private segmentationOutlines: Line
    private segmentationFillSprite: PIXI.Sprite | null
    private highlightedSegmentGraphics: PIXI.Graphics

    // Selected Populations stored locally for rendering the population names on the legend.
    private selectedPopulations: SelectedPopulation[]
    private selectedPopulationRegionSprites: Record<string, PIXI.Sprite>

    private legendGraphics: PIXI.Graphics
    private channelLegendVisible: boolean
    private populationLegendVisible: boolean

    private zoomInsetGraphics: PIXI.Graphics
    private zoomInsetVisible: boolean
    private featureLegendVisible: boolean
    private plotTransform: PlotTransform
    private transformCoefficient: number | null

    private mousedOverSegmentsFromImage: number[]
    private segmentFeaturesForLegend: Record<number, Record<string, number>>
    private segmentPopulationsForLegend: Record<number, string[]>

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
    private selectionGraphics: PIXI.Graphics
    private selectionSegmentOutline: Line

    private destroyOptions: IDestroyOptions = { children: true, texture: true, baseTexture: true }

    // If the renderer is full screened or not
    private fullScreen: boolean

    private clearSpriteMap(toClear: Record<string, PIXI.Sprite | null> | null): void {
        if (toClear) {
            for (const key of Object.keys(toClear)) {
                toClear[key]?.destroy(this.destroyOptions)
                delete toClear[key]
            }
        }
    }

    private initializePIXIGlobals(): void {
        // Need a root container to hold the stage so that we can call updateTransform on the stage.

        this.rootContainer?.destroy()
        this.rootContainer = new PIXI.Container()

        this.stage?.destroy()
        this.stage = new PIXI.Container()
        this.stage.interactive = true
        this.rootContainer.addChild(this.stage)

        const destroyOptions = this.destroyOptions
        this.backgroundGraphics?.destroy(destroyOptions)
        this.backgroundGraphics = new PIXI.Graphics()
        this.legendGraphics?.destroy(destroyOptions)
        this.legendGraphics = new PIXI.Graphics()
        this.zoomInsetGraphics?.destroy(destroyOptions)
        this.zoomInsetGraphics = new PIXI.Graphics()

        this.segmentationOutlines?.destroy(destroyOptions)
        this.segmentationOutlines = new Line()

        this.selectionGraphics?.destroy(destroyOptions)
        this.selectionGraphics = new PIXI.Graphics()
        this.selectionSegmentOutline?.destroy(destroyOptions)
        this.selectionSegmentOutline = new Line()
        this.highlightedSegmentGraphics?.destroy(destroyOptions)
        this.highlightedSegmentGraphics = new PIXI.Graphics()

        this.clearSpriteMap(this.selectedPopulationRegionSprites)
        if (!this.selectedPopulationRegionSprites) this.selectedPopulationRegionSprites = {}

        this.clearSpriteMap(this.channelSprite)
        if (!this.channelSprite) {
            this.channelSprite = {
                rChannel: null,
                gChannel: null,
                bChannel: null,
                cChannel: null,
                mChannel: null,
                yChannel: null,
                kChannel: null,
            }
        }

        const ticker = PIXI.Ticker.shared
        ticker.autoStart = false
        ticker.stop()
    }

    public constructor(props: ImageProps) {
        super(props)

        this.initializePIXIGlobals()
        this.channelLegendVisible = false
        this.populationLegendVisible = false
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
        this.selectedPopulations = []
        this.mousedOverSegmentsFromImage = []
        this.segmentFeaturesForLegend = {}
        this.segmentPopulationsForLegend = []
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
            el.removeEventListener('mousemove', this.mousedOverPixelMoveHandler)
            el.removeEventListener('mouseout', this.mousedOverPixelMoveOutHandler)
            this.removeWebGLContextLostListener(el)
        }
    }

    public componentWillUnmount = (): void => {
        this.clearEventListeners()
    }

    private clearSelectGraphics = (): void => {
        this.selectionGraphics.clear()
        this.selectionSegmentOutline.clear()
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

    private addSelectedPopulationToStore = (pixelIndexes: number[], color: number): void => {
        this.props.addSelectedPopulation(pixelIndexes, color)
    }

    private syncPositionAndScale = (): void => {
        if (this.imageData) {
            this.props.setPositionAndScale(
                { x: this.stage.position.x, y: this.stage.position.y },
                { x: this.stage.scale.x, y: this.stage.scale.y },
            )
        }
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
    private positionInBounds(position: Coordinate): boolean {
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
            // Make sure we're still in bounds
            this.checkSetStageBounds()
            // Sync to the store to trigger a rerender
            this.syncPositionAndScale()
        }
    }

    private zoomHandler = (e: WheelEvent): void => {
        e.stopPropagation()
        e.preventDefault()
        this.zoom(e.deltaY < 0)
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
            this.addPositionToSelection(state)

            // Remove the selected population region graphics so we can re-render them below
            // Otherwise the outlines get rendered over the populations
            if (this.selectedPopulations) {
                for (const selectedPopulation of this.selectedPopulations) {
                    const regionGraphics = this.selectedPopulationRegionSprites[selectedPopulation.id]
                    if (selectedPopulation.visible && regionGraphics != null) {
                        stage.removeChild(regionGraphics)
                    }
                }
            }
            // Remove the selection and outlines while we update them.
            stage.removeChild(selectionGraphics, this.segmentationOutlines)

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

            if (this.segmentationData != null && state.selectedSegments.length > 0) {
                const lineUpdateData: Record<number, { color: number; alpha: number }> = {}
                for (const segmentId of state.selectedSegments) {
                    const segmentLineIndex = this.segmentationData.idIndexMap[segmentId]
                    lineUpdateData[segmentLineIndex] = { color: state.selectionColor, alpha: 1 }
                }
                this.segmentationOutlines.updateDataSubset(lineUpdateData)
            }

            // Add the recolored outlines
            this.stage.addChild(this.segmentationOutlines)
            // Add back the selected population regions
            if (this.selectedPopulations) {
                for (const selectedPopulation of this.selectedPopulations) {
                    const regionGraphics = this.selectedPopulationRegionSprites[selectedPopulation.id]
                    if (selectedPopulation.visible && regionGraphics != null) {
                        regionGraphics.alpha = SelectedRegionAlpha
                        stage.addChild(regionGraphics)
                    }
                }
            }
            // Add the new selection graphics.
            this.stage.addChild(selectionGraphics)

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
            this.addSelectedPopulationToStore(pixelsIndexes, state.selectionColor)
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

    private enterFullscreen = (): void => {
        const rendererParent = this.el?.parentElement
        if (rendererParent) rendererParent.requestFullscreen()
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
    private addFullscreen(): void {
        hotkeys('command+f, alt+f', () => {
            this.enterFullscreen()
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

    private mousedOverPixelMoveHandler = (): void => {
        if (this.featureLegendVisible && !(this.panState.active || this.selectState.active)) {
            const position = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
            const xPosition = Math.round(position.x)
            const yPosition = Math.round(position.y)
            this.props.setMousedOverPixel({ x: xPosition, y: yPosition })
        }
    }

    private mousedOverPixelMoveOutHandler = (): void => {
        if (this.featureLegendVisible) this.props.setMousedOverPixel(null)
    }

    private addPixelMouseover(el: HTMLDivElement): void {
        // Need to throttle the mouse move so the renderer reacts more quickly for some reason
        el.addEventListener('mousemove', _.throttle(this.mousedOverPixelMoveHandler, 100))
        el.addEventListener('mouseout', this.mousedOverPixelMoveOutHandler)
    }

    private addWebGLContextLostListener(el: HTMLDivElement): void {
        if (el) {
            const canvases = el.getElementsByTagName('canvas')
            if (canvases.length === 1) {
                const canvas = canvases[0]

                // Development shortcut to simulate the canvas losing WebGL2 context.
                // TODO: Probably want to disable in production builds at some point.
                hotkeys('command+w, alt+w', () => {
                    const webgl2Context = canvas.getContext('webgl2', {})
                    if (webgl2Context) {
                        log.info(`Simulating WebGL Context loss.`)
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
            backgroundAlpha: 0,
        })
        this.renderer.reset()
        this.el.appendChild(this.renderer.view)

        // Setting up event listeners
        this.addPixelMouseover(this.el)
        this.addZoom(this.el)
        this.addPan(this.el)
        this.addSelect(this.el)
        this.addFullscreen()
        this.addWebGLContextLostListener(this.el)
    }

    private destroySprite(sprite: PIXI.Sprite): void {
        // @ts-ignore
        this.renderer.texture.destroyTexture(sprite.texture)
        sprite.destroy(this.destroyOptions)
    }

    private setChannelMarkerAndSprite(newChannelMarker: Record<ChannelName, string | null>): void {
        if (this.imageData) {
            for (const s in newChannelMarker) {
                const channel = s as ChannelName
                const newMarker = newChannelMarker[channel]
                const curSprite = this.channelSprite[channel]
                if (this.channelMarker[channel] != newMarker || (newMarker && !curSprite)) {
                    if (curSprite) this.destroySprite(curSprite)
                    if (newMarker) {
                        const channelBitmap = this.imageData.bitmaps[newMarker]
                        const blurPixels = this.blurPixels
                        if (channelBitmap && blurPixels != undefined) {
                            this.channelSprite[channel] = GraphicsHelper.imageBitmapToSprite(channelBitmap, blurPixels)
                        }
                    } else {
                        this.channelSprite[channel] = null
                    }
                }
            }
        }
        this.channelMarker = newChannelMarker
    }

    private loadChannelGraphics(
        curChannel: ChannelName,
        channelColor: number,
        channelDomain: Record<ChannelName, [number, number]>,
    ): void {
        const imcData = this.imageData
        if (imcData) {
            const channelMarker = this.channelMarker
            const curSprite = this.channelSprite[curChannel]
            if (curSprite) {
                const uniforms = GraphicsHelper.generateBrightnessFilterUniforms(
                    curChannel,
                    imcData,
                    channelMarker,
                    channelDomain,
                )
                if (curSprite && uniforms) {
                    const filter = new PIXI.Filter(undefined, brightnessFilter, uniforms)
                    // Delete sprite filters so they get cleared from memory before adding new ones
                    if (curSprite.filters && curSprite.filters.length > 0) curSprite.filters[0].destroy()
                    curSprite.filters = null
                    this.channelFilters[curChannel].matrix = GraphicsHelper.hexToFilterMatrix(channelColor)
                    curSprite.filters = [filter, this.channelFilters[curChannel]]
                    this.stage.addChild(curSprite)
                }
            }
        }
    }

    private setSegmentationData(segmentationData: SegmentationData | null): void {
        if (this.segmentationData != segmentationData) {
            // If segmentation data was present but is being replaced, clear the old sprite texture from the gpu.
            if (this.segmentationFillSprite) {
                this.destroySprite(this.segmentationFillSprite)
                this.segmentationFillSprite = null
            }
            this.segmentationOutlines.clear()
            if (segmentationData) {
                GraphicsHelper.drawOutlines(
                    this.segmentationOutlines,
                    segmentationData.segmentCoordinates,
                    SegmentOutlineColor,
                )
                this.segmentationFillSprite = PIXI.Sprite.from(segmentationData.fillBitmap)
            }
            this.segmentationData = segmentationData
        }
    }

    // Add segmentation data to the stage.
    private loadSegmentationGraphics(
        segmentOutlineAttributes: SegmentOutlineAttributes | null,
        segmentationFillAlpha: number,
    ): void {
        if (this.segmentationData) {
            if (this.segmentOutlineAttributes != segmentOutlineAttributes) {
                this.segmentOutlineAttributes = segmentOutlineAttributes
                if (segmentOutlineAttributes)
                    this.segmentationOutlines.updateData(
                        segmentOutlineAttributes.colors,
                        segmentOutlineAttributes.alphas,
                    )
            }
            // Add segmentation cells
            const fillSprite = this.segmentationFillSprite
            if (fillSprite) {
                fillSprite.alpha = segmentationFillAlpha
                this.stage.addChild(fillSprite)
            }

            // Add segmentation outlines
            this.stage.addChild(this.segmentationOutlines)
        }
    }

    private setSelectedPopulations(selectedPopulations: SelectedPopulation[]): void {
        if (this.selectedPopulations != selectedPopulations) {
            // We need to iterate over all of the current region sprites and new
            // populations to see which sprites need to be deleted.
            const newSelectedPopulationMap = selectedPopulations.reduce(
                (map: Record<string, SelectedPopulation>, obj: SelectedPopulation) => {
                    map[obj.id] = obj
                    return map
                },
                {},
            )
            // Iterate over the old populations and see what was deleted or updated.
            for (const currentSpriteId of Object.keys(this.selectedPopulationRegionSprites)) {
                const newPopulation = newSelectedPopulationMap[currentSpriteId]
                if (!newPopulation) {
                    // A population is present in the sprites but in the incoming populations.
                    // Delete the sprite from the sprite map if it exists
                    const oldSprite = this.selectedPopulationRegionSprites[currentSpriteId]
                    if (oldSprite) this.destroySprite(oldSprite)

                    delete this.selectedPopulationRegionSprites[currentSpriteId]
                }
            }
            this.selectedPopulations = selectedPopulations
        }
    }

    // Ideally we would be calling this from setSelectedPopulations when the selected populations change
    // But the bitmaps are undefined for a bit even after being set for a bit. Some weirdness with async.
    private updateSelectedRegionGraphics(): void {
        if (this.selectedPopulations) {
            // Iterate over the new populations and see what was added
            for (const population of this.selectedPopulations) {
                const newPopulationId = population.id
                if (!this.selectedPopulationRegionSprites[newPopulationId]) {
                    // The current population isn't present in the sprite map and needs to be created.
                    const populationBitmap = population.regionBitmap
                    if (populationBitmap)
                        this.selectedPopulationRegionSprites[newPopulationId] = PIXI.Sprite.from(populationBitmap)
                }
            }
        }
    }

    // Adds the graphics for regions or segment/cell populations selected by users to the stage.
    private loadSelectedRegionGraphics(highlightedPopulations: string[]): void {
        if (this.selectedPopulations) {
            this.updateSelectedRegionGraphics()
            for (const selectedPopulation of this.selectedPopulations) {
                if (selectedPopulation.visible) {
                    const populationId = selectedPopulation.id
                    // Set the alpha correctly for regions that need to be highlighted
                    let populationAlpha = SelectedRegionAlpha
                    if (highlightedPopulations.indexOf(populationId) > -1) {
                        populationAlpha = HighlightedSelectedRegionAlpha
                    }

                    const regionGraphics = this.selectedPopulationRegionSprites[populationId]
                    if (regionGraphics != null) {
                        regionGraphics.alpha = populationAlpha
                        regionGraphics.tint = selectedPopulation.color
                        this.stage.addChild(regionGraphics)
                    }
                }
            }
        }
    }

    private loadHighlightedSegmentGraphics(highlightedSegments: number[]): void {
        const graphics = this.highlightedSegmentGraphics
        graphics.clear()
        graphics.removeChildren()
        const imageData = this.imageData
        if (imageData) {
            for (const segmentId of highlightedSegments) {
                const centroid = this.segmentationData?.centroidMap[segmentId]
                if (imageData && centroid) {
                    GraphicsHelper.highlightCoordinate(
                        graphics,
                        centroid.x,
                        centroid.y,
                        imageData.width,
                        imageData.height,
                    )
                }
            }
        }
        this.stage.addChild(graphics)
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
        const legendVisible = this.channelLegendVisible || this.populationLegendVisible
        const imcData = this.imageData
        if (imcData && legendVisible) {
            GraphicsHelper.drawLegend(
                this.legendGraphics,
                imcData,
                this.channelLegendVisible,
                this.channelMarker,
                this.props.channelColor,
                this.channelVisibility,
                this.populationLegendVisible,
                this.selectedPopulations,
                this.featureLegendVisible,
                this.mousedOverSegmentsFromImage,
                this.plotTransform,
                this.transformCoefficient,
                this.segmentFeaturesForLegend,
                this.segmentPopulationsForLegend,
            )
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

    private setStagePositionAndScale(position: Coordinate, scale: Coordinate): void {
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
        if (this.channelLegendVisible)
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

    // This should remove the image textures off of the graphics card to keep memory free.
    private destroyImageTextures(): void {
        const imageData = this.imageData
        const channelSprite = this.channelSprite
        if (imageData) {
            for (const s in channelSprite) {
                const channel = s as ChannelName
                const sprite = channelSprite[channel]
                if (sprite) this.destroySprite(sprite)
                channelSprite[channel] = null
            }
        }
    }

    private renderImage(
        el: HTMLDivElement | null,
        imcData: ImageData | null,
        position: Coordinate | null,
        scale: Coordinate | null,
        channelMarker: ChannelMarkerMapping,
        channelColor: ChannelColorMapping,
        channelDomain: Record<ChannelName, [number, number]>,
        channelVisibility: Record<ChannelName, boolean>,
        segmentationData: SegmentationData | null,
        segmentOutlineAttributes: SegmentOutlineAttributes | null,
        segmentationFillAlpha: number,
        selectedPopulations: SelectedPopulation[],
        highlightedPopulations: string[],
        highlightedSegments: number[],
        mousedOverSegmentsFromImage: number[],
        segmentFeaturesForLegend: Record<number, Record<string, number>>,
        segmentPopulationsForLegend: Record<number, string[]>,
        exportPath: string | null,
        channelLegendVisible: boolean,
        populationLegendVisible: boolean,
        featureLegendVisible: boolean,
        plotTransform: PlotTransform,
        transformCoefficient: number | null,
        zoomInsetVisible: boolean,
        blurPixels: boolean,
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
            this.destroyImageTextures()
            this.imageData = imcData
            this.resizeGraphics(maxRendererSize)
            this.resetZoom()
            if (imcData) {
                GraphicsHelper.drawBackgroundRect(this.backgroundGraphics, imcData.width, imcData.height)
            }
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
            this.syncPositionAndScale()
        }

        // Clear the stage in preparation for rendering.
        this.stage.removeChildren()

        this.stage.addChild(this.backgroundGraphics)

        this.blurPixels = blurPixels
        this.setChannelMarkerAndSprite(channelMarker)
        this.channelVisibility = channelVisibility
        // For each channel setting the brightness and color filters
        for (const s of ImageChannels) {
            const curChannel = s as ChannelName
            if (channelVisibility[s]) this.loadChannelGraphics(curChannel, channelColor[curChannel], channelDomain)
        }

        //Load segmentation graphics
        this.setSegmentationData(segmentationData)
        this.loadSegmentationGraphics(segmentOutlineAttributes, segmentationFillAlpha)

        // Load selected region graphics
        this.setSelectedPopulations(selectedPopulations)
        this.loadSelectedRegionGraphics(highlightedPopulations)

        this.loadHighlightedSegmentGraphics(highlightedSegments)

        if (this.mousedOverSegmentsFromImage != mousedOverSegmentsFromImage) {
            this.mousedOverSegmentsFromImage = mousedOverSegmentsFromImage
        }

        if (this.segmentFeaturesForLegend != segmentFeaturesForLegend) {
            this.segmentFeaturesForLegend = segmentFeaturesForLegend
        }

        if (this.segmentPopulationsForLegend != segmentPopulationsForLegend) {
            this.segmentPopulationsForLegend = segmentPopulationsForLegend
        }
        // Create the legend for which markers are being displayed
        this.channelLegendVisible = channelLegendVisible
        this.populationLegendVisible = populationLegendVisible
        this.featureLegendVisible = featureLegendVisible
        this.plotTransform = plotTransform
        this.transformCoefficient = transformCoefficient
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

        const channelColor = {
            rChannel: this.props.channelColor.rChannel,
            gChannel: this.props.channelColor.gChannel,
            bChannel: this.props.channelColor.bChannel,
            cChannel: this.props.channelColor.cChannel,
            mChannel: this.props.channelColor.mChannel,
            yChannel: this.props.channelColor.yChannel,
            kChannel: this.props.channelColor.kChannel,
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

        let position: Coordinate | null = null
        let scale: Coordinate | null = null
        const positionAndScale = this.props.positionAndScale
        if (positionAndScale) {
            position = positionAndScale.position
            scale = positionAndScale.scale
        }

        const segmentationData = this.props.segmentationData
        const segmentationFillAlpha = this.props.segmentationFillAlpha
        const segmentOutlineAttributes = this.props.segmentOutlineAttributes

        const selectedPopulations = this.props.selectedPopulations

        const highlightedPopulations = this.props.highlightedPopulations

        const highlightedSegments = this.props.highlightedSegments

        const mousedOverSegmentsFromImage = this.props.mousedOverSegmentsFromImage
        const segmentFeaturesInLegend = this.props.segmentFeaturesInLegend
        const segmentPopulationsInLegend = this.props.segmentPopulationsInLegend
        const featureLegendVisible = this.props.featureLegendVisible

        const exportPath = this.props.exportPath

        const channelLegendVisible = this.props.channelLegendVisible
        const populationLegendVisible = this.props.populationLegendVisible
        const plotTransform = this.props.plotTransform
        const transformCoefficient = this.props.transformCoefficient

        const zoomInsetVisible = this.props.zoomInsetVisible

        const blurPixels = this.props.blurPixels

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
                                    channelColor,
                                    channelDomain,
                                    channelVisibility,
                                    segmentationData,
                                    segmentOutlineAttributes,
                                    segmentationFillAlpha,
                                    selectedPopulations,
                                    highlightedPopulations,
                                    highlightedSegments,
                                    mousedOverSegmentsFromImage,
                                    segmentFeaturesInLegend,
                                    segmentPopulationsInLegend,
                                    exportPath,
                                    channelLegendVisible,
                                    populationLegendVisible,
                                    featureLegendVisible,
                                    plotTransform,
                                    transformCoefficient,
                                    zoomInsetVisible,
                                    blurPixels,
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
