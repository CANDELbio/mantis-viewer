import * as React from "react"
import { ScatterPlotData } from "../lib/ScatterPlotData"
const Select = require("react-select")
import { SelectOption } from "../interfaces/UIDefinitions"
import { observer } from "mobx-react"
import * as Plotly from 'plotly.js'
import PlotlyChart from './PlotlyChart';

// const Plot = new createPlotlyComponent(plotly)

interface ScatterPlotProps {
    channelSelectOptions: {value: string, label:string}[]
    selectedPlotChannels: string[]
    setSelectedPlotChannels: ((x: SelectOption[]) => void)
    statisticSelectOptions: {value: string, label:string}[]
    selectedStatistic: string
    setSelectedStatistic: ((x: SelectOption) => void)
    setSelectedPoints: ((data: {points:any, event:any}) => void)
    clearSelectedPoints: (() => void)
    scatterPlotData: ScatterPlotData | null
}

@observer
export class ScatterPlot extends React.Component<ScatterPlotProps, {}> {
    
    channelSelectOptions: {value: string, label:string}[]

    constructor(props: ScatterPlotProps) {
        super(props)
    }

    onPlotChannelSelect = (x: SelectOption[]) => this.props.setSelectedPlotChannels(x)
    onStatisticSelect = (x: SelectOption) => this.props.setSelectedStatistic(x)
    onPlotSelected = (data: {points:any, event:any}) => this.props.setSelectedPoints(data)
    onPlotDeselect = () => this.props.clearSelectedPoints()

    mountPlot(el:HTMLElement | null) {
        if(el != null && this.props.scatterPlotData != null) {
            Plotly.react(el, this.props.scatterPlotData.data, this.props.scatterPlotData.layout)
        }
    }

    render() {
        this.channelSelectOptions = this.props.channelSelectOptions

        // Can only select two channels for the scatter plot.
        // If two channels are selected, set the options for selecting equal to the currently selected options
        if(this.props.selectedPlotChannels.length >= 2) {
            this.channelSelectOptions =  this.props.selectedPlotChannels.map((s) => {
                return({value: s, label: s})
            })
        }

        // Clear the plot element if we don't have scatterPlot data.
        let scatterPlot = null
        let statisticControls = null
        if (this.props.scatterPlotData != null) {
            statisticControls = <Select
                value = {this.props.selectedStatistic}
                options = {this.props.statisticSelectOptions}
                onChange = {this.onStatisticSelect}
                clearable = {false}
            />

            scatterPlot =  <PlotlyChart data={this.props.scatterPlotData.data}
                     layout={this.props.scatterPlotData.layout}
                     onSelected={this.onPlotSelected}
                     onDeselect={this.onPlotDeselect} />
        }

        return(
            <div>
                <div>Scatter Plot Channels</div>
                <Select
                    value = {this.props.selectedPlotChannels}
                    options = {this.channelSelectOptions}
                    onChange = {this.onPlotChannelSelect}
                    multi = {true}
                />
                {scatterPlot}
                {statisticControls}
            </div>
        )
    }
}