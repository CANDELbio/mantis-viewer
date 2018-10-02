// Draws some inspiration from https://github.com/davidctj/react-plotlyjs-ts
// Might be able to use this in the future or to make this component more React-y
import * as React from "react"
import { ScatterPlotData } from "../lib/ScatterPlotData"
import Select from 'react-select'
import { SelectOption } from "../interfaces/UIDefinitions"
import { observer } from "mobx-react"
import * as Plotly from 'plotly.js'
import { PlotStatisticOptions,
    PlotTransformOptions } from "../interfaces/UIDefinitions"

interface ScatterPlotProps {
    channelSelectOptions: {value: string, label:string}[]
    selectedPlotChannels: string[]
    setSelectedPlotChannels: ((x: SelectOption[]) => void)
    selectedStatistic: string
    setSelectedStatistic: ((x: SelectOption) => void)
    selectedTransform: string
    setSelectedTransform: ((x: SelectOption) => void)
    setSelectedPoints: ((data: {points:any, event:any}) => void)
    setHoveredPoints: ((data: {points:any, event:any}) => void)
    setUnHoveredPoints: (() => void)
    scatterPlotData: ScatterPlotData | null
    windowWidth: number | null
}

@observer
export class ScatterPlot extends React.Component<ScatterPlotProps, {}> {
    public container: Plotly.PlotlyHTMLElement | null = null
    
    channelSelectOptions: {value: string, label:string}[]

    constructor(props: ScatterPlotProps) {
        super(props)
    }

    onPlotChannelSelect = (x: SelectOption[]) => this.props.setSelectedPlotChannels(x)
    onStatisticSelect = (x: SelectOption) => this.props.setSelectedStatistic(x)
    onTransformSelect = (x: SelectOption) => this.props.setSelectedTransform(x)
    onPlotSelected = (data: {points:any, event:any}) => this.props.setSelectedPoints(data)
    onHover = (data: {points:any, event:any}) => this.props.setHoveredPoints(data)
    onUnHover = () => this.props.setUnHoveredPoints()

    public componentWillUnmount() {
        this.cleanupPlotly()
    }

    cleanupPlotly() {
        if (this.container){
            Plotly.purge(this.container)
            this.container = null
        }
    }

    mountPlot = async (el:HTMLElement | null) => {
        if(el != null && this.props.scatterPlotData != null) {
            let firstRender = (this.container == null)
            this.container = await Plotly.react(el, this.props.scatterPlotData.data, this.props.scatterPlotData.layout)
            // Resize the plot to fit the container
            // Might need to remove. Seems that if this fires too much can cause weirdness with WebGL contexts.
            Plotly.Plots.resize(this.container)
            // Adding listeners for plotly events. Not doing this during componentDidMount because the element probably doesn't exist.
            if(firstRender){
                this.container!.on('plotly_selected', this.onPlotSelected)
                this.container!.on('plotly_hover', this.onHover)
                this.container!.on('plotly_unhover', this.onUnHover)
            }
        }
    }

    render() {
        // TODO: Feels a bit hacky. Find a better solution.
        // Dereferencing here so we re-render on resize
        let windowWidth = this.props.windowWidth

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
        let transformControls = null
        if (this.props.scatterPlotData != null) {
            statisticControls = <Select
                value = {this.props.selectedStatistic}
                options = {PlotStatisticOptions}
                onChange = {this.onStatisticSelect}
                clearable = {false}
            />

            transformControls = <Select
                value = {this.props.selectedTransform}
                options = {PlotTransformOptions}
                onChange = {this.onTransformSelect}
                clearable = {false}
            />

            scatterPlot = <div id="plotly-scatterplot" ref = {(el) => this.mountPlot(el)}/>
        } else {
            this.cleanupPlotly()
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
                {transformControls}
            </div>
        )
    }
}