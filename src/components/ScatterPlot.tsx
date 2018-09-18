// Draws some inspiration from https://github.com/plotly/react-plotly.js/
// Might be able to use this in the future or to make this component more React-y
import * as React from "react"
import { ScatterPlotData } from "../lib/ScatterPlotData"
const Select = require("react-select")
import { SelectOption } from "../interfaces/UIDefinitions"
import { observer } from "mobx-react"
import * as Plotly from 'plotly.js'

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
    public container: Plotly.PlotlyHTMLElement | null = null;
    
    channelSelectOptions: {value: string, label:string}[]

    constructor(props: ScatterPlotProps) {
        super(props)
    }

    onPlotChannelSelect = (x: SelectOption[]) => this.props.setSelectedPlotChannels(x)
    onStatisticSelect = (x: SelectOption) => this.props.setSelectedStatistic(x)
    onPlotSelected = (data: {points:any, event:any}) => this.props.setSelectedPoints(data)
    onPlotDeselect = () => this.props.clearSelectedPoints()

    public componentWillUnmount() {
        if (this.container) Plotly.purge(this.container)
    }

    mountPlot = async (el:HTMLElement | null) => {
        if(el != null && this.props.scatterPlotData != null) {
            let firstRender = (this.container == null)
            this.container = await Plotly.react(el, this.props.scatterPlotData.data, this.props.scatterPlotData.layout)
            // Adding listeners for plotly events. Not doing this during componentDidMount because the element probably doesn't exist.
            if(firstRender){
                this.container!.on('plotly_selected', this.onPlotSelected)
                this.container!.on('plotly_deselect', this.onPlotDeselect)
            }
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

            scatterPlot = <div id="plotly-scatterplot" ref = {(el) => this.mountPlot(el)}/>
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