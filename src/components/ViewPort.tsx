import * as React from "react"
import { observer } from "mobx-react"
import * as IMCImage from "./IMCImage"
import { LabelLayerView } from "./LabelLayerView"
import { ImageStore } from "../stores/ImageStore"



type ViewPortSpecificProps  = {
    labelsLayers: ImageStore["labelsLayers"]
}

type ViewPortProps = IMCImage.ImageProps & ViewPortSpecificProps



@observer
export class ViewPort extends React.Component<ViewPortProps, {}> {

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
                {/* {labelLayers} */}
            </div>
        )
    }
}