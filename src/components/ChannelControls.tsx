import * as React from 'react'
import { RangeSlider } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import Select from 'react-select'
import { IoMdEye, IoMdEyeOff } from 'react-icons/io'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { Badge } from 'reactstrap'
import { ChannelName } from '../definitions/UIDefinitions'

export interface ChannelControlsProps {
    channel: ChannelName
    channelVisible: boolean
    onVisibilityChange: (value: boolean) => void
    sliderMin: number
    sliderMax: number
    sliderValue: [number, number]
    onDomainChange: (value: [number, number]) => void
    selectOptions: { value: string; label: string }[]
    selectValue: string | null
    allSelectedValues: (string | null)[]
    onMarkerChange: (x: { value: string; label: string }) => void
    windowWidth: number | null
}

@observer
export class ChannelControls extends React.Component<ChannelControlsProps, {}> {
    public constructor(props: ChannelControlsProps) {
        super(props)
    }

    private channelBadgeColorMap: Record<ChannelName, string> = {
        rChannel: '#FF0000',
        gChannel: '#00FF00',
        bChannel: '#0000FF',
        cChannel: '#00FFFF',
        mChannel: '#FF00FF',
        yChannel: '#FFFF00',
        kChannel: '#FFFFFF',
    }

    private channelBadge(channel: ChannelName): JSX.Element {
        return (
            <h5>
                <Badge
                    style={{
                        backgroundColor: this.channelBadgeColorMap[channel],
                        boxShadow: '0 0 0 0.1em #000000',
                        color: '#000000',
                    }}
                >
                    {channel[0].toUpperCase()}
                </Badge>
            </h5>
        )
    }

    private visibleIcon(visible: boolean): JSX.Element {
        let visibleClick = (): void => {
            this.props.onVisibilityChange(!visible)
        }
        let icon = visible ? <IoMdEye size="1.5em" /> : <IoMdEyeOff size="1.5em" />
        return (
            <a href="#" onClick={visibleClick}>
                {icon}
            </a>
        )
    }

    public render(): React.ReactNode {
        // TODO: Feels a bit hacky. Find a better solution.
        // Dereferencing here so we re-render on resize
        let windowWidth = this.props.windowWidth

        let paddingStyle = { paddingTop: '3px' }

        let unroundedStepSize = this.props.sliderMax / 5
        let roundedStepSize = Math.round(unroundedStepSize)
        let stepSize = roundedStepSize == 0 ? unroundedStepSize : roundedStepSize

        // Remove nulls and the value selected for this channel from the list of all selected values
        let filteredSelectedValues = this.props.allSelectedValues.filter(value => {
            return value != null && value != this.props.selectValue
        })
        // Remove all select options in the list of filtered, selected values from above.
        // This is so that a marker cannot be selected to be displayed in two channels.
        let filteredSelectOptions = this.props.selectOptions.filter(option => {
            return !filteredSelectedValues.includes(option.value)
        })

        return (
            <Grid fluid={true}>
                <Row between="xs">
                    <Col xs={2} sm={2} md={2} lg={2}>
                        {this.channelBadge(this.props.channel)}
                    </Col>
                    <Col xs={10} sm={10} md={10} lg={10}>
                        <Select
                            value={this.props.selectValue == null ? undefined : this.props.selectValue}
                            options={filteredSelectOptions}
                            onChange={this.props.onMarkerChange}
                        />
                    </Col>
                </Row>
                <Row between="xs" style={paddingStyle}>
                    <Col xs={10} sm={10} md={10} lg={10}>
                        <RangeSlider
                            min={this.props.sliderMin}
                            max={this.props.sliderMax}
                            value={this.props.sliderValue}
                            labelStepSize={stepSize}
                            labelPrecision={1}
                            stepSize={this.props.sliderMax / 1000} // Might want to change the number/size of steps. Seemed like a good starting point.
                            onChange={this.props.onDomainChange}
                        />
                    </Col>
                    <Col xs={2} sm={2} md={2} lg={2}>
                        {this.visibleIcon(this.props.channelVisible)}
                    </Col>
                </Row>
            </Grid>
        )
    }
}
