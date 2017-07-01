import * as React from "react"
import * as ReactDOM from "react-dom"
import { observer } from "mobx-react"
import * as IMCImage from "./IMCImage"
import * as SelectionLayer from "./SelectionLayer"
import { BrushEventHandler } from "../interfaces/UIDefinitions"
import { ObservableMap } from "mobx"
import { LabelLayer } from "./LabelLayer"


type ViewPortSpecificProps = {
    labelsLayers: ObservableMap<Uint8ClampedArray>
}

type ViewPortProps = IMCImage.IMCImageProps & SelectionLayer.SelectionLayerProps & ViewPortSpecificProps

type s = keyof ViewPortProps

@observer
export class ViewPort extends React.Component<ViewPortProps, undefined> {
    
    onBrushEnd:BrushEventHandler = (e) => {
        this.props.onBrushEnd(e)
    }

    render() {

        let labelLayers:JSX.Element[] = []

        this.props.labelsLayers.forEach((v, k) => {
            labelLayers.push(
                <LabelLayer
                    width = {this.props.canvasWidth}
                    height = {this.props.canvasHeight}
                    name = {k}
                    key = {k}
                    data = {v}
                />
            )
        })

        return(
            <div className = "viewport">
                <IMCImage.IMCImage {...this.props}/>
                {labelLayers}
                <SelectionLayer.SelectionLayer
                    canvasWidth = {this.props.canvasWidth}
                    canvasHeight = {this.props.canvasHeight}
                    onBrushEnd = {this.onBrushEnd}
                />
            </div>
        )
    }
}