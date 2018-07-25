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
    stage: PIXI.Container

    channelFilters: Record<ChannelName, PIXI.filters.ColorMatrixFilter>

    constructor(props:IMCImageProps) {
        super(props)
        this.stage = new PIXI.Container()

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

    }

    onCanvasDataLoaded = (data: ImageData) => this.props.onCanvasDataLoaded(data)
    
    // Generating brightness filter code for each channel.
    // Somewhat hacky workaround without uniforms because uniforms weren't working with Typescript.
    generateBrightnessFilterCode = ( imcData:IMCData, 
        channelMarker: Record<ChannelName, string | null>,
        channelDomain:  Record<ChannelName, [number, number]>) => {
        let brightnessFilterCode = new Map<string, string> ()
        let channels =  ['r', 'g', 'b']

        for (var i in channels){
            let key = channels[i]
            let channelName = `${key}Channel` as ChannelName

            let curChannelDomain = channelDomain[channelName]

            // Get the max value for the given channel.
            let marker = channelMarker[channelName]
            let channelMax = 100.0
            if (marker != null){
                channelMax = imcData.minmax[marker].max
            }
    
            // Using slider values to generate m and b for a linear transformation (y = mx + b).
            let b = ((curChannelDomain["0"] === 0 ) ? 0 : curChannelDomain["0"]/channelMax).toFixed(4)
            let m = (channelMax/(curChannelDomain["1"] - curChannelDomain["0"])).toFixed(4)

            let filterCode = `
            varying vec2 vTextureCoord;
            varying vec4 vColor;
            
            uniform sampler2D uSampler;
            uniform vec4 uTextureClamp;
            uniform vec4 uColor;
            
            void main(void)
            {
                gl_FragColor = texture2D(uSampler, vTextureCoord);
                gl_FragColor.${key} = min((gl_FragColor.${key} * ${m}) + ${b}, 1.0);
            }`

            brightnessFilterCode.set(channelName, filterCode)
        }
        return brightnessFilterCode
    }
   
    renderImage(el: HTMLDivElement, 
        imcData:IMCData, 
        channelMarker: Record<ChannelName, string | null>,
        channelDomain:  Record<ChannelName, [number, number]>) {

        if(el == null)
            return
        this.el = el
        
        if(!this.el.hasChildNodes()) {
            this.renderer = new PIXI.WebGLRenderer(imcData.width, imcData.height)
            el.appendChild(this.renderer.view)
        }

        let brightnessFilterCode = this.generateBrightnessFilterCode(imcData, channelMarker, channelDomain)

        this.stage.removeChildren()

        // For each channel setting the brightness and color filters
        for (let s of ["rChannel", "gChannel", "bChannel"]) {
            let curChannel = s as ChannelName
            let curMarker = channelMarker[curChannel] 
            if(curMarker != null) {
                let brightnessFilter = new PIXI.Filter(undefined, brightnessFilterCode.get(curChannel),undefined)
                let sprite = imcData.sprites[curMarker]
                sprite.filters = [brightnessFilter, this.channelFilters[curChannel]]
                this.stage.addChild(sprite)
            }
        }
   
        this.renderer.render(this.stage)
            //if(onScreenCtx != null) {
            //    onScreenCtx.drawImage(offScreen, 0, 0, imcData.width, imcData.height, 0, 0, el.width, el.height)
                //onScreenCtx.drawImage(offScreen, 0, 0, el.width, el.height)
            //}
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
        let scaleFactor = 1200 / imcData.width

        let width = imcData.width * scaleFactor
        let height = imcData.height * scaleFactor



        return(
            <div className="imcimage"
                    ref={(el) => {this.renderImage(el, imcData, channelMarker, channelDomain)}}
            />
        )
    }
}