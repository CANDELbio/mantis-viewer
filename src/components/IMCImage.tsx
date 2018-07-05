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
import * as FS from "fs"


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
    redFilter: PIXI.filters.ColorMatrixFilter
    greenFilter: PIXI.filters.ColorMatrixFilter
    blueFilter: PIXI.filters.ColorMatrixFilter

    constructor(props:IMCImageProps) {
        super(props)
        this.stage = new PIXI.Container()

        this.redFilter = new PIXI.filters.ColorMatrixFilter()
        this.redFilter.matrix = [
            1, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 0, 1, 0
        ]
        this.redFilter.blendMode = PIXI.BLEND_MODES.ADD

        this.greenFilter = new PIXI.filters.ColorMatrixFilter()
        this.greenFilter.matrix = [
            0, 0, 0, 0, 0,
            0, 1, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 0, 1, 0
        ]
        this.greenFilter.blendMode = PIXI.BLEND_MODES.ADD

        this.blueFilter = new PIXI.filters.ColorMatrixFilter()
        this.blueFilter.matrix = [
            0, 0, 0, 0, 0,
            0, 0, 0, 0, 0,
            0, 0, 1, 0, 0,
            0, 0, 0, 1, 0
        ]
        this.blueFilter.blendMode = PIXI.BLEND_MODES.ADD
    }

    onCanvasDataLoaded = (data: ImageData) => this.props.onCanvasDataLoaded(data)
    
   
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

        console.log("Doing the expensive thing")
        let rSprite, gSprite, bSprite

        // Generating brightness filter code for each channel.
        // Somewhat hacky workaround because uniforms weren't working with Typescript.
        let brightnessFilterCode = new Map<string, string> ()
        let channels =  ['r', 'g', 'b']
        
        for (var i in channels){
            let key = channels[i]
            let channelName = `${key}Channel` as ChannelName

            console.log(`Generating bfc for ${key} with channel ${channelName}`)

            let curChannelDomain = channelDomain[channelName]

            let b = ((curChannelDomain["0"] === 0 ) ? 0 : curChannelDomain["0"]/100).toFixed(4)
            let m = (100.0/(curChannelDomain["1"] - curChannelDomain["0"])).toFixed(4)

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

            console.log(filterCode)

            brightnessFilterCode.set(key, filterCode)
        }

        console.log(brightnessFilterCode)

        this.stage.removeChildren()
        
        if(channelMarker.rChannel != null) {
            let rBrightnessFilter = new PIXI.Filter(undefined,brightnessFilterCode.get('r'),undefined);
            rSprite = imcData.sprites[channelMarker.rChannel]
            rSprite.filters = [rBrightnessFilter, this.redFilter]
            this.stage.addChild(rSprite)
        }

        if(channelMarker.gChannel != null) {
            let gBrightnessFilter = new PIXI.Filter(undefined,brightnessFilterCode.get('g'),undefined);
            gSprite = imcData.sprites[channelMarker.gChannel]
            gSprite.filters = [gBrightnessFilter, this.greenFilter]
            this.stage.addChild(gSprite)
        }

        if(channelMarker.bChannel != null) {
            let bBrightnessFilter = new PIXI.Filter(undefined,brightnessFilterCode.get('b'),undefined);
            bSprite = imcData.sprites[channelMarker.bChannel]
            bSprite.filters = [bBrightnessFilter, this.blueFilter]
            this.stage.addChild(bSprite)
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

        console.log(channelDomain);
        
        let imcData = this.props.imageData
        console.log(imcData)
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