import { observable, 
    action,
    computed } from "mobx"
import * as _ from "underscore"

import { ImageData } from "../lib/ImageData"
import { SegmentationData } from "../lib/SegmentationData"
import { ChannelName,
    D3BrushExtent, 
    LabelLayer } from "../interfaces/UIDefinitions"

export class ImageStore {

    constructor() {
        this.initialize()
    }
    
    private canvasImageData:ImageData | null = null
    
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
        this.segmentationOutlineAlpha = 0.7
        this.segmentationCentroidsVisible = false
        this.segmentationOutlinesVisible = true

        this.channelMarker = {
            rChannel: null,
            gChannel: null,
            bChannel: null
        }

        this.imageDataLoading = false
    }

    @action setCurrentSelection = (extent: D3BrushExtent) => {
        this.currentSelection = {
            x: [extent[0][0], extent[1][0]],
            y: [extent[0][1], extent[1][1]]
        }
    }

    @action setImageDataLoading = (status: boolean) => {
        this.imageDataLoading = status
    }

    @action setImageData = (data: ImageData) => {
        this.imageData = data
        this.setImageDataLoading(false)
    }

    @action clearImageData = () => {
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

    getChannelDomainPercentage = (name: ChannelName) => {
        let percentages:[number, number] = [0, 1]

        if(this.imageData != null){
                let channelMarker = this.channelMarker[name]
                if(channelMarker != null){
                    let channelMax = this.imageData.minmax[channelMarker].max
                    let minPercentage = this.channelDomain[name][0]/channelMax
                    let maxPercentage = this.channelDomain[name][1]/channelMax
                    percentages = [minPercentage, maxPercentage]
                }
        }

        return percentages
    }

    @action setChannelDomain = (name: ChannelName, domain:[number, number]) => {
        // Only set the domain if min is less than the max oherwise WebGL will crash
        if(domain[0] < domain[1]) this.channelDomain[name] = domain
    }

    @action setChannelDomainFromPercentage = (name: ChannelName, domain:[number, number]) => {
        let channelMarker = this.channelMarker[name]
        if(this.imageData != null && channelMarker != null){
            let channelMax = this.imageData.minmax[channelMarker].max
            let minValue  = domain[0] * channelMax
            let maxValue  = domain[1] * channelMax
            this.channelDomain[name] = [minValue, maxValue]
        }
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

    @action selectDirectory = (dirName: string) => {
        this.selectedDirectory = dirName
    }

    @action setSegmentationData = (data: SegmentationData) => {
        this.segmentationData = data
    }

    @action setSegmentationFile = (fName: string) => {
        this.selectedSegmentationFile = fName
        let segmentationData = new SegmentationData()
        segmentationData.loadFile(fName, this.setSegmentationData)
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