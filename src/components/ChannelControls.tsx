import * as React from 'react'
import * as _ from 'underscore'
import { observer } from 'mobx-react'
import { CompactPicker, ColorResult } from 'react-color'
import { Popover, PopoverBody } from 'reactstrap'
import { RangeSlider } from '@blueprintjs/core'
import Select from 'react-select'
import { IoMdEye, IoMdEyeOff } from 'react-icons/io'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { Badge } from 'reactstrap'
import {
    SelectOption,
    SelectStyle,
    SelectTheme,
    getSelectedOptions,
    generateSelectOptions,
    onClearableSelectChange,
} from '../lib/SelectUtils'
import { labelStepSize, stepSize, sliderLabelRendererFunction } from '../lib/SliderUtils'
import { hexToString } from '../lib/ColorHelper'
import { MinMax } from '../interfaces/ImageInterfaces'
import { ChannelName } from '../definitions/UIDefinitions'

export interface ChannelControlsProps {
    channel: ChannelName
    channelColor: number
    setChannelColor: (value: number) => void
    channelVisible: boolean
    setChannelVisibility: (value: boolean) => void
    channelMin: number
    channelMax: number
    sliderValue: [number, number]
    setChannelDomainValue: (value: [number, number], minMax: MinMax) => void
    markers: string[]
    selectedMarker: string | null
    allSelectedMarkers: (string | null)[]
    setMarker: (marker: string | null) => void
    windowWidth: number | null
}

interface ChannelControlState {
    popoverVisible: boolean
}

@observer
export class ChannelControls extends React.Component<ChannelControlsProps, ChannelControlState> {
    public constructor(props: ChannelControlsProps) {
        super(props)
    }

    public state = { popoverVisible: false }

    private togglePopover = (): void => this.setState({ popoverVisible: !this.state.popoverVisible })

    private handleColorChange = (color: ColorResult): void => {
        this.props.setChannelColor(parseInt(color.hex.replace(/^#/, ''), 16))
    }

    private pickerColors = [
        '#FFFFFF',
        '#00FFFF',
        '#FF0000',
        '#F44E3B',
        '#FE9200',
        '#FCDC00',
        '#DBDF00',
        '#A4DD00',
        '#68CCCA',
        '#73D8FF',
        '#AEA1FF',
        '#FDA1FF',
        '#808080',
        '#FF00FF',
        '#00FF00',
        '#D33115',
        '#E27300',
        '#FCC400',
        '#B0BC00',
        '#68BC00',
        '#16A5A5',
        '#009CE0',
        '#7B64FF',
        '#FA28FF',
        '#000000',
        '#FFFF00',
        '#0000FF',
        '#9F0500',
        '#C45100',
        '#FB9E00',
        '#808900',
        '#194D33',
        '#0C797D',
        '#0062B1',
        '#653294',
        '#AB149E',
    ]

    private channelBadge(channel: ChannelName, color: number): JSX.Element {
        return (
            <div>
                <h5>
                    <Badge
                        id={channel + '-badge'}
                        style={{
                            backgroundColor: hexToString(color),
                            boxShadow: '0 0 0 0.1em #000000',
                            color: '#000000',
                            width: '20px',
                            height: '20px',
                            verticalAlign: '-webkit-baseline-middle',
                            cursor: 'pointer',
                        }}
                        onClick={this.togglePopover}
                    >
                        {' '}
                    </Badge>
                </h5>
                <Popover
                    placement="left"
                    trigger="legacy"
                    isOpen={this.state.popoverVisible}
                    toggle={this.togglePopover}
                    target={channel + '-badge'}
                    style={{ backgroundColor: 'transparent' }}
                >
                    {/* Compact picker is meant to be used as its own popover element, but doesn't work with ReactTableContainer */}
                    {/* Instead we style the compact-picker element to have a box-shadow to mask its default box-shadow */}
                    {/* And we set padding of PopoverBody to 6.8px to reduce the padding around compact picker and make it look natural */}
                    <PopoverBody style={{ padding: '6.8px' }}>
                        <div style={{ position: 'relative' }}>
                            <style>{'.compact-picker {box-shadow:0 0 0 6px #FFFFFF;}'}</style>
                            <CompactPicker
                                color={hexToString(color)}
                                onChangeComplete={this.handleColorChange}
                                colors={this.pickerColors}
                            />
                        </div>
                    </PopoverBody>
                </Popover>
            </div>
        )
    }

    private visibleIcon(visible: boolean): JSX.Element {
        const visibleClick = (): void => {
            this.props.setChannelVisibility(!visible)
        }
        const icon = visible ? <IoMdEye size="1.5em" /> : <IoMdEyeOff size="1.5em" />
        return (
            <a href="#" onClick={visibleClick}>
                {icon}
            </a>
        )
    }

    private onChannelDomainChange = (value: [number, number]): void => {
        this.props.setChannelDomainValue(value, { min: this.props.channelMin, max: this.props.channelMax })
    }

    public render(): React.ReactNode {
        // TODO: Feels a bit hacky. Find a better solution.
        // Dereferencing here so we re-render on resize
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const windowWidth = this.props.windowWidth

        const paddingStyle = { paddingTop: '3px' }

        // Remove nulls and the value selected for this channel from the list of all selected values
        const filteredSelectedValues = this.props.allSelectedMarkers.filter((value) => {
            return value != null && value != this.props.selectedMarker
        })
        // Remove all select options in the list of filtered, selected values from above.
        // This is so that a marker cannot be selected to be displayed in two channels.
        const selectOptions = generateSelectOptions(this.props.markers)
        const filteredSelectOptions = selectOptions.filter((option: SelectOption) => {
            return !filteredSelectedValues.includes(option.value)
        })
        const selectedValue = getSelectedOptions(this.props.selectedMarker, selectOptions)

        const channelMin = this.props.channelMin
        const channelMax = this.props.channelMax

        let brightnessSlider = (
            <RangeSlider
                disabled={this.props.selectedMarker == null}
                min={channelMin}
                max={channelMax}
                value={this.props.sliderValue}
                labelStepSize={labelStepSize(channelMax)}
                labelRenderer={sliderLabelRendererFunction(channelMax)}
                stepSize={stepSize(channelMax)}
                onChange={_.throttle(this.onChannelDomainChange, 100)}
            />
        )

        if (channelMin == channelMax) {
            brightnessSlider = <div>No non-zero values present in image</div>
        }

        return (
            <Grid fluid={true}>
                <Row between="xs">
                    <Col xs={2} sm={2} md={2} lg={2}>
                        {this.channelBadge(this.props.channel, this.props.channelColor)}
                    </Col>
                    <Col xs={10} sm={10} md={10} lg={10}>
                        <Select
                            value={selectedValue}
                            options={filteredSelectOptions}
                            onChange={onClearableSelectChange(this.props.setMarker)}
                            isClearable={true}
                            styles={SelectStyle}
                            theme={SelectTheme}
                        />
                    </Col>
                </Row>
                <Row between="xs" style={paddingStyle}>
                    <Col xs={10} sm={10} md={10} lg={10}>
                        {brightnessSlider}
                    </Col>
                    <Col xs={2} sm={2} md={2} lg={2}>
                        {this.visibleIcon(this.props.channelVisible)}
                    </Col>
                </Row>
            </Grid>
        )
    }
}
