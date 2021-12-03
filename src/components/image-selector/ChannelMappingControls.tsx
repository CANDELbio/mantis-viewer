import * as React from 'react'
import Select from 'react-select'
import { observer } from 'mobx-react'
import { Input, Button } from 'reactstrap'
import { IoIosApps } from 'react-icons/io'
import { Popover, PopoverBody } from 'reactstrap'
import {
    SelectStyle,
    SelectTheme,
    getSelectedOptions,
    generateSelectOptions,
    onSelectChange,
} from '../../lib/SelectUtils'
import { ChannelMarkerMapping } from '../../interfaces/ImageInterfaces'

export interface ChannelMappingControlsProps {
    selectedChannelMapping: string | null
    channelMarkerMappings: Record<string, ChannelMarkerMapping>
    saveChannelMarkerMapping: (name: string) => void
    deleteChannelMarkerMapping: (name: string) => void
    loadChannelMarkerMapping: (name: string) => void
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

    private onDelete = (): void => {
        const selectedMappingName = this.props.selectedChannelMapping
        if (selectedMappingName) this.props.deleteChannelMarkerMapping(selectedMappingName)
    }

    private onNameInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ channelMappingName: event.target.value })
    }

    private onSaveMapping = (): void => {
        const mappingName = this.state.channelMappingName
            ? this.state.channelMappingName
            : this.props.selectedChannelMapping
        if (mappingName) this.props.saveChannelMarkerMapping(mappingName)
    }

    private togglePopover = (): void => this.setState({ popoverOpen: !this.state.popoverOpen })

    public render(): React.ReactNode {
        const channelMappingNames = Object.keys(this.props.channelMarkerMappings)
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
                                            onChange={onSelectChange(this.props.loadChannelMarkerMapping)}
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
                                            defaultValue={selectedMappingName ? selectedMappingName : ''}
                                            onChange={this.onNameInputChange}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Button onClick={this.onSaveMapping} size="sm">
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
