import * as React from "react"
import { observer } from "mobx-react"
import { SelectOption } from "../interfaces/UIDefinitions"
import { ScatterPlot } from "./ScatterPlot"
import { PlotStore } from "../stores/PlotStore";

export interface PlotAppProps { 
    plotStore: PlotStore
    channelSelectOptions: {value: string, label:string}[]
}

@observer
export class PlotApp extends React.Component<PlotAppProps, {}> {
    constructor(props: PlotAppProps) {
        super(props)
    }

    onPlotChannelSelect = (x: SelectOption[]) => this.props.plotStore.setSelectedPlotChannels(x)
    onPlotMetricSelect = (x: SelectOption) => this.props.plotStore.setScatterPlotStatistic(x)

    render() {
        let scatterPlot = null

        if(this.props.plotStore.scatterPlotData != null) {
                
                scatterPlot = <ScatterPlot 
                    windowWidth = {null}
                    channelSelectOptions = {this.props.channelSelectOptions}
                    selectedPlotChannels = {this.props.plotStore.selectedPlotChannels}
                    setSelectedPlotChannels = {this.onPlotChannelSelect}
                    selectedStatistic= {this.props.plotStore.scatterPlotStatistic}
                    setSelectedStatistic = {this.onPlotMetricSelect}
                    selectedTransform = {this.props.plotStore.scatterPlotTransform}
                    setSelectedTransform = {this.props.plotStore.setScatterPlotTransform}
                    setSelectedPoints = {this.props.plotStore.setSegmentsSelectedOnPlot}
                    setHoveredPoints = {this.props.plotStore.setSegmentsHoveredOnPlot}
                    setUnHoveredPoints = {this.props.plotStore.clearSegmentsHoveredOnPlot}
                    scatterPlotData = {this.props.plotStore.scatterPlotData}
                />
        }
     
        return(
            <div>
                {scatterPlot}
            </div>
        )
    }
}