import { observer } from 'mobx-react'
import * as React from 'react'
import { IoIosApps } from 'react-icons/io'
import Select from 'react-select'
import { Input, Button, Popover, PopoverBody } from 'reactstrap'
import { ChannelMappings } from '../../interfaces/ImageInterfaces'
import {
    SelectStyle,
    SelectTheme,
    getSelectedOptions,
    generateSelectOptions,
    onSelectChange,
} from '../../lib/SelectUtils'

export interface ChannelMappingControlsProps {
    selectedChannelMapping: string | null
    channelMappings: ChannelMappings
    saveChannelMapping: (name: string) => void
    deleteChannelMapping: (name: string) => void
    loadChannelMapping: (name: string) => void
    iconStyle?: object
}

interface ChannelMappingControlsState {
    channelMappingName: string
    popoverOpen: boolean
}

@observer
export class ChannelMappingControls extends React.Component<ChannelMappingControlsProps, ChannelMappingControlsState> {
    public constructor(props: ChannelMappingControlsProps) {
        super(props)
    }

    public state = {
        channelMappingName: '',
        popoverOpen: false,
    }

    public static getDerivedStateFromProps(
        props: ChannelMappingControlsProps,
        state: ChannelMappingControlsState,
    ): ChannelMappingControlsState | null {
        const mappingName = props.selectedChannelMapping ? props.selectedChannelMapping : ''
        return { channelMappingName: mappingName, popoverOpen: state.popoverOpen }
    }

    private onDelete = (): void => {
        const selectedMappingName = this.props.selectedChannelMapping
        if (selectedMappingName) {
            this.setState({ channelMappingName: '' })
            this.props.deleteChannelMapping(selectedMappingName)
        }
    }

    private onNameInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ channelMappingName: event.target.value })
    }

    private onSaveMapping = (): void => {
        const mappingName = this.state.channelMappingName
            ? this.state.channelMappingName
            : this.props.selectedChannelMapping
        if (mappingName) this.props.saveChannelMapping(mappingName)
    }

    private onSelectedMappingChange = (channelMappingName: string): void => {
        this.setState({ channelMappingName: channelMappingName })
        this.props.loadChannelMapping(channelMappingName)
    }

    private togglePopover = (): void => this.setState({ popoverOpen: !this.state.popoverOpen })

    public render(): React.ReactNode {
        const channelMappingNames = Object.keys(this.props.channelMappings)
        const selectedMappingName = this.props.selectedChannelMapping

        // Sorts the images in a human readable order (numbers first, numbers in number line order)
        const collator = new Intl.Collator(undefined, {
            numeric: true,
            sensitivity: 'base',
        })
        const sortedChannelMappingNames = channelMappingNames.slice().sort(collator.compare)

        const channelMappingOptions = generateSelectOptions(sortedChannelMappingNames)
        const selectedValue = getSelectedOptions(selectedMappingName, channelMappingOptions)
        const saveButtonLabel = selectedMappingName ? 'Rename' : 'Save'
        return (
            <>
                <a href="#" onClick={this.togglePopover}>
                    <IoIosApps
                        size="1.5em"
                        style={this.props.iconStyle ? this.props.iconStyle : {}}
                        id="channel-mapping-icon"
                    />
                </a>
                <Popover
                    placement="bottom-end"
                    isOpen={this.state.popoverOpen}
                    trigger="legacy"
                    target="channel-mapping-icon"
                    toggle={this.togglePopover}
                    style={{ width: '350px' }}
                    className="mapping-popover"
                >
                    <PopoverBody>
                        <table style={{ width: '325px' }} cellPadding="4">
                            <tbody>
                                <tr>
                                    <td>Selected Mapping</td>
                                    <td>
                                        <Select
                                            value={selectedValue}
                                            options={channelMappingOptions}
                                            onChange={onSelectChange(this.onSelectedMappingChange)}
                                            isClearable={false}
                                            styles={SelectStyle}
                                            theme={SelectTheme}
                                            isDisabled={sortedChannelMappingNames.length == 0}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Mapping Name</td>
                                    <td>
                                        <Input
                                            value={this.state.channelMappingName}
                                            onChange={this.onNameInputChange}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Button
                                            onClick={this.onSaveMapping}
                                            disabled={this.state.channelMappingName.length == 0}
                                            size="sm"
                                        >
                                            {saveButtonLabel}
                                        </Button>
                                    </td>
                                    <td>
                                        {' '}
                                        <Button onClick={this.onDelete} size="sm" disabled={!selectedMappingName}>
                                            Delete Mapping
                                        </Button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </PopoverBody>
                </Popover>
            </>
        )
    }
}
