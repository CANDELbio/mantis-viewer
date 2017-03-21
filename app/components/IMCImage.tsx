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



export class IMCImage extends React.Component<IMCImageProps, undefined> {

    renderImage(el: HTMLCanvasElement) {
        console.log("Rendering IMC image")
        if(el == null)
            return
        
        let IMCData = this.props.imageData
        console.log(this.props)
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

     


            for(let i = 0; i < IMCData.length ; ++i) {
                let idx = i * 4
    
                if(this.props.rChannel != null)
                    data[idx] = rScale(IMCData[i][this.props.rChannel])
                if(this.props.gChannel != null)
                    data[idx + 1] = gScale(IMCData[i][this.props.gChannel])
                if(this.props.bChannel != null)
                    data[idx + 2] = bScale(IMCData[i][this.props.bChannel])
                
   
                data[idx + 3] = 255
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