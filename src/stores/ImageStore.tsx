import { observable, 
    computed, 
    action } from "mobx"
import { ImageData } from "../lib/ImageData"
import { ImageSelection } from "../interfaces/ImageInterfaces"
import { SegmentationData } from "../lib/SegmentationData";
import { ScatterPlotData } from "../lib/ScatterPlotData"
import * as _ from "underscore"
import * as fs from 'fs'
import { ChannelName,
    PlotStatistic,
    PlotStatisticOptions,
    PlotTransform,
    PlotTransformOptions,
    D3BrushExtent, 
    SelectOption,
    LabelLayer } from "../interfaces/UIDefinitions"
import { SelectedRegionColor } from "../interfaces/UIDefinitions"
import * as Shortid from 'shortid'

export class ImageStore {

    constructor() {
        this.initialize()
    }
    
    private canvasImageData:ImageData | null = null

    @observable windowWidth: number | null
    @observable windowHeight: number | null
    
    @observable.ref imageData: ImageData | null
    @observable imageDataLoading: boolean

    @observable.ref segmentationData: SegmentationData | null

    // An array of the regions selected.
    @observable.ref selectedRegions: ImageSelection[]
    // ID of a region to be highlighted. Used when mousing over in list of selected regions.
    @observable.ref highlightedRegions: string[]

    // Array of segment IDs that have been hovered on the graph.
    @observable segmentsHoveredOnGraph: number[]

    @observable scatterPlotStatistic: PlotStatistic
    @observable scatterPlotTransform: PlotTransform

    @observable.ref extraData: Uint8ClampedArray | null

    @observable selectedDirectory: string | null
    @observable selectedSegmentationFile: string | null
    @observable.ref selectedPlotChannels: string[]
    
    @observable channelDomain: Record<ChannelName, [number, number]> 
    @observable channelSliderValue: Record<ChannelName, [number, number]>

    @observable segmentationAlpha: number

    @observable segmentationCentroidsVisible: boolean

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
                    this.selectedRegions
                )
            }
        }
        return null
    })

    @action initialize = () => {
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
        this.segmentationAlpha = 5
        this.segmentationCentroidsVisible = true
        this.channelMarker = {
            rChannel: null,
            gChannel: null,
            bChannel: null
        }
        this.selectedRegions = new Array<ImageSelection>()
        this.highlightedRegions = []
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
        this.setImageDataLoading(false)
    }

    @action updateSegmentationData() {
        if (this.selectedSegmentationFile != null) {
            this.segmentationData = new SegmentationData(this.selectedSegmentationFile)
        }
    }

    @action setSegmentationSliderValue = () => {
        return action((value: number) => {
            this.segmentationAlpha = value
        })
    }

    @action setCentroidVisibility = () => {
        return action((event: React.FormEvent<HTMLInputElement>) => {
            this.segmentationCentroidsVisible = event.currentTarget.checked
        })
    }

    @action clearSegmentationData = () => {
        return action(() => {
            this.selectedSegmentationFile = null
            this.segmentationData = null
            this.segmentationAlpha = 5
            this.selectedPlotChannels = []
        })
    }

    newROIName(){
        if (this.selectedRegions == null) return "Selection 1"
        return "Selection " + (this.selectedRegions.length + 1).toString()
    }

    @action addSelectedRegion = (selectedRegion: number[]|null, selectedSegments: number[]) => {
        let newRegion = {
            id: Shortid.generate(),
            selectedRegion: selectedRegion,
            selectedSegments: selectedSegments,
            name: this.newROIName(),
            notes: null,
            color: SelectedRegionColor,
            visible: true
        }
        this.selectedRegions = this.selectedRegions.concat([newRegion])
    }

    @action deleteSelectedRegion = (id: string) => {
        if(this.selectedRegions != null){
            this.selectedRegions = this.selectedRegions.filter(region => region.id != id);
        }
    }

    @action highlightSelectedRegion = (id: string) => {
        this.highlightedRegions = this.highlightedRegions.concat([id])
    }

    @action unhighlightSelectedRegion = (id: string) => {
        this.highlightedRegions = this.highlightedRegions.filter(regionId => regionId != id)
    }

    @action updateSelectedRegionName = (id: string, newName:string) => {
        if(this.selectedRegions != null){
            this.selectedRegions = this.selectedRegions.map(function(region) {
                if(region.id == id){
                    region.name = newName
                    return region
                }
                else {
                    return region
                }
            })
        }
    }

    @action updateSelectedRegionNotes = (id: string, newNotes:string) => {
        if(this.selectedRegions != null){
            this.selectedRegions = this.selectedRegions.map(function(region) {
                if(region.id == id){
                    region.notes = newNotes
                    return region
                }
                else {
                    return region
                }
            })
        }
    }

    @action updateSelectedRegionColor = (id: string, color: number) => {
        if(this.selectedRegions != null){
            this.selectedRegions = this.selectedRegions.map(function(region) {
                if(region.id == id){
                    region.color = color
                    return region
                }
                else {
                    return region
                }
            })
        }
    }

    @action updateSelectedRegionVisibility = (id: string, visible:boolean) => {
        console.log("Updating visibility of " + id + " to " + visible)
        if(this.selectedRegions != null){
            this.selectedRegions = this.selectedRegions.map(function(region) {
                if(region.id == id){
                    region.visible = visible
                    return region
                }
                else {
                    return region
                }
            })
        }
    }

    @action setAllSelectedRegionVisibility = (visible:boolean) => {
        if(this.selectedRegions != null){
            this.selectedRegions = this.selectedRegions.map(function(region) {
                region.visible = visible
                return region
            })
        }
    }

    @action exportSelectedRegions = (filename:string) => {
        if(this.selectedRegions != null){
            let exportingContent = JSON.stringify(this.selectedRegions)
            fs.writeFile(filename, exportingContent, 'utf8', function (err) {
                if (err) {
                    console.log("An error occured while writing regions of interest to file.");
                    return console.log(err);
                }
             
                console.log("Regions of interest file has been saved.");
            })
        }
    }

    @action importSelectedRegions = (filename:string) => {
        if(this.selectedRegions == null || this.selectedRegions.length == 0) {
            let importingContent = fs.readFileSync(filename, 'utf8')
            let importedRegions:ImageSelection[] = JSON.parse(importingContent)
            this.selectedRegions = importedRegions
        }
    }

    // Data comes from a Plotly event.
    // Points are the selected points.
    // No custom fields, so we are getting the segment id from the title text for the point.
    // Title text with segment id generated in ScatterPlotData.
    parsePlotlyEventData = (data: {points:any, event:any}) => {
        let selectedSegments:number[] = []
        if(data != null) {
            for (let point of data.points){
                let pointText = point.text
                let splitText:string[] = pointText.split(" ")
                let segmentId = Number(splitText[splitText.length - 1])
                selectedSegments.push(segmentId)
            }
        }
        return selectedSegments
    }

    @action setSegmentsSelectedOnGraph = (data: {points:any, event:any}) => {
        let selectedSegments = this.parsePlotlyEventData(data)
        this.addSelectedRegion(null, selectedSegments)
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

    @action setChannelMarker = (name: ChannelName) => {
        return action((x: SelectOption) => {
            // If the SelectOption has a value.
            if(x != null){
                this.channelMarker[name] = x.value
                // Setting the default slider/domain values to the min/max values from the image
                if(this.imageData != null){
                    let min = this.imageData.minmax[x.value].min
                    let max = this.imageData.minmax[x.value].max
                    this.channelDomain[name] = [min, max]
                    this.channelSliderValue[name] = [min, max]
                }
            // If SelectOption doesn't have a value the channel has been cleared and values should be reset.
            } else {
                this.channelMarker[name] = null
                this.channelDomain[name] = [0, 100]
                this.channelSliderValue[name] = [0, 100]
            }
        })
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