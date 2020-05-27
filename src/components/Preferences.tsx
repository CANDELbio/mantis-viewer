import * as React from 'react'
import { observer } from 'mobx-react'
import { TextArea, RangeSlider, Slider, Checkbox } from '@blueprintjs/core'
import Select from 'react-select'
import { ChannelName, ImageChannels, ChannelColorNameMap } from '../definitions/UIDefinitions'
import { SelectStyle, SelectTheme, getSelectedOptions, generateSelectOptions } from '../lib/SelectHelper'
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
    rememberRecalculate: boolean
    setRememberRecalculate: (value: boolean) => void
    recalculate: boolean
    setRecalculate: (value: boolean) => void
    rememberClearDuplicates: boolean
    setRememberClearDuplicates: (value: boolean) => void
    clearDuplicates: boolean
    setClearDuplicates: (value: boolean) => void
}

// Storing defaultChannelDomains and maxImageSetsInMemory in state so that the
// elements/components can read and write values to state with onChange and then
// call the props setMaxImageSetsInMemory and setDefaultChannelDomain functions
// onRelease which flush the values to file. If we don't, then the sliders
// are laggy as every change gets flushed to file.
interface PlotControlsState {
    selectedChannel: ChannelName
    defaultChannelDomains: Record<ChannelName, [number, number]> | undefined
    maxImageSetsInMemory: number | undefined
}

@observer
export class Preferences extends React.Component<PreferencesProps, PlotControlsState> {
    public constructor(props: PreferencesProps) {
        super(props)
        this.state.defaultChannelDomains = props.defaultChannelDomains
        this.state.maxImageSetsInMemory = props.maxImageSetsInMemory
    }

    private imageChannelsForControls = ImageChannels.slice().reverse()

    public state: PlotControlsState = {
        selectedChannel: 'rChannel' as ChannelName,
        defaultChannelDomains: undefined,
        maxImageSetsInMemory: undefined,
    }

    private channelTransform = (channel: ChannelName): string => {
        return ChannelColorNameMap[channel]
    }

    private onSegmentationSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
        this.props.setDefaultSegmentation(event.target.value)
    }

    private onSelectedChannelChange = (v: SelectOption): void =>
        this.setState({ selectedChannel: v.value as ChannelName })

    private onDefaultChannelMarkersChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
        const markers = event.target.value.split(',').map((s: string) => s.trim())
        this.props.setDefaultChannelMarkers(this.state.selectedChannel, markers)
    }

    private onChannelDomainRelease = (v: [number, number]): void =>
        this.props.setDefaultChannelDomain(this.state.selectedChannel, [v[0] / 100, v[1] / 100])

    private onUseAnyMarkerChange = (event: React.ChangeEvent<HTMLInputElement>): void =>
        this.props.setUseAnyMarker(this.state.selectedChannel, event.target.checked)

    private onMaxImageSetsInMemoryChange = (max: number): void => {
        this.setState({ maxImageSetsInMemory: max })
    }

    private onChannelDomainChange = (v: [number, number]): void => {
        const channelDomains = this.state.defaultChannelDomains
        if (channelDomains) {
            channelDomains[this.state.selectedChannel] = [v[0] / 100, v[1] / 100]
            this.setState({ defaultChannelDomains: channelDomains })
        }
    }

    public render(): React.ReactElement {
        const selectedChannel = this.state.selectedChannel
        const channelOptions = generateSelectOptions(this.imageChannelsForControls, this.channelTransform)
        const selectedValue = getSelectedOptions(selectedChannel, channelOptions)

        const defaultChannelMarkersValue = this.props.defaultChannelMarkers[selectedChannel].join(',')

        const chanelDomains = this.state.defaultChannelDomains
        let brightnessComponent = undefined
        if (chanelDomains) {
            const defaultChannelDomain = chanelDomains[selectedChannel]
            brightnessComponent = (
                <div>
                    <Label>Default Brightness for Channel</Label>
                    <RangeSlider
                        min={0}
                        max={100}
                        value={[defaultChannelDomain[0] * 100, defaultChannelDomain[1] * 100]}
                        labelStepSize={10}
                        labelPrecision={0}
                        stepSize={1}
                        onChange={this.onChannelDomainChange}
                        onRelease={this.onChannelDomainRelease}
                    />
                </div>
            )
        }
        return (
            <div>
                <Label>Maximum image sets in memory</Label>
                <Slider
                    min={1}
                    max={10}
                    stepSize={1}
                    value={this.state.maxImageSetsInMemory}
                    onChange={this.onMaxImageSetsInMemoryChange}
                    onRelease={this.props.setMaxImageSetsInMemory}
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
                    theme={SelectTheme}
                />
                <br />
                {brightnessComponent}
                <Label>Default Markers for Channel (Comma separated, in order of priority)</Label>
                <TextArea
                    value={defaultChannelMarkersValue}
                    onChange={this.onDefaultChannelMarkersChange}
                    fill={true}
                />
                <Label check style={{ paddingTop: '10px' }}>
                    <Checkbox
                        checked={this.props.useAnyMarker[this.state.selectedChannel]}
                        onChange={this.onUseAnyMarkerChange}
                        label="Use Any Marker if Defaults Not Present"
                    />
                </Label>
                <Label check style={{ paddingTop: '10px' }}>
                    <Checkbox
                        checked={this.props.rememberRecalculate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                            this.props.setRememberRecalculate(e.target.checked)
                        }
                        label="Remember my choice for recalculating segment intensities"
                    />
                </Label>
                <Label check style={{ paddingTop: '10px' }}>
                    <Checkbox
                        checked={this.props.recalculate}
                        disabled={!this.props.rememberRecalculate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                            this.props.setRecalculate(e.target.checked)
                        }
                        label="Recalculate segment intensities when loading segmentation data"
                    />
                </Label>
                <Label check style={{ paddingTop: '10px' }}>
                    <Checkbox
                        checked={this.props.rememberClearDuplicates}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                            this.props.setRememberClearDuplicates(e.target.checked)
                        }
                        label="Remember my choice for clearing duplicate segment features"
                    />
                </Label>
                <Label check style={{ paddingTop: '10px' }}>
                    <Checkbox
                        checked={this.props.clearDuplicates}
                        disabled={!this.props.rememberClearDuplicates}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                            this.props.setClearDuplicates(e.target.checked)
                        }
                        label="Clear duplicate segment features when loading custom features"
                    />
                </Label>
            </div>
        )
    }
}
