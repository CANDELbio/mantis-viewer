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

export interface IMCImageProps {

    imageData: IMCData,
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
    rootContainer : PIXI.Container
    stage: PIXI.Container

    channelFilters: Record<ChannelName, PIXI.filters.ColorMatrixFilter>

    // The width at which the stage should be fixed.
    fixedWidth: number
    // The minimum scale for zooming. Based on the fixed width/image width
    minScale: number

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

        this.fixedWidth = 1000
        this.minScale = 1.0
    }

    onCanvasDataLoaded = (data: ImageData) => this.props.onCanvasDataLoaded(data)

    zoom = (isZoomIn:boolean) => {
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
        let dragging = false

        // On mousedown set dragging to true and save the mouse position where we started dragging
        el.addEventListener("mousedown", e => {
            dragging = true
            let pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
            mouseDownX = pos.x
            mouseDownY = pos.y
        })

        // If the mouse moves and we are dragging, adjust the position of the stage and rerender.
        el.addEventListener("mousemove", e => {
            if(dragging){
                let pos = this.renderer.plugins.interaction.eventData.data.getLocalPosition(this.stage)
                let dx = pos.x - mouseDownX
                let dy = pos.y - mouseDownY

                this.stage.position.x += dx
                this.stage.position.y += dy
                this.stage.updateTransform()
                this.renderer.render(this.rootContainer)
            }
        })

        // If the mouse is released stop dragging
        el.addEventListener('mouseup', e => {
            dragging = false
        })

        // If the mouse exits the PIXI element stop dragging
        el.addEventListener('mouseout', e => {
            dragging = false
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

    renderImage(el: HTMLDivElement, 
        imcData: IMCData, 
        channelMarker: Record<ChannelName, string | null>,
        channelDomain: Record<ChannelName, [number, number]>) {

        if(el == null)
            return
        this.el = el

        if(!this.el.hasChildNodes()) {
            // Setting up the scale factor to account for the fixed width
            let scaleFactor = this.fixedWidth / imcData.width
            let width = imcData.width * scaleFactor
            let height = imcData.height * scaleFactor
            this.minScale = scaleFactor

            // Setting the initial scale/zoom of the stage so the image fills the stage when we start.
            this.stage.scale.x = scaleFactor
            this.stage.scale.y = scaleFactor

            //Setting up the renderer
            this.renderer = new PIXI.WebGLRenderer(width, height)
            el.appendChild(this.renderer.view)
        }

        this.addZoom(this.el)

        this.addPan(this.el)

        this.stage.removeChildren()

        // For each channel setting the brightness and color filters
        for (let s of ["rChannel", "gChannel", "bChannel"]) {
            let curChannel = s as ChannelName
            let curMarker = channelMarker[curChannel] 
            if(curMarker != null) {
                let brightnessFilterCode = this.generateBrightnessFilterCode(curChannel, imcData, channelMarker, channelDomain)
                let brightnessFilter = new PIXI.Filter(undefined, brightnessFilterCode, undefined)
                let sprite = imcData.sprites[curMarker]
                sprite.filters = [brightnessFilter, this.channelFilters[curChannel]]
                this.stage.addChild(sprite)
            }
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

        return(
            <div className="imcimage"
                    ref={(el) => {this.renderImage(el, imcData, channelMarker, channelDomain)}}
            />
        )
    }
}