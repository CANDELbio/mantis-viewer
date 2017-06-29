import * as React from "react"
import * as ReactDOM from "react-dom"
import { observer } from "mobx-react"
import * as IMCImage from "./IMCImage"


type ViewPortProps = IMCImage.IMCImageProps

@observer
export class ViewPort extends React.Component<ViewPortProps, undefined> {


    render() {
        let {...props} = this.props

        return(
            <div>
                <IMCImage.IMCImage {...this.props}/>
            </div>
        )
    }

}