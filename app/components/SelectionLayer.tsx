import * as React from "react";
import * as d3selection from "d3-selection"
import * as d3brush from "d3-brush"
import { D3BrushExtent, BrushEventHandler } from "../interfaces/UIDefinitions"



interface SelectionLayerProps {
    width: number
    height: number
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
        console.log("It has mounted")
   
        let svg = d3selection.select(this.el)
            
        this.brush = d3brush.brush()

        this.brush.on("end", () => {this.onBrushEnd(d3selection.event.selection)})

        svg.append("g")
            .attr("class", "brush")
            .call(this.brush)

    }

    componentWillUpdate() {
        console.log("It's updating")
    }

    render() {
        return(
            <svg width={this.props.width} height={this.props.height} ref={(el) => {this.el = el}}/>
        )
    }



}