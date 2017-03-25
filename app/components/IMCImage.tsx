import * as React from "react";
import * as ReactDOM from "react-dom"
import * as d3Scale from "d3-scale"
import * as d3Array from "d3-array"
import * as Papa from "papaparse"
import * as fs from "fs"
import { ImageStore } from "../stores/ImageStore"
import { observer } from "mobx-react"
import { IMCData, IMCDataStats } from "../interfaces/IMCData"
import { ChannelName } from "../interfaces/UIDefinitions"

interface IMCImageProps {
    stats: IMCDataStats,
    imageData: IMCData,
    channelDomain: Record<ChannelName, [number, number]>
    channelMarker: Record<ChannelName, string | null>  
}

@observer
export class IMCImage extends React.Component<IMCImageProps, undefined> {

    renderImage(el: HTMLCanvasElement, 
        imcData:IMCData, 
        channelMarker: Record<ChannelName, string | null>,
        channelDomain:  Record<ChannelName, [number, number]>) {

        if(el == null)
            return
        console.log("Doing the expensive thing")
        let maxX = this.props.stats["X"][1] 
        let maxY = this.props.stats["Y"][1]
        let offScreen = document.createElement("canvas")
        offScreen.width = maxX + 1
        offScreen.height = maxY + 1
    
        let ctx = offScreen.getContext("2d")
        if(ctx != null) {
            let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
            let canvasData = imageData.data
            let IMCDataLength = imcData["X"].length
            let dataIdx = new Array(IMCDataLength)

            for(let i = 0; i < IMCDataLength ; ++i) {
                //setup the dataIdx array by multiplying by 4 (i.e. bitshifting by 2)
                let idx = i << 2
                dataIdx[i] = idx
                canvasData[idx + 3] = 255

            }
            
            if(channelMarker.rChannel != null) {
                let v = imcData[channelMarker.rChannel!]

                let colorScale = d3Scale.scaleLinear()
                    .domain(channelDomain.rChannel)
                    .range([0, 255])

                for(let i = 0; i < IMCDataLength; ++i) {
                    canvasData[dataIdx[i]] = colorScale(v[i])
                }
            }
            
            if(channelMarker.gChannel != null) {
                let v = imcData[channelMarker.gChannel!]

                let colorScale = d3Scale.scaleLinear()
                    .domain(channelDomain.gChannel)
                    .range([0, 255])

                for(let i = 0; i < IMCDataLength; ++i) {
                    canvasData[dataIdx[i] + 1] = colorScale(v[i])
                }
            }

            if(channelMarker.bChannel) {
                let v = imcData[channelMarker.bChannel!]

                let colorScale = d3Scale.scaleLinear()
                    .domain(channelDomain.bChannel)
                    .range([0, 255])

                for(let i = 0; i < IMCDataLength; ++i) {
                    canvasData[dataIdx[i] + 2] = colorScale(v[i])
                }
            }

            ctx.putImageData(imageData, 0, 0)
            
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

        return(
            <div>
                <canvas 
                    className = "imcimage"
                    width = "800"
                    height = "600" 
                    ref={(el) => {this.renderImage(el, imcData, channelMarker, channelDomain)}}
                />
            </div>
        )
    }
}