import * as React from 'react'
import * as PIXI from 'pixi.js'
import * as fs from 'fs'
import { observer } from 'mobx-react'

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
    selectedRegions: SelectedPopulation[] | null
    addSelectedRegion: (selectedRegion: number[] | null, selectedSegments: number[], color: number) => void
    updateSelectedRegions: (selectedRegions: SelectedPopulation[]) => void
    hightlightedRegions: string[]
    highlightedSegmentsFromPlot: number[]
    exportPath: string | null
    onExportComplete: () => void
    maxRendererSize: {
        width: number
        height: number
    }
    legendVisible: boolean
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

    // Selected regions stored locally so that we can compare to the selected regions being passed in from the store
    // If there is a difference, we update this object and the rerender the graphics stored in selectedRegionGraphics
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

        let redFilter = new PIXI.filters.ColorMatrixFilter()
        redFilter.matrix = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
        redFilter.blendMode = PIXI.BLEND_MODES.ADD

        let greenFilter = new PIXI.filters.ColorMatrixFilter()
        greenFilter.matrix = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
        greenFilter.blendMode = PIXI.BLEND_MODES.ADD

        let blueFilter = new PIXI.filters.ColorMatrixFilter()
        blueFilter.matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]
        blueFilter.blendMode = PIXI.BLEND_MODES.ADD

        let cyanFilter = new PIXI.filters.ColorMatrixFilter()
        cyanFilter.matrix = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]
        cyanFilter.blendMode = PIXI.BLEND_MODES.ADD

        let magentaFilter = new PIXI.filters.ColorMatrixFilter()
        magentaFilter.matrix = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]
        magentaFilter.blendMode = PIXI.BLEND_MODES.ADD

        let yellowFilter = new PIXI.filters.ColorMatrixFilter()
        yellowFilter.matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
        yellowFilter.blendMode = PIXI.BLEND_MODES.ADD

        let blackFilter = new PIXI.filters.ColorMatrixFilter()
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

    private onExportComplete = () => this.props.onExportComplete()
    private addSelectedRegionToStore = (selectedRegion: number[] | null, selectedSegments: number[], color: number) => {
        this.props.addSelectedRegion(selectedRegion, selectedSegments, color)
    }
    private updateSelectedRegionsInStore = (selectedRegions: SelectedPopulation[]) => {
        this.props.updateSelectedRegions(selectedRegions)
    }

    // Checks to make sure that we haven't panned past the bounds of the stage.
    private checkSetStageBounds(): void {
        // Not able to scroll past top left corner
        if (this.stage.position.x > 0) this.stage.position.x = 0
        if (this.stage.position.y > 0) this.stage.position.y = 0

        // Calculate where the coordinates of the botttom right corner are in relation to the current window/stage size and the scale of the image.
        let minX = this.rendererWidth - this.imageData.width * this.stage.scale.x
        let minY = this.rendererHeight - this.imageData.height * this.stage.scale.y

        // Not able to scroll past the bottom right corner
        if (this.stage.position.x < minX) this.stage.position.x = minX
        if (this.stage.position.y < minY) this.stage.position.y = minY
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

    private zoom(isZoomIn: boolean): void {
        let beforeTransform = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)

        let direction = isZoomIn ? 1 : -1
        let factor = 1 + direction * 0.05
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
        this.resizeLegend()
        this.renderer.render(this.rootContainer)
    }

    private addZoom(el: HTMLDivElement): void {
        el.addEventListener('wheel', e => {
            e.stopPropagation()
            e.preventDefault()
            this.zoom(e.deltaY < 0)
        })
    }

    private addPan(el: HTMLDivElement): void {
        let mouseDownX: number, mouseDownY: number

        // On mousedown set dragging to true and save the mouse position where we started dragging
        el.addEventListener('mousedown', () => {
            let altPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.altKey
            if (!altPressed) {
                this.dragging = true
                let pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
                mouseDownX = pos.x
                mouseDownY = pos.y
            }
        })

        // If the mouse moves and we are dragging, adjust the position of the stage and rerender.
        el.addEventListener('mousemove', () => {
            if (this.dragging) {
                let pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
                let dx = (pos.x - mouseDownX) * this.stage.scale.x
                let dy = (pos.y - mouseDownY) * this.stage.scale.y

                this.stage.position.x += dx
                this.stage.position.y += dy
                this.checkSetStageBounds()
                this.stage.updateTransform()
                this.resizeLegend()
                this.renderer.render(this.rootContainer)
            }
        })

        // If the mouse is released stop dragging
        el.addEventListener('mouseup', () => {
            if (this.dragging) {
                this.dragging = false
            }
        })

        // If the mouse exits the PIXI element stop dragging
        el.addEventListener('mouseout', () => {
            if (this.dragging) {
                this.dragging = false
            }
        })
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
            let altPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.altKey
            let metaPressed = this.renderer.plugins.interaction.eventData.data.originalEvent.metaKey
            if (altPressed || metaPressed) {
                this.selecting = true
                selectionColor = randomHexColor()
                let pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
                selection.push(pos.x)
                selection.push(pos.y)
            }
        })

        // If the mouse moves and we are dragging, adjust the position of the stage and rerender.
        el.addEventListener('mousemove', () => {
            if (this.selecting) {
                let pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
                selection.push(pos.x)
                selection.push(pos.y)

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

    private setScaleFactors(imcData: ImageData, maxRendererSize: { width: number; height: number }): void {
        // Setting up the scale factor trying to maximize the width
        let scaleFactor = maxRendererSize.width / imcData.width
        let scaledHeight = imcData.height * scaleFactor
        let scaledWidth = maxRendererSize.width

        // If the scaled height is larger than the max allowable, scale to maximize the height.
        if (scaledHeight > maxRendererSize.height) {
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
    private resizeGraphics(imcData: ImageData, maxRendererSize: { width: number; height: number }): void {
        this.setScaleFactors(imcData, maxRendererSize)
        this.renderer.resize(this.rendererWidth, this.rendererHeight)
        this.checkScale()
    }

    private resetZoom(): void {
        // Setting the initial scale/zoom of the stage so the image fills the stage when we start.
        this.stage.scale.x = this.minScale
        this.stage.scale.y = this.minScale
    }

    private initializeGraphics(imcData: ImageData, maxRendererSize: { width: number; height: number }): void {
        if (this.el == null) return

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

    private loadChannelGraphics(
        curChannel: ChannelName,
        imcData: ImageData,
        channelMarker: Record<ChannelName, string | null>,
        channelDomain: Record<ChannelName, [number, number]>,
    ): void {
        let filterCode = GraphicsHelper.generateBrightnessFilterCode()
        let curMarker = channelMarker[curChannel]
        if (curMarker != null) {
            let sprite = imcData.sprites[curMarker]
            let uniforms = GraphicsHelper.generateBrightnessFilterUniforms(
                curChannel,
                imcData,
                channelMarker,
                channelDomain,
            )
            let brightnessFilter = new PIXI.Filter(undefined, filterCode, uniforms)
            // Delete sprite filters so they get cleared from memory before adding new ones
            sprite.filters = [brightnessFilter, this.channelFilters[curChannel]]
            this.stage.addChild(sprite)
        }
    }

    private refreshSegmentationGraphicsIfChanged(segmentationData: SegmentationData | null): boolean {
        let segmentationDataChanged = segmentationData != this.segmentationData
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

        // Add segementation outlines
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
                for (let region of selectedRegions) {
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
            for (let regionId in this.selectedRegionGraphics) {
                let curGraphics = this.selectedRegionGraphics[regionId]
                // Set the alpha correctly for regions that need to be highlighted
                let regionAlpha = SelectedRegionAlpha
                let outlineAlpha = SelectedSegmentOutlineAlpha
                if (highlightedRegions.indexOf(regionId) > -1) {
                    regionAlpha = HighlightedSelectedRegionAlpha
                    outlineAlpha = HighlightedSelectedSegmentOutlineAlpha
                }

                let regionGraphics = curGraphics.region
                if (regionGraphics != null) {
                    regionGraphics.alpha = regionAlpha
                    stage.addChild(regionGraphics)
                }

                let outlineGraphics = curGraphics.outline
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
            let graphics = segmentationData.segmentOutlineGraphics(
                HighlightedSegmentOutlineColor,
                SelectedSegmentOutlineWidth,
                highlightedSegments,
            )
            this.stage.addChild(graphics)
        }
    }

    private resizeLegend(): void {
        this.stage.removeChild(this.legendGraphics)
        let xScale = 1 / this.stage.scale.x
        let yScale = 1 / this.stage.scale.y
        this.legendGraphics.setTransform(
            Math.abs(this.stage.position.x) * xScale,
            Math.abs(this.stage.position.y) * yScale,
            xScale,
            yScale,
        )
        this.stage.addChild(this.legendGraphics)
    }

    private loadLegendGraphics(
        legendVisible: boolean,
        legendGraphics: PIXI.Graphics,
        channelMarker: Record<ChannelName, string | null>,
    ): void {
        if (legendVisible) {
            GraphicsHelper.drawLegend(this.legendGraphics, channelMarker)
            this.resizeLegend()
        } else {
            // Clear out the legend graphics so they don't get redrawn when zooming.
            legendGraphics.clear()
            legendGraphics.removeChildren()
        }
    }

    private exportRenderer(exportPath: string): void {
        // Get the source canvas that we are exporting from pixi
        let sourceCanvas = this.renderer.extract.canvas()
        let sourceContext = sourceCanvas.getContext('2d')

        if (sourceContext) {
            // Convert to a base64 encoded png
            let exportingImage = sourceCanvas.toDataURL('image/png')
            // Replace the header so that we just have the base64 encoded string
            let exportingData = exportingImage.replace(/^data:image\/png;base64,/, '')
            // Save the base64 encoded string to file.
            fs.writeFile(exportPath, exportingData, 'base64', function(err) {
                console.log(err)
            })
        }
    }

    private renderImage(
        el: HTMLDivElement | null,
        imcData: ImageData,
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
        maxRendererSize: { width: number; height: number },
        legendVisible: boolean,
    ): void {
        if (el == null) return
        this.el = el

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
        for (let s of ImageChannels) {
            let curChannel = s as ChannelName
            if (channelVisibility[s]) this.loadChannelGraphics(curChannel, imcData, channelMarker, channelDomain)
        }

        // Update and load segmentation data graphics
        let segmentationDataChanged = this.refreshSegmentationGraphicsIfChanged(segmentationData)
        this.loadSegmentationGraphics(segmentationFillAlpha, segmentationOutlineAlpha, segmentationCentroidsVisible)

        // Update and load selected region graphics
        this.refreshSelectedRegionGraphicsIfChanged(segmentationDataChanged, selectedRegions)
        this.loadSelectedRegionGraphics(this.stage, highlightedRegions)

        if (segmentationData != null) {
            this.loadHighlightedSegmentGraphics(segmentationData, highlightedSegmentsFromGraph)
        }

        // Create the legend for which markers are being displayed
        this.loadLegendGraphics(legendVisible, this.legendGraphics, channelMarker)

        this.renderer.render(this.rootContainer)

        if (exportPath) {
            this.exportRenderer(exportPath)
            this.onExportComplete()
        }
    }

    public render(): React.ReactNode {
        //Dereferencing these here is necessary for Mobx to trigger, because
        //render is the only tracked function (i.e. this will not trigger if
        //the variables are dereferenced inside renderImage)
        let channelMarker = {
            rChannel: this.props.channelMarker.rChannel,
            gChannel: this.props.channelMarker.gChannel,
            bChannel: this.props.channelMarker.bChannel,
            cChannel: this.props.channelMarker.cChannel,
            mChannel: this.props.channelMarker.mChannel,
            yChannel: this.props.channelMarker.yChannel,
            kChannel: this.props.channelMarker.kChannel,
        }

        let channelDomain = {
            rChannel: this.props.channelDomain.rChannel,
            gChannel: this.props.channelDomain.gChannel,
            bChannel: this.props.channelDomain.bChannel,
            cChannel: this.props.channelDomain.cChannel,
            mChannel: this.props.channelDomain.mChannel,
            yChannel: this.props.channelDomain.yChannel,
            kChannel: this.props.channelDomain.kChannel,
        }

        let channelVisibility = {
            rChannel: this.props.channelVisibility.rChannel,
            gChannel: this.props.channelVisibility.gChannel,
            bChannel: this.props.channelVisibility.bChannel,
            cChannel: this.props.channelVisibility.cChannel,
            mChannel: this.props.channelVisibility.mChannel,
            yChannel: this.props.channelVisibility.yChannel,
            kChannel: this.props.channelVisibility.kChannel,
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

        let legendVisible = this.props.legendVisible

        return (
            <div
                className="imcimage"
                ref={el => {
                    this.renderImage(
                        el,
                        imcData,
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
                        maxRendererSize,
                        legendVisible,
                    )
                }}
            />
        )
    }
}
