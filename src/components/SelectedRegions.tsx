import * as React from "react";
import { ImageSelection } from "../components/IMCIMage"
import { EditableText, Button } from "@blueprintjs/core"
import { observer } from "mobx-react"

interface SelectedDataProps {
    regions: Array<ImageSelection>|null
    updateName: ((id: string, name: string) => void)
    updateNotes: ((id: string, notes: string) => void)
    deleteRegion: ((id: string) => void)
    highlightRegion: ((id: string) => void)
    unhighlightRegion: ((id: string) => void)
}

interface SelectedDataRowProps {
    region: ImageSelection,
    updateName: ((id: string, name: string) => void)
    updateNotes: ((id: string, notes: string) => void)
    deleteRegion: ((id: string) => void)
    highlightRegion: ((id: string) => void)
    unhighlightRegion: ((id: string) => void)
}

@observer
export class SelectedRegions extends React.Component<SelectedDataProps, {}> {

    constructor(props:SelectedDataProps) {
        super(props)
    }

    TableRowItem = class TableRow extends React.Component<SelectedDataRowProps, {}> {
        deleteRegion = () => {
            this.props.deleteRegion(this.props.region.id)
        }

        updateName = (name: string) => {
            this.props.updateName(this.props.region.id, name)
        }

        updateNotes = (notes: string) => {
            this.props.updateNotes(this.props.region.id, notes)
        }

        highlightRegion = (event: React.MouseEvent<HTMLTableRowElement>) => {
            this.props.highlightRegion(this.props.region.id)
        }

        unhighlightRegion = (event: React.MouseEvent<HTMLTableRowElement>) => {
            this.props.unhighlightRegion(this.props.region.id)
        }

        render() {
            let thisNotes = (this.props.region.notes == null) ? "" : this.props.region.notes
            return(
                <tr onMouseEnter={this.highlightRegion} onMouseLeave={this.unhighlightRegion}>
                    <td><EditableText defaultValue={this.props.region.name} onConfirm={this.updateName}/></td>
                    <td><EditableText defaultValue={thisNotes} onConfirm={this.updateNotes}/></td> 
                    <td><Button text={"Delete"} onClick={this.deleteRegion}/></td>
                </tr>)
        }
    }

    regionRows(regions: ImageSelection[] | null) {
        if(regions!= null){
            return regions.map((region) => {
                return <this.TableRowItem
                    key={region.id}
                    region={region}
                    updateName={this.props.updateName}
                    updateNotes={this.props.updateNotes}
                    deleteRegion={this.props.deleteRegion}
                    highlightRegion={this.props.highlightRegion}
                    unhighlightRegion={this.props.unhighlightRegion}
                />
                })
            }
        return null
    }

    render() {
        let regions = this.props.regions
        return(
            <div>
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Notes</th>
                            <th> </th>
                        </tr>
                    </thead>
                    <tbody>
                        { this.regionRows(regions) }
                    </tbody>
                </table>
            </div>
        )
    }



}