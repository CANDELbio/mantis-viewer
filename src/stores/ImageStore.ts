import { observable, 
    action,
    computed } from "mobx"
import * as _ from "underscore"

import { ImageData } from "../lib/ImageData"
import { SegmentationData } from "../lib/SegmentationData"
import { ChannelName,
    D3BrushExtent, 
    SelectOption,
    LabelLayer } from "../interfaces/UIDefinitions"
import * as ConfigurationHelper from "../lib/ConfigurationHelper"

export class ImageStore {

    constructor() {
        this.initialize()
    }
    
    private canvasImageData:ImageData | null = null

    @observable windowWidth: number | null
    @observable windowHeight: number | null
    
    @observable.ref imageData: ImageData | null
    @observable imageDataLoading: boolean

    @observable imageExportFilename: string | null

    @observable.ref segmentationData: SegmentationData | null

    @observable selectedDirectory: string | null
    @observable selectedSegmentationFile: string | null

    @observable channelDomain: Record<ChannelName, [number, number]> 

    @observable segmentationFillAlpha: number
    @observable segmentationOutlineAlpha: number
    @observable segmentationCentroidsVisible: boolean

    @observable segmentationOutlinesVisible: boolean

    @observable channelMarker: Record<ChannelName, string | null>

    @observable currentSelection: {
        x: [number, number]
        y: [number, number]
    } | null

    channelSelectOptions = computed(() => {
        if(this.imageData) {
            return this.imageData.channelNames.map((s) => { return({value: s, label: s}) })
        } else {
            return []
        }
    })

    @action initialize = () => {
        this.channelDomain = {
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

    @action setImageData(data: ImageData,
        initialChannelMarkerValues?: Record<ChannelName, string | null> | null,
        initialChannelDomainPercentages?: Record<ChannelName, [number, number]> | null)
    {
        this.imageData = data
        // If we have initial channel marker values, attempt to copy them. Otherwise use the defaults.
        if(initialChannelMarkerValues && initialChannelMarkerValues != null){
            this.copyChannelMarkerValues(initialChannelMarkerValues)
        } else {
            this.setChannelMarkerDefaults()
        }

        if(initialChannelDomainPercentages && initialChannelDomainPercentages != null){
            this.setChannelDomainFromPercentages(initialChannelDomainPercentages)
        }

        this.setImageDataLoading(false)
    }

    @action clearImageData(){
        for(let s of ['rChannel', 'bChannel', 'gChannel']){
            let curChannel = s as ChannelName
            this.unsetChannelMarker(curChannel)
        }
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
    }

    getChannelDomainPercentages = () => {
        let channelDomainPercentages:Record<ChannelName, [number, number]>  = {
            rChannel: [0, 1],
            gChannel: [0, 1],
            bChannel: [0, 1]
        }

        if(this.imageData != null){
            for(let s in this.channelDomain){
                let curChannel = s as ChannelName
                let channelMarker = this.channelMarker[curChannel]
                if(channelMarker != null){
                    let channelMax = this.imageData.minmax[channelMarker].max
                    let minPercentage = this.channelDomain[curChannel][0]/channelMax
                    let maxPercentage = this.channelDomain[curChannel][1]/channelMax
                    channelDomainPercentages[curChannel] = [minPercentage, maxPercentage]
                }
            }
        }

        return channelDomainPercentages
    }

    // Sets channel domain values as a percentage of the channelMax.
    @action setChannelDomainFromPercentages = (percentages: Record<ChannelName, [number, number]>) => {
        if(this.imageData != null){
            for(let s in this.channelDomain){
                let curChannel = s as ChannelName
                let channelMarker = this.channelMarker[curChannel]
                if(channelMarker != null){
                    let channelMax = this.imageData.minmax[channelMarker].max
                    let minValue  = percentages[curChannel][0] * channelMax
                    let maxValue  = percentages[curChannel][1] * channelMax
                    this.channelDomain[curChannel] = [minValue, maxValue]
                }
            }
        }
    }

    @action setChannelDomain = (name: ChannelName) => {
        return action((value: [number, number]) => {
            this.channelDomain[name] = value
        })
    }

    @action unsetChannelMarker = (channelName: ChannelName) => {
        this.channelMarker[channelName] = null
        this.channelDomain[channelName] = [0, 100]
    }

    @action setChannelMarker = (channelName: ChannelName, markerName: string) => {
        this.channelMarker[channelName] = markerName
        // Setting the default slider/domain values to the min/max values from the image
        if(this.imageData != null){
            let min = this.imageData.minmax[markerName].min
            let max = this.imageData.minmax[markerName].max
            this.channelDomain[channelName] = [min, max]
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

    @action copyChannelMarkerValues = (values: Record<ChannelName, string | null>) => {
        // Only copy if we have image data. Otherwise we can't verify if we have the channels indicated in values.
        if(this.imageData != null && values != null) {
            for (let s in values) {
                let channelName = s as ChannelName
                let channelValue = values[channelName] // The file selected
                if(channelValue != null){
                    if(this.imageData.channelNames.indexOf(channelValue) != -1){
                        // If the file selected is not null and the destination has a file with the same name set that
                        this.setChannelMarker(channelName, channelValue)
                    } else {
                        // Otherwise unset that channel for the destination
                        this.unsetChannelMarker(channelName)
                    }
                } else {
                    // Unset the channel for the destination if it's unset in the source
                    this.unsetChannelMarker(channelName)
                }
            }
        }
    }

    @action selectDirectory = (dirName: string) => {
        this.selectedDirectory = dirName
    }

    @action setSegmentationData = (data: SegmentationData) => {
        this.segmentationData = data
    }

    @action setSegmentationFile = (fName: string) => {
        this.selectedSegmentationFile = fName
        this.setSegmentationData(SegmentationData.newFromFile(this.selectedSegmentationFile))
    }

    @action setImageExportFilename = (fName: string) => {
        this.imageExportFilename = fName
    }

    @action clearImageExportFilename = () => {
        this.imageExportFilename = null
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