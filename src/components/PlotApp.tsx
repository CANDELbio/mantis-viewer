import * as React from "react"
import { ImageStore } from "../stores/ImageStore"
import { observer } from "mobx-react"
import { ChannelName, SelectOption } from "../interfaces/UIDefinitions"
import { ScatterPlot } from "./ScatterPlot"
import { PopulationStore } from "../stores/PopulationStore";
import { PlotStore } from "../stores/PlotStore";

export interface PlotAppProps { 
    imageStore: ImageStore
    populationStore: PopulationStore
    plotStore: PlotStore
    addSelectedPopulation: ((segmentIds: number[]) => void)
    setHoveredSegments: ((segmentIds: number[]) => void)
}

@observer
export class PlotApp extends React.Component<PlotAppProps, {}> {
    constructor(props: PlotAppProps) {
        super(props)
    }

    onPlotChannelSelect = (x: SelectOption[]) => this.props.plotStore.setSelectedPlotChannels(x)
    onPlotMetricSelect = (x: SelectOption) => this.props.plotStore.setScatterPlotStatistic(x)

    getChannelMin = (s:ChannelName) => {
        let channelMarker = this.props.imageStore.channelMarker[s]
        if (channelMarker != null && this.props.imageStore.imageData != null) {
            return this.props.imageStore.imageData.minmax[channelMarker].min
        }
        return 0
    }

    getChannelMax = (s:ChannelName) => {
        let channelMarker = this.props.imageStore.channelMarker[s]
        if (channelMarker != null && this.props.imageStore.imageData != null) {
            return this.props.imageStore.imageData.minmax[channelMarker].max
        }
        return 100
    }

    render() {
        let scatterPlot = null

        if(this.props.imageStore.imageData != null) {
            if (this.props.imageStore.selectedSegmentationFile != null) {
                scatterPlot = <ScatterPlot 
                    windowWidth = {this.props.imageStore.windowWidth}
                    channelSelectOptions = {this.props.imageStore.channelSelectOptions.get()}
                    selectedPlotChannels = {this.props.plotStore.selectedPlotChannels}
                    setSelectedPlotChannels = {this.onPlotChannelSelect}
                    selectedStatistic= {this.props.plotStore.scatterPlotStatistic}
                    setSelectedStatistic = {this.onPlotMetricSelect}
                    selectedTransform = {this.props.plotStore.scatterPlotTransform}
                    setSelectedTransform = {this.props.plotStore.setScatterPlotTransform}
                    setSelectedSegments = {this.props.addSelectedPopulation}
                    setHoveredSegments = {this.props.setHoveredSegments}
                    scatterPlotData = {this.props.plotStore.scatterPlotData}
                />
            }
        }

        return(
            <div>
                {scatterPlot}
            </div>
        )
    }
}