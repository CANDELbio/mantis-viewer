import { observable, action, autorun } from 'mobx'
import * as path from 'path'

import { ImageData } from '../lib/ImageData'
import { SegmentationData } from '../lib/SegmentationData'
import { SegmentationStatistics } from '../lib/SegmentationStatistics'
import { ImageChannels, ChannelName } from '../definitions/UIDefinitions'

export class ImageStore {
    public constructor() {
        this.initialize()
    }

    @observable.ref public imageData: ImageData | null
    @observable public imageDataLoading: boolean

    @observable public imageExportFilename: string | null

    @observable.ref public segmentationData: SegmentationData | null
    @observable.ref public segmentationStatistics: SegmentationStatistics | null

    @observable public selectedDirectory: string | null
    @observable public selectedSegmentationFile: string | null

    @observable public channelDomain: Record<ChannelName, [number, number]>

    @observable.ref public markerSelectOptions: { value: string; label: string }[]

    @observable public segmentationFillAlpha: number
    @observable public segmentationOutlineAlpha: number
    @observable public segmentationCentroidsVisible: boolean

    @observable public channelMarker: Record<ChannelName, string | null>

    @observable public message: string | null

    @observable public currentSelection: {
        x: [number, number]
        y: [number, number]
    } | null

    private calculateSegmentationStatistics = autorun(() => {
        if (this.imageData && this.segmentationData) {
            let statistics = new SegmentationStatistics()
            statistics.generateStatistics(this.imageData, this.segmentationData, this.setSegmentationStatistics)
        } else {
            this.setSegmentationStatistics(null)
        }
    })

    private setMarkerSelectOptions = autorun(() => {
        if (this.imageData) {
            this.updateMarkerSelectOption()
        }
    })

    @action private initialize = () => {
        this.channelDomain = {
            rChannel: [0, 100],
            gChannel: [0, 100],
            bChannel: [0, 100],
            cChannel: [0, 100],
            mChannel: [0, 100],
            yChannel: [0, 100],
            kChannel: [0, 100],
        }

        this.markerSelectOptions = []

        this.segmentationFillAlpha = 0
        this.segmentationOutlineAlpha = 0.7
        this.segmentationCentroidsVisible = false

        this.channelMarker = {
            rChannel: null,
            gChannel: null,
            bChannel: null,
            cChannel: null,
            mChannel: null,
            yChannel: null,
            kChannel: null,
        }

        this.imageDataLoading = false
    }

    @action public setImageDataLoading = (status: boolean) => {
        this.imageDataLoading = status
    }

    @action public setImageData = (data: ImageData) => {
        this.imageData = data
        this.setImageDataLoading(false)
    }

    @action public clearImageData = () => {
        for (let s of ImageChannels) {
            let curChannel = s as ChannelName
            this.unsetChannelMarker(curChannel)
        }
        this.imageData = null
    }

    @action public setSegmentationFillAlpha = (value: number) => {
        this.segmentationFillAlpha = value
    }

    @action public setSegmentationOutlineAlpha = (value: number) => {
        this.segmentationOutlineAlpha = value
    }

    @action public setCentroidVisibility = (visible: boolean) => {
        this.segmentationCentroidsVisible = visible
    }

    public getChannelDomainPercentage = (name: ChannelName) => {
        let percentages: [number, number] = [0, 1]

        if (this.imageData != null) {
            let channelMarker = this.channelMarker[name]
            if (channelMarker != null) {
                let channelMax = this.imageData.minmax[channelMarker].max
                let minPercentage = this.channelDomain[name][0] / channelMax
                let maxPercentage = this.channelDomain[name][1] / channelMax
                percentages = [minPercentage, maxPercentage]
            }
        }

        return percentages
    }

    @action public setChannelDomain = (name: ChannelName, domain: [number, number]) => {
        // Only set the domain if min is less than the max oherwise WebGL will crash
        if (domain[0] < domain[1]) this.channelDomain[name] = domain
    }

    @action public setChannelDomainFromPercentage = (name: ChannelName, domain: [number, number]) => {
        let channelMarker = this.channelMarker[name]
        if (this.imageData != null && channelMarker != null) {
            let channelMax = this.imageData.minmax[channelMarker].max
            let minValue = domain[0] * channelMax
            let maxValue = domain[1] * channelMax
            this.channelDomain[name] = [minValue, maxValue]
        }
    }

    @action public unsetChannelMarker = (channelName: ChannelName) => {
        this.channelMarker[channelName] = null
        this.channelDomain[channelName] = [0, 100]
    }

    @action public setChannelMarker = (channelName: ChannelName, markerName: string) => {
        this.channelMarker[channelName] = markerName
        // Setting the default slider/domain values to the min/max values from the image
        if (this.imageData != null) {
            let min = this.imageData.minmax[markerName].min
            let max = this.imageData.minmax[markerName].max
            this.channelDomain[channelName] = [min, max]
        }
    }

    @action public selectDirectory = (dirName: string) => {
        this.selectedDirectory = dirName
    }

    @action public setSegmentationData = (data: SegmentationData) => {
        this.segmentationData = data
    }

    @action public clearSegmentationData = () => {
        this.selectedSegmentationFile = null
        this.segmentationData = null
        this.segmentationFillAlpha = 0
    }

    @action public setSegmentationStatistics = (statistics: SegmentationStatistics | null) => {
        this.segmentationStatistics = statistics
    }

    @action public clearSegmentationStatistics = () => {
        this.segmentationStatistics = null
    }

    @action public removeMarker = (markerName: string) => {
        if (this.imageData != null && markerName in this.imageData.data) {
            this.setMessage(
                markerName +
                    ' is being removed from the list of available markers since it is being loaded as segmentation data.',
            )
            // Unset the marker if it is being used
            for (let s of ImageChannels) {
                let curChannel = s as ChannelName
                if (this.channelMarker[curChannel] == markerName) this.unsetChannelMarker(curChannel)
            }
            // Delete it from image data
            this.imageData.removeMarker(markerName)
            this.updateMarkerSelectOption()
        }
    }

    @action public setSegmentationFile = (fName: string) => {
        this.selectedSegmentationFile = fName
        let basename = path.parse(fName).name
        this.removeMarker(basename)
        let segmentationData = new SegmentationData()
        segmentationData.loadFile(fName, this.setSegmentationData)
    }

    @action public setImageExportFilename = (fName: string) => {
        this.imageExportFilename = fName
    }

    @action public clearImageExportFilename = () => {
        this.imageExportFilename = null
    }

    @action public setMessage = (message: string) => {
        this.message = message
    }

    @action public clearMessage = () => {
        this.message = null
    }

    // Somewhat hacky feeling workaround
    // markerSelectOptions used to be computed, but was not refreshing when a marker was being removed (for segmentation data)
    // Moved it here so that it can be called manually when we remove the segmentation data tiff from image data.
    @action public updateMarkerSelectOption = () => {
        if (this.imageData) {
            this.markerSelectOptions = this.imageData.markerNames.map(s => {
                return { value: s, label: s }
            })
        } else {
            this.markerSelectOptions = []
        }
    }
}
