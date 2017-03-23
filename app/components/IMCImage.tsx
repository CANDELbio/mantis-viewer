import * as React from "react";
import * as ReactDOM from "react-dom"
import * as d3Scale from "d3-scale"
import * as d3Array from "d3-array"
import * as Papa from "papaparse"
import * as fs from "fs"
import { ImageStore } from "../stores/ImageStore"
import { observer } from "mobx-react"
import { IMCData, IMCDataStats } from "../interfaces/IMCData"


interface IMCImageProps {
    stats: IMCDataStats,
    imageData: IMCData[],
    rChannel?:string,
    gChannel?:string,
    bChannel?:string,

    rChannelDomain?: [number, number]
}


//Adding observer here makes the render much much slower?!?!
// is it because we need to cache the props?!?
// Yes that's definitely why. There are a tons of get access
@observer
export class IMCImage extends React.Component<IMCImageProps, undefined> {

    renderImage(el: HTMLCanvasElement) {
        console.log("Rendering IMC image")
        if(el == null)
            return
        console.log("Doing the expensive thing")
        let IMCData = this.props.imageData
        let maxX = this.props.stats["X"][1] 
        let maxY = this.props.stats["Y"][1]
        let offScreen = document.createElement("canvas")
        offScreen.width = maxX + 1
        offScreen.height = maxY + 1
    
        let ctx = offScreen.getContext("2d")
        if(ctx != null) {
            let rScale = d3Scale.scaleLinear()
                .domain(this.props.rChannelDomain!)
                .range([0, 255])
            let gScale = d3Scale.scaleLinear()
                .domain([0, 200])
                .range([0, 255])
            let bScale = d3Scale.scaleLinear()
                .domain([0, 200])
                .range([0, 255])

            let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
            let data = imageData.data
            let dataIdx = new Array(IMCData.length)

            for(let i = 0; i < IMCData.length ; ++i) {
                //setup the dataIdx array by multiplying by 4 (i.e. bitshifting by 2)
                let idx = i << 2
                dataIdx[i] = idx
                data[idx + 3] = 255

            }

            if(this.props.rChannel != null) {
                let rChannel = this.props.rChannel
                for(let i = 0; i < IMCData.length ; ++i) {
                    data[dataIdx[i]] = rScale(IMCData[i][rChannel])
                }
            }
            
            if(this.props.gChannel != null) {
                let gChannel = this.props.gChannel
                for(let i = 0; i < IMCData.length ; ++i) {
                    data[dataIdx[i] + 1] = gScale(IMCData[i][gChannel])
                }
            }

            if(this.props.bChannel != null) {
                let bChannel = this.props.bChannel
                for(let i = 0; i < IMCData.length ; ++i) {
                    data[dataIdx[i] + 2] = bScale(IMCData[i][bChannel])
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
        console.log("IMCImage rendering")
        console.log(this.props.stats)
        console.log(this.props.rChannel)
        return(
            <div>
                <canvas 
                    className = "imcimage"
                    width = "800"
                    height = "600" 
                    ref={(el) => {this.renderImage(el)}}
                />
            </div>
        )
    }
}