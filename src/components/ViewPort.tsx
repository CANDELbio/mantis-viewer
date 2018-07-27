import * as React from "react"
import * as ReactDOM from "react-dom"
import { observer } from "mobx-react"
import * as IMCImage from "./IMCImage"
import * as SelectionLayer from "./SelectionLayer"
import { BrushEventHandler } from "../interfaces/UIDefinitions"
import { IObservableArray } from "mobx"
import { LabelLayerView } from "./LabelLayerView"
import { LabelLayer } from "../interfaces/UIDefinitions"
import { ImageStore } from "../stores/ImageStore"



type ViewPortSpecificProps  = {
    labelsLayers: ImageStore["labelsLayers"]
}

type ViewPortProps = IMCImage.IMCImageProps & SelectionLayer.SelectionLayerProps & ViewPortSpecificProps



@observer
export class ViewPort extends React.Component<ViewPortProps, undefined> {
    
    onBrushEnd:BrushEventHandler = (e) => {
        this.props.onBrushEnd(e)
    }

    render() {

        let labelLayers:JSX.Element[] = []

        

        this.props.labelsLayers
            //.filter((d) => {d.visible})
            .forEach((d, i) => {
            labelLayers.push(
                <LabelLayerView
                    width = {this.props.canvasWidth}
                    height = {this.props.canvasHeight}
                    name = {d.name}
                    key = {i}
                    data = {d.data}
                    visible = {d.visible}
                />
            )
        })

        return(
            <div className = "viewport">
                <IMCImage.IMCImage {...this.props}/>
                {labelLayers}
                {/* <SelectionLayer.SelectionLayer
                canvasWidth = {this.props.canvasWidth}
                canvasHeight = {this.props.canvasHeight}
                onBrushEnd = {this.onBrushEnd}
                handleWheel = {this.handleWheel}
                /> */}
            </div>
        )
    }
}