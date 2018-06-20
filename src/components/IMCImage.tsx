import * as React from "react"
import * as ReactDOM from "react-dom"
import * as d3Scale from "d3-scale"
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
    
    textureFromData(v: Float32Array | Uint16Array, width: number, height: number) {
        let offScreen = document.createElement("canvas")
        offScreen.width = width
        offScreen.height = height
    
        let ctx = offScreen.getContext("2d")
        if(ctx) {
            let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
            let canvasData = imageData.data
            
            let colorScale = d3Scale.scaleLinear()
                    .domain([0, 10])
                    .range([0, 255])

            let dataIdx = new Array(v.length)

            for(let i = 0; i < v.length ; ++i) {
                //setup the dataIdx array by multiplying by 4 (i.e. bitshifting by 2)
                let idx = i << 2
                dataIdx[i] = idx
                canvasData[idx + 3] = 255

            }

            for(let i = 0; i < v.length; ++i) {
                let x = colorScale(v[i])
                canvasData[dataIdx[i]] = x
                canvasData[dataIdx[i] + 1] = x
                canvasData[dataIdx[i] + 2] = x
            }
            ctx.putImageData(imageData, 0, 0)

        }
        return(PIXI.Texture.fromCanvas(offScreen))

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

        console.log("Doing the expensive thing")
        let rTexture, gTexture, bTexture
        
        if(channelMarker.rChannel != null)
            rTexture = this.textureFromData(imcData.data[channelMarker.rChannel], imcData.width, imcData.height)

        if(channelMarker.gChannel != null)
            gTexture = this.textureFromData(imcData.data[channelMarker.gChannel], imcData.width, imcData.height)
        
        if(channelMarker.bChannel != null)
            bTexture = this.textureFromData(imcData.data[channelMarker.bChannel], imcData.width, imcData.height)
    
        let rSprite = new PIXI.Sprite(rTexture)
        rSprite.filters = [this.redFilter]

        let gSprite = new PIXI.Sprite(gTexture)
        gSprite.filters = [this.greenFilter]

        let bSprite = new PIXI.Sprite(bTexture)
        bSprite.filters = [this.blueFilter]

        this.stage.removeChildren()
        this.stage.addChild(rSprite)
        this.stage.addChild(gSprite)
        this.stage.addChild(bSprite)
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