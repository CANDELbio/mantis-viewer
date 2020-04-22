import * as React from 'react'
import * as PIXI from 'pixi.js'
import * as fs from 'fs'
import * as _ from 'underscore'
import { observer } from 'mobx-react'
import { SizeMe } from 'react-sizeme'
import { ImageData } from '../lib/ImageData'
import {
    ImageChannels,
    ChannelName,
    SelectedRegionAlpha,
    HighlightedSelectedRegionAlpha,
    UnselectedCentroidColor,
    HighlightedSegmentOutlineColor,
    SelectedSegmentOutlineAlpha,
    HighlightedSelectedSegmentOutlineAlpha,
    SelectedSegmentOutlineWidth,
    SegmentOutlineColor,
    SegmentOutlineWidth,
} from '../definitions/UIDefinitions'
import { SegmentationData } from '../lib/SegmentationData'
import * as GraphicsHelper from '../lib/GraphicsHelper'
import { randomHexColor } from '../lib/ColorHelper'
import { SelectedPopulation } from '../interfaces/ImageInterfaces'

export interface ImageProps {
    imageData: ImageData
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
    addSelectedRegion: (selectedRegion: number[] | null, selectedSegments: number[], color: number) => void
    updateSelectedRegions: (selectedRegions: SelectedPopulation[]) => void
    highlightedRegions: string[]
    highlightedSegmentsFromPlot: number[]
    exportPath: string | null
    onExportComplete: () => void
    legendVisible: boolean
    zoomInsetVisible: boolean
    maxHeight: number | null
}

@observer
export class ImageViewer extends React.Component<ImageProps, {}> {
    private el: HTMLDivElement | null = null

    private renderer: PIXI.WebGLRenderer
    private rootContainer: PIXI.Container
    private stage: PIXI.Container

    private imageData: ImageData

    // Color filters to use so that the sprites display as the desired color
    private channelFilters: Record<ChannelName, PIXI.filters.ColorMatrixFilter>

    // The actual width and height of the stage
    private rendererWidth: number
    private rendererHeight: number
    // The maximum size the stage can be set to
    private maxRendererSize: { width: number; height: number }

    // The minimum scale for zooming. Based on the fixed width/image width
    private minScale: number

    // Segmentation data stored locally for two reasons:
    // 1) Calculation of segments/centroids in selected regions
    // 2) If segmentation data being passed in from store are different. If they are
    // We re-render the segmentationSprite and segmentationCentroidGraphics below.
    private segmentationData: SegmentationData | null
    private segmentationSprite: PIXI.Sprite | null
    private segmentationOutlineGraphics: PIXI.Graphics | null
    private segmentationCentroidGraphics: PIXI.Graphics | null

    private legendGraphics: PIXI.Graphics
    private legendVisible: boolean

    private zoomInsetGraphics: PIXI.Graphics
    private zoomInsetVisible: boolean

    // Selected regions stored locally so that we can compare to the selected regions being passed in from the store
    // If there is a difference, we update this object and the re-render the graphics stored in selectedRegionGraphics
    // selectedRegionGraphics is a map of regionId to Graphics
    // selectedRegionGraphics below
    private selectedRegions: SelectedPopulation[] | null
    private selectedRegionGraphics: {
        [key: string]: { region: PIXI.Graphics | null; outline: PIXI.Graphics | null }
    } | null

    // Variables dealing with mouse movement. Either dragging dragging or selecting.
    private dragging: boolean
    private selecting: boolean

    public constructor(props: ImageProps) {
        super(props)

        // Need a root container to hold the stage so that we can call updateTransform on the stage.
        this.rootContainer = new PIXI.Container()
        this.stage = new PIXI.Container()
        this.stage.interactive = true
        this.rootContainer.addChild(this.stage)

        this.legendGraphics = new PIXI.Graphics()
        this.legendVisible = false

        this.zoomInsetGraphics = new PIXI.Graphics()
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

        this.minScale = 1.0

        this.dragging = false
        this.selecting = false
    }

    private onExportComplete = (): void => this.props.onExportComplete()
    private addSelectedRegionToStore = (
        selectedRegion: number[] | null,
        selectedSegments: number[],
        color: number,
    ): void => {
        this.props.addSelectedRegion(selectedRegion, selectedSegments, color)
    }
    private updateSelectedRegionsInStore = (selectedRegions: SelectedPopulation[]): void => {
        this.props.updateSelectedRegions(selectedRegions)
    }

    private syncPositionAndScale = (): void => {
        this.props.setPositionAndScale(
            { x: this.stage.position.x, y: this.stage.position.y },
            { x: this.stage.scale.x, y: this.stage.scale.y },
        )
    }

    // Checks to make sure that we haven't panned past the bounds of the stage.
    private checkSetStageBounds(): void {
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
        const maxX = this.imageData.width
        const maxY = this.imageData.height
        if (position.x < 0 || position.y < 0 || position.x > maxX || position.y > maxY) return false
        return true
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

    private addZoom(el: HTMLDivElement): void {
        el.addEventListener('wheel', (e) => {
            e.stopPropagation()
            e.preventDefault()
            this.zoom(e.deltaY < 0)
            // When the user is done scrolling, update the scale and position with the store.
            _.debounce((): void => {
                this.syncPositionAndScale()
            }, 200)()
        })
    }

    private addPan(el: HTMLDivElement): void {
        let mouseDownX: number, mouseDownY: number

        // On mousedown set dragging to true and save the mouse position where we started dragging
        el.addEventListener('mousedown', () => {
            const altPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.altKey
            const metaPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.metaKey
            if (!(altPressed | metaPressed)) {
                const pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
                if (this.positionInBounds(pos)) {
                    this.dragging = true
                    mouseDownX = pos.x
                    mouseDownY = pos.y
                }
            }
        })

        // If the mouse moves and we are dragging, adjust the position of the stage and re-render.
        el.addEventListener('mousemove', () => {
            if (this.dragging) {
                const pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
                if (this.positionInBounds(pos)) {
                    const dx = (pos.x - mouseDownX) * this.stage.scale.x
                    const dy = (pos.y - mouseDownY) * this.stage.scale.y
                    this.stage.position.x += dx
                    this.stage.position.y += dy
                    this.checkSetStageBounds()
                    this.stage.updateTransform()
                    this.resizeStaticGraphics(this.legendGraphics)
                    this.loadZoomInsetGraphics()
                    this.renderer.render(this.rootContainer)
                } else {
                    // If the user mouses off of the image, treat this as a mouseout.
                    this.dragging = false
                    this.syncPositionAndScale()
                }
            }
        })

        // If the mouse is released stop dragging
        el.addEventListener('mouseup', () => {
            if (this.dragging) {
                this.dragging = false
                // When the user is done scrolling, update the position and scale
                this.syncPositionAndScale()
            }
        })

        // If the mouse exits the PIXI element stop dragging
        el.addEventListener('mouseout', () => {
            if (this.dragging) {
                this.dragging = false
                this.syncPositionAndScale()
            }
        })
    }

    private addPositionToSelection(selection: number[]): void {
        const position = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
        let xPosition = position.x
        let yPosition = position.y

        // If the user is trying to select outside of the top or left edges, stop them
        if (xPosition < 0) xPosition = 0
        if (yPosition < 0) yPosition = 0

        const maxX = this.imageData.width
        const maxY = this.imageData.height

        // If the user is trying to select outside of the bottom or right edges, stop them

        if (xPosition > maxX) xPosition = maxX
        if (yPosition > maxY) yPosition = maxY

        selection.push(xPosition)
        selection.push(yPosition)
    }

    private addSelect(el: HTMLDivElement): void {
        let selection: number[] = []
        // Graphics object storing the selected area
        let selectionGraphics: PIXI.Graphics | null = null
        // Graphics object storing the outlines of the selected segments
        let segmentOutlineGraphics: PIXI.Graphics | null = null
        // Array of the selected segment IDs
        let selectedSegments: number[] = []
        let selectionColor = 0

        // On mousedown, if alt is pressed set selecting to true and save the mouse position where we started selecting
        el.addEventListener('mousedown', () => {
            const altPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.altKey
            const metaPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.metaKey
            if (altPressed || metaPressed) {
                this.selecting = true
                selectionColor = randomHexColor()
                this.addPositionToSelection(selection)
            }
        })

        // If the mouse moves and we are dragging, adjust the position of the stage and re-render.
        el.addEventListener('mousemove', () => {
            if (this.selecting) {
                this.addPositionToSelection(selection)

                GraphicsHelper.cleanUpStage(this.stage, selectionGraphics, segmentOutlineGraphics)

                selectionGraphics = GraphicsHelper.drawSelectedRegion(selection, selectionColor, SelectedRegionAlpha)
                selectedSegments = GraphicsHelper.findSegmentsInSelection(selectionGraphics, this.segmentationData)
                this.stage.addChild(selectionGraphics)

                if (this.segmentationData != null) {
                    segmentOutlineGraphics = this.segmentationData.segmentOutlineGraphics(
                        selectionColor,
                        SelectedSegmentOutlineWidth,
                        selectedSegments,
                    )
                    segmentOutlineGraphics.alpha = SelectedSegmentOutlineAlpha
                    this.stage.addChild(segmentOutlineGraphics)
                }

                this.renderer.render(this.rootContainer)
            }
        })

        // If the mouse is released stop selecting
        el.addEventListener('mouseup', () => {
            if (this.selecting) {
                this.addSelectedRegionToStore(selection, selectedSegments, selectionColor)
                // Clear the temp storage now that we've stored the selection.
                selectionGraphics = null
                segmentOutlineGraphics = null
                this.selecting = false
                selection = []
                selectionColor = 0
            }
        })
    }

    // Checks the stage scale factor and x,y position to make sure we aren't too zoomed out
    // Or haven't moved the stage outside of the renderer bounds
    private checkScale(): void {
        this.checkSetMinScale()
        this.checkSetStageBounds()
    }

    private setScaleFactors(
        imcData: ImageData,
        maxRendererSize: { width: number | null; height: number | null },
    ): void {
        if (maxRendererSize.width != null && maxRendererSize.height != null) {
            // The renderer is created as a square, so we will set the width and height
            // to the min of the max width and max height
            const renderWidthHeight = Math.min(maxRendererSize.width, maxRendererSize.height)

            const maxImcDimension = Math.max(imcData.width, imcData.height)

            this.rendererWidth = renderWidthHeight
            this.rendererHeight = renderWidthHeight
            this.minScale = renderWidthHeight / maxImcDimension
        }
    }

    // Resizes the WebGL Renderer and sets the new scale factors accordingly.
    // TODO: Should we update the x,y position and zoom/scale of the stage relative to the resize amount?
    // If so, use this to get started: let resizeFactor = windowWidth / this.rendererWidth
    private resizeGraphics(imcData: ImageData, maxRendererSize: { width: number | null; height: number | null }): void {
        this.setScaleFactors(imcData, maxRendererSize)
        this.renderer.resize(this.rendererWidth, this.rendererHeight)
        this.checkScale()
    }

    private resetZoom(): void {
        // Setting the initial scale/zoom of the stage so the image fills the stage when we start.
        this.stage.scale.x = this.minScale
        this.stage.scale.y = this.minScale
    }

    private initializeGraphics(
        imcData: ImageData,
        maxRendererSize: { width: number | null; height: number | null },
    ): void {
        if (this.el == null) return

        this.setScaleFactors(imcData, maxRendererSize)

        // Setting up the renderer
        this.renderer = new PIXI.WebGLRenderer(this.rendererWidth, this.rendererHeight, { transparent: true })
        this.el.appendChild(this.renderer.view)

        // Setting up event listeners
        // TODO: Make sure these don't get added again if a new set of images is selected.
        this.addZoom(this.el)
        this.addPan(this.el)
        this.addSelect(this.el)
    }

    private loadChannelGraphics(
        curChannel: ChannelName,
        imcData: ImageData,
        channelMarker: Record<ChannelName, string | null>,
        channelDomain: Record<ChannelName, [number, number]>,
    ): void {
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
                sprite.filters = [brightnessFilter, this.channelFilters[curChannel]]
                this.stage.addChild(sprite)
            }
        }
    }

    private refreshSegmentationGraphicsIfChanged(segmentationData: SegmentationData | null): boolean {
        const segmentationDataChanged = segmentationData != this.segmentationData
        if (segmentationDataChanged && segmentationData) {
            // If the segmentation data has changed and segmentation data is not null then refresh the sprites and graphics
            this.segmentationData = segmentationData
            this.segmentationSprite = segmentationData.segmentFillSprite
            this.segmentationOutlineGraphics = segmentationData.segmentOutlineGraphics(
                SegmentOutlineColor,
                SegmentOutlineWidth,
            )
            this.segmentationCentroidGraphics = GraphicsHelper.drawCentroids(
                segmentationData.centroidMap,
                UnselectedCentroidColor,
            )
        } else if (segmentationDataChanged && segmentationData == null) {
            // If the segmentation data has changed and has been cleared, then clear the sprites and graphics
            this.segmentationData = segmentationData
            this.segmentationSprite = null
            this.segmentationOutlineGraphics = null
            this.segmentationCentroidGraphics = null
        }
        return segmentationDataChanged
    }

    // Add segmentation data to the stage.
    private loadSegmentationGraphics(
        segmentationFillAlpha: number,
        segmentationOutlineAlpha: number,
        centroidsVisible: boolean,
    ): void {
        // Add segmentation cells
        if (this.segmentationSprite != null) {
            this.segmentationSprite.alpha = segmentationFillAlpha
            this.stage.addChild(this.segmentationSprite)
        }

        // Add segmentation outlines
        if (this.segmentationOutlineGraphics) {
            this.segmentationOutlineGraphics.alpha = segmentationOutlineAlpha
            this.stage.addChild(this.segmentationOutlineGraphics)
        }

        // Add segmentation centroids
        if (this.segmentationCentroidGraphics != null && centroidsVisible)
            this.stage.addChild(this.segmentationCentroidGraphics)
    }

    // Generates the graphics objects for regions or segment/cell populations selected by users.
    private refreshSelectedRegionGraphicsIfChanged(
        segmentationDataChanged: boolean,
        selectedRegions: SelectedPopulation[] | null,
    ): void {
        if (selectedRegions != this.selectedRegions || segmentationDataChanged) {
            this.selectedRegions = selectedRegions
            this.selectedRegionGraphics = {}
            if (selectedRegions != null) {
                for (const region of selectedRegions) {
                    if (region.visible) {
                        let regionGraphics: PIXI.Graphics | null = null
                        let outlineGraphics: PIXI.Graphics | null = null
                        // Refresh the selected region graphics
                        if (region.selectedRegion != null)
                            regionGraphics = GraphicsHelper.drawSelectedRegion(
                                region.selectedRegion,
                                region.color,
                                SelectedRegionAlpha,
                            )
                        // Refresh the selected segments for the region if segmentation data has changed
                        if (regionGraphics != null && segmentationDataChanged) {
                            region.selectedSegments = GraphicsHelper.findSegmentsInSelection(
                                regionGraphics,
                                this.segmentationData,
                            )
                        }
                        // Refresh the segment outline graphics
                        if (region.selectedSegments != null && this.segmentationData != null) {
                            outlineGraphics = this.segmentationData.segmentOutlineGraphics(
                                region.color,
                                SelectedSegmentOutlineWidth,
                                region.selectedSegments,
                            )
                        }
                        this.selectedRegionGraphics[region.id] = { region: regionGraphics, outline: outlineGraphics }
                    }
                }
                this.updateSelectedRegionsInStore(selectedRegions)
            }
        }
    }

    // Adds the graphics for regions or segment/cell populations selected by users to the stage.
    private loadSelectedRegionGraphics(stage: PIXI.Container, highlightedRegions: string[]): void {
        if (this.selectedRegionGraphics != null) {
            for (const regionId in this.selectedRegionGraphics) {
                const curGraphics = this.selectedRegionGraphics[regionId]
                // Set the alpha correctly for regions that need to be highlighted
                let regionAlpha = SelectedRegionAlpha
                let outlineAlpha = SelectedSegmentOutlineAlpha
                if (highlightedRegions.indexOf(regionId) > -1) {
                    regionAlpha = HighlightedSelectedRegionAlpha
                    outlineAlpha = HighlightedSelectedSegmentOutlineAlpha
                }

                const regionGraphics = curGraphics.region
                if (regionGraphics != null) {
                    regionGraphics.alpha = regionAlpha
                    stage.addChild(regionGraphics)
                }

                const outlineGraphics = curGraphics.outline
                if (outlineGraphics != null) {
                    outlineGraphics.alpha = outlineAlpha
                    stage.addChild(outlineGraphics)
                }
            }
        }
    }

    // Generates and adds segments highlighted/moused over on the graph.
    private loadHighlightedSegmentGraphics(segmentationData: SegmentationData, highlightedSegments: number[]): void {
        if (highlightedSegments.length > 0) {
            const graphics = segmentationData.segmentOutlineGraphics(
                HighlightedSegmentOutlineColor,
                SelectedSegmentOutlineWidth,
                highlightedSegments,
            )
            this.stage.addChild(graphics)
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

    private loadLegendGraphics(
        legendVisible: boolean,
        imcData: ImageData,
        channelMarker: Record<ChannelName, string | null>,
    ): void {
        this.legendVisible = legendVisible
        if (legendVisible) {
            GraphicsHelper.drawLegend(this.legendGraphics, imcData, channelMarker)
            this.resizeStaticGraphics(this.legendGraphics)
        } else {
            // Clear out the legend graphics so they don't get redrawn when zooming.
            this.legendGraphics.clear()
            this.legendGraphics.removeChildren()
        }
    }

    private loadZoomInsetGraphics(): void {
        if (this.zoomInsetVisible && (this.stage.scale.x > this.minScale || this.stage.scale.y > this.minScale)) {
            // In case the image is taller than it is wide, we want to caculate how much of the renderer is visible
            // So that we can draw the zoom inset in the upper right corner of what is visible
            const visibleRendererWidth = Math.min(this.imageData.width * this.stage.scale.y, this.rendererWidth)
            GraphicsHelper.drawZoomInset(
                this.zoomInsetGraphics,
                this.imageData.width,
                this.imageData.height,
                visibleRendererWidth,
                this.renderer.height,
                this.stage.width,
                this.stage.height,
                this.stage.position.x,
                this.stage.position.y,
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
        this.resizeStaticGraphics(this.zoomInsetGraphics, legendXScaleCoefficient, legendYScaleCoefficient)
        this.renderer.render(this.rootContainer)
    }

    private exportRenderer(exportPath: string): void {
        const initialXScale = this.stage.scale.x
        const initialYScale = this.stage.scale.y

        // The renderer is fixed as a square, but the image is probably not a square
        // So we calculate the exportScale by calculating the ratio of the longest dimension
        // to the width or height of the renderer.
        let exportScale = (this.imageData.width / this.rendererWidth) * initialXScale
        if (this.imageData.height > this.imageData.width) {
            exportScale = (this.imageData.height / this.rendererHeight) * initialYScale
        }

        // We want the export size to be the same ratio as the renderer.
        // When fully zoomed out, the visible portion of the renderer has the same dimensions as the image
        // But when zoomed in it becomes a square. The below calculations are to size the export appropriately
        // depending on how zoomed in we are.
        // TODO: Should this be smaller if the user is zoomed in? Or configurable
        const maxImageDimension = Math.max(this.imageData.width, this.imageData.height)
        const exportWidth = Math.min(maxImageDimension, this.imageData.width * exportScale)
        const exportHeight = Math.min(maxImageDimension, this.imageData.height * exportScale)

        this.resizeRendererForExport(exportWidth, exportHeight, exportScale, exportScale)

        // Get the source canvas that we are exporting from pixi
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
    }

    private calculateMaxRendererSize(
        parentElementSize: { width: number | null; height: number | null },
        maxHeight: number | null,
    ): { width: number | null; height: number | null } {
        const maxRendererSize = parentElementSize
        if (maxHeight != null) maxRendererSize.height = maxHeight
        return maxRendererSize
    }

    private renderImage(
        el: HTMLDivElement | null,
        imcData: ImageData,
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
        maxHeight: number | null,
    ): void {
        if (el == null) return
        this.el = el

        const maxRendererSize = this.calculateMaxRendererSize(parentElementSize, maxHeight)

        if (!this.el.hasChildNodes()) {
            this.initializeGraphics(imcData, maxRendererSize)
        }

        // We want to resize graphics and reset zoom if imcData has changed
        if (this.imageData != imcData) {
            this.imageData = imcData
            this.resizeGraphics(imcData, maxRendererSize)
            this.resetZoom()
        }

        // We want to resize the graphics and set the min zoom if the windowWidth has changed
        if (this.maxRendererSize != maxRendererSize) {
            this.resizeGraphics(imcData, maxRendererSize)
        }

        this.stage.removeChildren()

        // For each channel setting the brightness and color filters
        for (const s of ImageChannels) {
            const curChannel = s as ChannelName
            if (channelVisibility[s]) this.loadChannelGraphics(curChannel, imcData, channelMarker, channelDomain)
        }

        // Update and load segmentation data graphics
        const segmentationDataChanged = this.refreshSegmentationGraphicsIfChanged(segmentationData)
        this.loadSegmentationGraphics(segmentationFillAlpha, segmentationOutlineAlpha, segmentationCentroidsVisible)

        // Update and load selected region graphics
        this.refreshSelectedRegionGraphicsIfChanged(segmentationDataChanged, selectedRegions)
        this.loadSelectedRegionGraphics(this.stage, highlightedRegions)

        if (segmentationData != null) {
            this.loadHighlightedSegmentGraphics(segmentationData, highlightedSegmentsFromGraph)
        }

        if (position && scale) this.setStagePositionAndScale(position, scale)

        // Create the legend for which markers are being displayed
        this.loadLegendGraphics(legendVisible, imcData, channelMarker)
        // Update whether or not the zoom inset is visible and then re-render it
        this.zoomInsetVisible = zoomInsetVisible
        this.loadZoomInsetGraphics()

        this.renderer.render(this.rootContainer)

        if (exportPath) {
            this.exportRenderer(exportPath)
            this.onExportComplete()
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

        const maxHeight = this.props.maxHeight

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
                                    maxHeight,
                                )
                            }}
                        />
                    </div>
                )}
            </SizeMe>
        )
    }
}
