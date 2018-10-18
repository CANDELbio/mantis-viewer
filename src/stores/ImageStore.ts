import { observable, 
    computed, 
    action } from "mobx"
import { ImageData } from "../lib/ImageData"
import { SegmentationData } from "../lib/SegmentationData"
import { ScatterPlotData } from "../lib/ScatterPlotData"
import * as _ from "underscore"

import { ChannelName,
    PlotStatistic,
    PlotStatisticOptions,
    PlotTransform,
    PlotTransformOptions,
    D3BrushExtent, 
    SelectOption,
    LabelLayer } from "../interfaces/UIDefinitions"
import { ConfigurationHelper } from "../lib/ConfigurationHelper"
import { PopulationStore } from "./PopulationStore";

export class ImageStore {

    constructor(populationStore: PopulationStore) {
        this.initialize(populationStore)
    }
    
    private canvasImageData:ImageData | null = null

    @observable.ref populationStore: PopulationStore

    @observable windowWidth: number | null
    @observable windowHeight: number | null
    
    @observable.ref imageData: ImageData | null
    @observable imageDataLoading: boolean

    @observable.ref segmentationData: SegmentationData | null

    // Array of segment IDs that have been hovered on the graph.
    @observable segmentsHoveredOnGraph: number[]

    @observable scatterPlotStatistic: PlotStatistic
    @observable scatterPlotTransform: PlotTransform

    @observable selectedDirectory: string | null
    @observable selectedSegmentationFile: string | null
    @observable.ref selectedPlotChannels: string[]
    
    @observable channelDomain: Record<ChannelName, [number, number]> 
    @observable channelSliderValue: Record<ChannelName, [number, number]>

    @observable segmentationFillAlpha: number
    @observable segmentationOutlineAlpha: number
    @observable segmentationCentroidsVisible: boolean

    @observable segmentationOutlinesVisible: boolean

    @observable channelMarker: Record<ChannelName, string | null>

    @observable currentSelection: {
        x: [number, number]
        y: [number, number]
    } | null

    scatterPlotData = computed(() => {
        if(this.selectedPlotChannels.length == 2){
            let ch1 = this.selectedPlotChannels[0]
            let ch2 = this.selectedPlotChannels[1]
            if(this.imageData != null && this.segmentationData != null){
                return new ScatterPlotData(ch1,
                    ch2,
                    this.imageData,
                    this.segmentationData,
                    this.scatterPlotStatistic,
                    this.scatterPlotTransform,
                    this.populationStore.selectedPopulations
                )
            }
        }
        return null
    })

    @action initialize = (populationStore: PopulationStore) => {
        this.populationStore = populationStore
        this.scatterPlotStatistic = PlotStatisticOptions[0].value as PlotStatistic
        this.scatterPlotTransform = PlotTransformOptions[0].value as PlotTransform
        this.selectedPlotChannels = []
        this.channelDomain = {
            rChannel: [0, 100],
            gChannel: [0, 100],
            bChannel: [0, 100]
        }
        this.channelSliderValue = {
            rChannel: [0, 100],
            gChannel: [0, 100],
            bChannel: [0, 100]
        }
        this.segmentationFillAlpha = 0
        this.segmentationOutlineAlpha = 1
        this.segmentationCentroidsVisible = false
        this.segmentationOutlinesVisible = true

        this.channelMarker = {
            rChannel: null,
            gChannel: null,
            bChannel: null
        }
        this.segmentsHoveredOnGraph = []

        this.imageDataLoading = false
    }

    @action setWindowDimensions = (width: number, height: number) => {
        this.windowWidth = width
        this.windowHeight = height
    }

    @action setCurrentSelection(extent: D3BrushExtent) {
        this.currentSelection = {
            x: [extent[0][0], extent[1][0]],
            y: [extent[0][1], extent[1][1]]
        }
    }

    @action setImageDataLoading(status: boolean){
        this.imageDataLoading = status
    }

    @action setImageData(data: ImageData){
        this.imageData = data
        this.setChannelMarkerDefaults()
        this.setImageDataLoading(false)
    }

    @action clearImageData(){
        for(let s of ['rChannel', 'bChannel', 'gChannel']){
            let curChannel = s as ChannelName
            this.unsetChannelMarker(curChannel)
        }
        this.clearSegmentationData()
        this.populationStore.clearSelectedPopulations()
        this.imageData = null
    }

    @action updateSegmentationData() {
        if (this.selectedSegmentationFile != null) {
            this.segmentationData = new SegmentationData(this.selectedSegmentationFile)
        }
    }

    @action setSegmentationFillAlpha = (value: number) => {
        this.segmentationFillAlpha = value
    }

    @action setSegmentationOutlineAlpha = (value: number) => {
        this.segmentationOutlineAlpha = value
    }

    @action setCentroidVisibility = () => {
        return action((event: React.FormEvent<HTMLInputElement>) => {
            this.segmentationCentroidsVisible = event.currentTarget.checked
        })
    }

    @action clearSegmentationData = () => {
        this.selectedSegmentationFile = null
        this.segmentationData = null
        this.segmentationFillAlpha = 0
        this.selectedPlotChannels = []
    }

    @action clearSegmentationDataCallback = () => {
        return this.clearSegmentationData
    }

    // Data comes from a Plotly event.
    // Points are the selected points.
    // No custom fields, so we are getting the segment id from the title text for the point.
    // Title text with segment id generated in ScatterPlotData.
    parsePlotlyEventData = (data: {points:any, event:any}) => {
        let selectedSegments:number[] = []
        if(data != null) {
            if(data.points != null && data.points.length > 0){
                for (let point of data.points){
                    let pointText = point.text
                    let splitText:string[] = pointText.split(" ")
                    let segmentId = Number(splitText[splitText.length - 1])
                    selectedSegments.push(segmentId)
                }
            }
        }
        return selectedSegments
    }

    @action setSegmentsSelectedOnGraph = (data: {points:any, event:any}) => {
        let selectedSegments = this.parsePlotlyEventData(data)
        this.populationStore.addSelectedPopulation(null, selectedSegments)
    }

    @action setSegmentsHoveredOnGraph = (data: {points: any, event:any}) => {
        this.segmentsHoveredOnGraph = this.parsePlotlyEventData(data)
    }

    @action clearSegmentsHoveredOnGraph = () => {
        this.segmentsHoveredOnGraph = []
    }

    @action setChannelDomain = (name: ChannelName) => {
        return action((value: [number, number]) => {
            this.channelDomain[name] = value
        })
    }

    @action setChannelSliderValue = (name: ChannelName) => {
        return action((value: [number, number]) => {
            this.channelSliderValue[name] = value
        })
    }

    @action unsetChannelMarker = (channelName: ChannelName) => {
        this.channelMarker[channelName] = null
        this.channelDomain[channelName] = [0, 100]
        this.channelSliderValue[channelName] = [0, 100]
    }

    @action setChannelMarker = (channelName: ChannelName, markerName: string) => {
        this.channelMarker[channelName] = markerName
        // Setting the default slider/domain values to the min/max values from the image
        if(this.imageData != null){
            let min = this.imageData.minmax[markerName].min
            let max = this.imageData.minmax[markerName].max
            this.channelDomain[channelName] = [min, max]
            this.channelSliderValue[channelName] = [min, max]
        }
    }

    @action setChannelMarkerFromSelect = (name: ChannelName) => {
        return action((x: SelectOption) => {
            // If the SelectOption has a value.
            if(x != null){
                this.setChannelMarker(name, x.value)
            // If SelectOption doesn't have a value the channel has been cleared and values should be reset.
            } else {
                this.unsetChannelMarker(name)
            }
        })
    }

    @action setChannelMarkerDefaults = () => {
        if(this.imageData != null) {
            let defaultValues = ConfigurationHelper.getDefaultChannelMarkers(this.imageData.channelNames)
            for (let v in defaultValues) {
                let channelName = v as ChannelName
                let markerName = defaultValues[channelName]
                if(markerName != null) this.setChannelMarker(channelName, markerName)
            }
        }
    }

    @action setSelectedPlotChannels = (x: SelectOption[]) => {
        this.selectedPlotChannels = _.pluck(x, "value")
    }

    @action setScatterPlotStatistic = (x: SelectOption) => {
        if (x != null){
            this.scatterPlotStatistic = x.value as PlotStatistic
        }
    }

    @action setScatterPlotTransform = (x: SelectOption) => {
        if (x != null){
            this.scatterPlotTransform = x.value as PlotTransform
        }
    }    

    @action selectDirectory = (dirName : string) => {
        this.selectedDirectory = dirName
    }

    @action selectSegmentationFile = (fName: string) => {
        this.selectedSegmentationFile = fName
        this.updateSegmentationData()
    }

    @action setCanvasImageData = (data:ImageData) => {
        this.canvasImageData = data
    }

    @action doSegmentation = () => {
        console.log("segmenting")
        if(this.canvasImageData != null) {
            let xhr = new XMLHttpRequest
            xhr.open("POST", "http://127.0.0.1:5000/segmentation", true)
            xhr.responseType = "arraybuffer"
            xhr.onload = action((e) => {
                if (xhr.readyState === 4) {
                    console.log(xhr)
                    let v = new Uint8ClampedArray(xhr.response)
                    let layer = new LabelLayer()
                    layer.data = v
                    layer.width = this.canvasImageData!.width
                    layer.height = this.canvasImageData!.height
                    layer.name = "test segmentation"
                    layer.visible = true
                    // this.labelsLayers.push(layer)
                    //this.labelsLayers = [v]
                    console.log(v)
                }
            })

            xhr.setRequestHeader("width", this.canvasImageData.width.toString())
            xhr.setRequestHeader("height", this.canvasImageData.height.toString())
            xhr.send(this.canvasImageData.data.buffer)
        }
    }
}