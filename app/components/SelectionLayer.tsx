import * as React from "react";
import * as d3selection from "d3-selection"
import * as d3brush from "d3-brush"


type brushExtent = [[number, number], [number, number]]

interface SelectionLayerProps {
    width: number
    height: number
    onBrushEnd: ((extent: brushExtent) => void)
}

export class SelectionLayer extends React.Component<SelectionLayerProps, undefined> {

    constructor(props:SelectionLayerProps) {
        super(props)
    }

    mountBrush(el: SVGElement | null) {
        if(el != null) {
            let svg = d3selection.select(el)
            
            let brush = d3brush.brush()

            brush.on("end", () => {this.props.onBrushEnd(d3selection.event.selection)})

            svg.append("g")
                .attr("class", "brush")
                .call(brush)
        }

    }

    render() {
        return(
            <svg width={this.props.width} height={this.props.height} ref={(el) => {this.mountBrush(el)}}/>
        )
    }



}