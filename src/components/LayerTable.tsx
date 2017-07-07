import { Table,
    Column,
    EditableCell,
    Cell,
    SelectionModes,
} from "@blueprintjs/table"
import { Button, Classes } from "@blueprintjs/core"
import * as React from "react"
import { observer } from "mobx-react"
import { IObservableArray } from "mobx"
import { LabelLayer } from "../interfaces/UIDefinitions"
import { ImageStore } from "../stores/ImageStore"

interface LayerTableProps {
    data: ImageStore["labelsLayers"]
    onToggleLayerVisbile: (idx:number) => void
}

@observer
export class LayerTable extends React.Component<LayerTableProps, undefined> {
 
    render() {
        let nRows = this.props.data.length
        let table = null
        console.log("rendering table")

        if(nRows > 0) {
            console.log(this.props.data[0].visible)
            table = 
                <Table 
                    numRows = {nRows}
                    minRowHeight = {20} //Icons are 16px
                    selectionModes = {SelectionModes.NONE}
                >
                    <Column name = "name" 
                        renderCell = {(i) => {return <Cell>{this.props.data[i].name}</Cell>}}
                    />
                    <Column name = "" 
                        renderCell = {(i) => {return( 
                            <Cell interactive = {true}>
                                <Button className = {Classes.MINIMAL} iconName = "trash" />
                                <Button
                                    className = {Classes.MINIMAL}
                                    iconName = {this.props.data[i].visible? "eye-open" : "eye-off"}
                                    onClick = {() => this.props.onToggleLayerVisbile(i)}
                                />
                            </Cell>
                        )}}
                    />
                </Table>
        }

        return(
            <div>
                {table}
            </div>
        )
    }

}