import * as React from "react";
import * as d3selection from "d3-selection"
import * as d3brush from "d3-brush"
import { D3BrushExtent, BrushEventHandler } from "../interfaces/UIDefinitions"



export interface SelectionLayerProps {
    canvasWidth: number
    canvasHeight: number
    onBrushEnd: BrushEventHandler
}

export class SelectionLayer extends React.Component<SelectionLayerProps, undefined> {

    el:SVGElement | null = null
    brush: d3brush.BrushBehavior<{}> | null = null

    constructor(props:SelectionLayerProps) {
        super(props)
    }

    onBrushEnd:BrushEventHandler = (e) => {
        this.props.onBrushEnd(e)
    }

    componentDidMount() {
        let svg = d3selection.select(this.el)
            
        this.brush = d3brush.brush()

        this.brush.on("end", () => {this.onBrushEnd(d3selection.event.selection)})

        svg.append("g")
            .attr("class", "brush")
            .call(this.brush)

    }

    render() {
        return(
            <svg width={this.props.canvasWidth} height={this.props.canvasHeight} ref={(el) => {this.el = el}}/>
        )
    }



}