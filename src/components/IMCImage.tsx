import * as React from "react"
import * as ReactDOM from "react-dom"
import * as d3Scale from "d3-scale"
import * as d3Array from "d3-array"
import * as fs from "fs"
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

    el:HTMLCanvasElement | null = null

    constructor(props:IMCImageProps) {
        super(props)
    }

    onCanvasDataLoaded = (data: ImageData) => this.props.onCanvasDataLoaded(data)
    

    renderImage(el: HTMLCanvasElement, 
        imcData:IMCData, 
        channelMarker: Record<ChannelName, string | null>,
        channelDomain:  Record<ChannelName, [number, number]>) {

        if(el == null)
            return
        this.el = el

        console.log("Doing the expensive thing")
        let maxX = imcData.stats["X"][1] 
        let maxY = imcData.stats["Y"][1]
        let offScreen = document.createElement("canvas")
        offScreen.width = maxX + 1
        offScreen.height = maxY + 1
    
        let ctx = offScreen.getContext("2d")
        if(ctx != null) {
            let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
            let canvasData = imageData.data
            let IMCDataLength = imcData.data["X"].length
            let dataIdx = new Array(IMCDataLength)

            for(let i = 0; i < IMCDataLength ; ++i) {
                //setup the dataIdx array by multiplying by 4 (i.e. bitshifting by 2)
                let idx = i << 2
                dataIdx[i] = idx
                canvasData[idx + 3] = 255

            }
            
            if(channelMarker.rChannel != null) {
                let v = imcData.data[channelMarker.rChannel!]

                let dom = channelDomain.rChannel.map((x) => {
                    return(quantile(imcData.sortedData[channelMarker.rChannel!], x / 100, true))
                }) 
                
                let colorScale = d3Scale.scaleLinear()
                    .domain(dom)
                    .range([0, 255])

                for(let i = 0; i < IMCDataLength; ++i) {
                    canvasData[dataIdx[i]] = colorScale(v[i])
                }
            }
            
            if(channelMarker.gChannel != null) {
                let v = imcData.data[channelMarker.gChannel!]

                let dom = channelDomain.gChannel.map((x) => {
                    return(quantile(imcData.sortedData[channelMarker.gChannel!], x / 100, true))
                }) 
                
                let colorScale = d3Scale.scaleLinear()
                    .domain(dom)
                    .range([0, 255])

                for(let i = 0; i < IMCDataLength; ++i) {
                    canvasData[dataIdx[i] + 1] = colorScale(v[i])
                }
            }

            if(channelMarker.bChannel) {
                let v = imcData.data[channelMarker.bChannel!]

                let dom = channelDomain.bChannel.map((x) => {
                    return(quantile(imcData.sortedData[channelMarker.bChannel!], x / 100, true))
                }) 

                let colorScale = d3Scale.scaleLinear()
                    .domain(dom)
                    .range([0, 255])

                for(let i = 0; i < IMCDataLength; ++i) {
                    canvasData[dataIdx[i] + 2] = colorScale(v[i])
                }
            }

            ctx.putImageData(imageData, 0, 0)
            this.onCanvasDataLoaded(imageData)
            let onScreenCtx = el.getContext("2d")
            if(onScreenCtx != null) {
                onScreenCtx.drawImage(offScreen, 0, 0, el.width, el.height)
            }
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
        console.log(imcData)
        let width = imcData.stats["X"][1] + 1
        let height = imcData.stats["Y"][1] + 1



        return(
            <div className="imcimage">
                <canvas 
                    id = "imcimage"
                    width = {width}
                    height = {height} 
                    ref={(el) => {this.renderImage(el, imcData, channelMarker, channelDomain)}}
                />
            </div>
        )
    }
}