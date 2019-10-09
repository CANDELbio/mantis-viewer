import * as React from 'react'
import { observer } from 'mobx-react'
import { TextArea, RangeSlider, Slider } from '@blueprintjs/core'
import Select from 'react-select'
import { ChannelName, ImageChannels } from '../definitions/UIDefinitions'
import { SelectStyle, getSelectedOptions, generateSelectOptions } from '../lib/SelectHelper'
import { SelectOption } from '../definitions/UIDefinitions'
import { Input, Label } from 'reactstrap'

export interface PreferencesProps {
    maxImageSetsInMemory: number
    setMaxImageSetsInMemory: (max: number) => void
    defaultSegmentationBasename: string | null
    setDefaultSegmentation: (basename: string) => void
    defaultChannelMarkers: Record<ChannelName, string[]>
    setDefaultChannelMarkers: (channel: ChannelName, markers: string[]) => void
    defaultChannelDomains: Record<ChannelName, [number, number]>
    setDefaultChannelDomain: (channel: ChannelName, domain: [number, number]) => void
    useAnyMarker: Record<ChannelName, boolean>
    setUseAnyMarker: (channel: ChannelName, useAnyMarker: boolean) => void
}

interface PlotControlsState {
    selectedChannel: ChannelName
}

@observer
export class Preferences extends React.Component<PreferencesProps, PlotControlsState> {
    public constructor(props: PreferencesProps) {
        super(props)
    }

    private imageChannelsForControls = ImageChannels.slice().reverse()

    public state = {
        selectedChannel: 'rChannel' as ChannelName,
    }

    private onSegmentationSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.props.setDefaultSegmentation(event.target.value)
    }

    private onSelectedChannelChange = (v: SelectOption) => this.setState({ selectedChannel: v.value as ChannelName })

    private onDefaultChannelMarkersChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        let markers = event.target.value.split(',').map((s: string) => s.trim())
        this.props.setDefaultChannelMarkers(this.state.selectedChannel, markers)
    }

    private onChannelDomainChange = (v: [number, number]) =>
        this.props.setDefaultChannelDomain(this.state.selectedChannel, [v[0] / 100, v[1] / 100])

    private onUseAnyMarkerChange = (event: React.ChangeEvent<HTMLInputElement>) =>
        this.props.setUseAnyMarker(this.state.selectedChannel, event.target.checked)

    public render(): React.ReactElement {
        let selectedChannel = this.state.selectedChannel
        let channelOptions = generateSelectOptions(this.imageChannelsForControls)
        let selectedValue = getSelectedOptions(selectedChannel, channelOptions)

        let defaultChannelMarkersValue = this.props.defaultChannelMarkers[selectedChannel].join(',')
        let defaultChannelDomain = this.props.defaultChannelDomains[selectedChannel]
        return (
            <div>
                <Label>Maximum image sets in memory</Label>
                <Slider
                    min={1}
                    max={10}
                    stepSize={1}
                    value={this.props.maxImageSetsInMemory}
                    onChange={this.props.setMaxImageSetsInMemory}
                />
                <Label>Default Segmentation Filename</Label>
                <Input
                    value={this.props.defaultSegmentationBasename ? this.props.defaultSegmentationBasename : ''}
                    onChange={this.onSegmentationSelect}
                />
                <Label>Channel</Label>
                <Select
                    value={selectedValue}
                    options={channelOptions}
                    onChange={this.onSelectedChannelChange}
                    clearable={false}
                    styles={SelectStyle}
                />
                <br />
                <Label>Default Brightness for Channel</Label>
                <RangeSlider
                    min={0}
                    max={100}
                    value={[defaultChannelDomain[0] * 100, defaultChannelDomain[1] * 100]}
                    labelStepSize={10}
                    labelPrecision={0}
                    stepSize={1}
                    onChange={this.onChannelDomainChange}
                />
                <Label>Default Markers for Channel (Comma separated, in order of priority)</Label>
                <TextArea
                    value={defaultChannelMarkersValue}
                    onChange={this.onDefaultChannelMarkersChange}
                    fill={true}
                />
                <Label check style={{ paddingTop: '10px', paddingLeft: '20px' }}>
                    <Input
                        type="checkbox"
                        onChange={this.onUseAnyMarkerChange}
                        checked={this.props.useAnyMarker[this.state.selectedChannel]}
                    />
                    Use Any Marker if Defaults Not Present
                </Label>
            </div>
        )
    }
}
