import { observable, 
    action,
    computed,
    autorun} from "mobx"
import { ImageData } from "../lib/ImageData"
import { SegmentationData } from "../lib/SegmentationData"
import { ScatterPlotData } from "../lib/ScatterPlotData"
import * as _ from "underscore"
import * as fs from 'fs'

import { ChannelName,
    D3BrushExtent, 
    SelectOption,
    LabelLayer } from "../interfaces/UIDefinitions"
import * as ConfigurationHelper from "../lib/ConfigurationHelper"
import { PopulationStore } from "./PopulationStore";
import { SelectedPopulation } from "../interfaces/ImageInterfaces"
import { PlotStore } from "./PlotStore";

export class ImageStore {

    constructor(populationStore: PopulationStore, plotStore: PlotStore) {
        this.initialize(populationStore, plotStore)
    }
    
    private canvasImageData:ImageData | null = null

    @observable.ref populationStore: PopulationStore
    @observable.ref plotStore: PlotStore

    @observable windowWidth: number | null
    @observable windowHeight: number | null
    
    @observable.ref imageData: ImageData | null
    @observable imageDataLoading: boolean

    @observable.ref segmentationData: SegmentationData | null

    @observable selectedDirectory: string | null
    @observable selectedSegmentationFile: string | null

    
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

    setScatterPlotData = autorun(() => {
        if(this.plotStore && this.plotStore.selectedPlotChannels.length == 2){
            let ch1 = this.plotStore.selectedPlotChannels[0]
            let ch2 = this.plotStore.selectedPlotChannels[1]
            if(this.imageData != null && this.segmentationData != null){
                this.plotStore.setScatterPlotData(new ScatterPlotData(ch1,
                    ch2,
                    this.imageData,
                    this.segmentationData,
                    this.plotStore.scatterPlotStatistic,
                    this.plotStore.scatterPlotTransform,
                    this.populationStore.selectedPopulations
                ))
            }
        }
    })

    channelSelectOptions = computed(() => {
        if(this.imageData) {
            return this.imageData.channelNames.map((s) => { return({value: s, label: s}) })
        } else {
            return []
        }
    })

    @action initialize = (populationStore: PopulationStore, plotStore: PlotStore) => {
        this.populationStore = populationStore
        this.plotStore = plotStore

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

    @action setSegmentationFillAlpha = (value: number) => {
        this.segmentationFillAlpha = value
    }

    @action setSegmentationOutlineAlpha = (value: number) => {
        this.segmentationOutlineAlpha = value
    }

    @action setCentroidVisibility = (visible: boolean) => {
        this.segmentationCentroidsVisible = visible
    }

    @action clearSegmentationData = () => {
        this.selectedSegmentationFile = null
        this.segmentationData = null
        this.segmentationFillAlpha = 0
        this.plotStore.clearSelectedPlotChannels()
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

    @action selectDirectory = (dirName : string) => {
        this.selectedDirectory = dirName
    }

    @action setSegmentationData = (data: SegmentationData) => {
        this.segmentationData = data
    }

    @action setSegmentationFile = (fName: string) => {
        this.selectedSegmentationFile = fName
        this.setSegmentationData(SegmentationData.newFromFile(this.selectedSegmentationFile))
    }

    @action exportUserData = (filename:string) => {
        let exportingContent = {populations: [] as SelectedPopulation[], segmentation: {}}
        // Prepare segmentation data for export
        // Dump Float32Array to normal array as JSON.stringify/parse don't support typed arrays.
        if(this.segmentationData != null) {
            exportingContent.segmentation = {
                width: this.segmentationData.width,
                height: this.segmentationData.height,
                data: Array.from(this.segmentationData.data)
            }
        }
        // Prepare selected populations for export
        if(this.populationStore.selectedPopulations != null) exportingContent.populations = this.populationStore.selectedPopulations

        let exportingString = JSON.stringify(exportingContent)

        // Write data to file
        fs.writeFile(filename, exportingString, 'utf8', function (err) {
            if (err) {
                console.log("An error occured while writing regions of interest to file.")
                return console.log(err)
            }
            console.log("Regions of interest file has been saved.")
        })
    }

    // Imports segmentation data and selected populations from file
    // TODO: Some sanity checks to make sure imported data makes sense
    @action importUserData = (filename:string) => {
        let importingContent = JSON.parse(fs.readFileSync(filename, 'utf8'))

        // Import Segmentation Data
        let importingSegmentation = importingContent.segmentation
        let importedDataArray = Float32Array.from(importingSegmentation.data)
        let importedSegmentationData = new SegmentationData(importingSegmentation.width, importingSegmentation.height, importedDataArray)
        this.setSegmentationData(importedSegmentationData)

        // Import saved populations
        this.populationStore.setSelectedPopulations(importingContent.populations)
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