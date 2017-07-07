import * as React from "react"
import * as ReactDOM from "react-dom"
import { observer } from "mobx-react"
import { LabelLayer } from "../interfaces/UIDefinitions"



type LabelLayerProps = LabelLayer

@observer
export class LabelLayerView extends React.Component<LabelLayerProps, undefined> {
    
    
    renderLayer(el: HTMLCanvasElement | null, data: Uint8ClampedArray) {
        console.log("rendering labellayer")
        if(el != null) {
            let ctx = el.getContext("2d")
            if(ctx != null) {
                let imageData = ctx.getImageData(0, 0, el.width, el.height)
                for(let i = 0; i < data.length; i++)
                    imageData.data[i] = data[i]
                ctx.putImageData(imageData, 0, 0)
            }

        }
    }
    
    
    render() {
        let displayStyle = this.props.visible? "inline" : "none"
        return(
            <div>
                <canvas 
                    id = {this.props.name} 
                    width = {this.props.width}
                    height = {this.props.height} 
                    style={{position: "absolute", left: "0", top: "0", zIndex: 1, display: displayStyle}}
                    ref = {(el) => {this.renderLayer(el, this.props.data)}}
                />
            </div>
        )
    }

}