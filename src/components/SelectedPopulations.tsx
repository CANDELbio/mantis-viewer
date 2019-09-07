import * as React from 'react'
import * as _ from 'underscore'
import { EditableText, Checkbox } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import { CompactPicker, ColorResult } from 'react-color'
import { Popover, PopoverBody } from 'reactstrap'
import { Badge } from 'reactstrap'
import ReactTableContainer from 'react-table-container'
import { hexToString } from '../lib/ColorHelper'

import { SelectedPopulation } from '../interfaces/ImageInterfaces'

interface SelectedProps {
    updateName: (id: string, name: string) => void
    updateColor: (id: string, color: number) => void
    updateVisibility: (id: string, visibility: boolean) => void
    deletePopulation: (id: string) => void
    highlightPopulation: (id: string) => void
    unhighlightPopulation: (id: string) => void
}

interface SelectedPopulationProps extends SelectedProps {
    populations: SelectedPopulation[] | null
    setAllVisibility: (visibility: boolean) => void
}

interface SelectedDataRowProps extends SelectedProps {
    population: SelectedPopulation
    tableScrolling: boolean
}

interface SelectedPopulationState {
    tableScrolling: boolean
}

interface SelectedDataRowState {
    pickerVisible: boolean
}

@observer
export class SelectedPopulations extends React.Component<SelectedPopulationProps, SelectedPopulationState> {
    public constructor(props: SelectedPopulationProps) {
        super(props)
    }

    public state = {
        tableScrolling: false,
    }

    private TableRowItem = class TableRow extends React.Component<SelectedDataRowProps, SelectedDataRowState> {
        public state = {
            pickerVisible: false,
        }

        private deletePopulation = () => {
            this.props.deletePopulation(this.props.population.id)
        }

        private updateName = (name: string) => {
            this.props.updateName(this.props.population.id, name)
        }

        private updateColor = (color: number) => {
            this.props.updateColor(this.props.population.id, color)
        }

        private updateVisibility = (event: React.FormEvent<HTMLInputElement>) => {
            this.props.updateVisibility(this.props.population.id, event.currentTarget.checked)
        }

        private highlightPopulation = () => {
            this.props.highlightPopulation(this.props.population.id)
        }

        private unhighlightPopulation = () => {
            this.props.unhighlightPopulation(this.props.population.id)
        }

        private onTogglePicker = () => this.setState({ pickerVisible: !this.state.pickerVisible })
        private handleColorChange = (color: ColorResult) => this.updateColor(parseInt(color.hex.replace(/^#/, ''), 16))

        private backgroundColor = () => {
            return hexToString(this.props.population.color)
        }

        // Use this special function to turn off the picker whenever the user starts scrolling on the parent table.
        public static getDerivedStateFromProps(
            props: SelectedDataRowProps,
            state: SelectedDataRowState,
        ): SelectedDataRowState | null {
            if (state.pickerVisible && props.tableScrolling) {
                return {
                    pickerVisible: false,
                }
            }
            return null
        }

        public render(): React.ReactElement {
            return (
                <tr onMouseEnter={this.highlightPopulation} onMouseLeave={this.unhighlightPopulation}>
                    <td>
                        <EditableText
                            defaultValue={this.props.population.name}
                            onConfirm={this.updateName}
                            selectAllOnFocus={true}
                        />
                    </td>
                    <td
                        id={'color-' + this.props.population.id}
                        onClick={this.onTogglePicker}
                        style={{ backgroundColor: this.backgroundColor(), cursor: 'pointer', width: '50px' }}
                    >
                        <Popover
                            placement="left"
                            isOpen={this.state.pickerVisible && !this.props.tableScrolling}
                            trigger="legacy"
                            target={'color-' + this.props.population.id}
                            toggle={this.onTogglePicker}
                            style={{ backgroundColor: 'transparent' }}
                        >
                            {/* Compact picker is meant to be used as its own popover element, but doesn't work with ReactTableContainer */}
                            {/* Instead we style the compact-picker element to have a box-shadow to mask its default box-shadow */}
                            {/* And we set padding of PopoverBody to 6.8px to reduce the padding around compact picker and make it look natural */}
                            <PopoverBody style={{ padding: '6.8px' }}>
                                <div style={{ position: 'relative' }}>
                                    <style>{'.compact-picker {box-shadow:0 0 0 6px #FFFFFF;}'}</style>
                                    <CompactPicker
                                        color={'#' + this.props.population.color.toString(16)}
                                        onChangeComplete={this.handleColorChange}
                                    />
                                </div>
                            </PopoverBody>
                        </Popover>
                    </td>
                    <td>
                        <Checkbox checked={this.props.population.visible} onChange={this.updateVisibility} />
                    </td>
                    <td>
                        <h5>
                            <Badge onClick={this.deletePopulation} color="danger" style={{ cursor: 'pointer' }}>
                                Delete
                            </Badge>
                        </h5>
                    </td>
                </tr>
            )
        }
    }

    private populationRows(populations: SelectedPopulation[] | null, tableScrolling: boolean): JSX.Element[] | null {
        if (populations != null) {
            return populations
                .sort((a: SelectedPopulation, b: SelectedPopulation) => {
                    return a.renderOrder > b.renderOrder ? 1 : -1
                })
                .map(population => {
                    return (
                        <this.TableRowItem
                            key={population.id}
                            population={population}
                            updateName={this.props.updateName}
                            deletePopulation={this.props.deletePopulation}
                            updateColor={this.props.updateColor}
                            updateVisibility={this.props.updateVisibility}
                            highlightPopulation={this.props.highlightPopulation}
                            unhighlightPopulation={this.props.unhighlightPopulation}
                            tableScrolling={tableScrolling}
                        />
                    )
                })
        }
        return null
    }

    private setVisibility = (event: React.FormEvent<HTMLInputElement>) => {
        this.props.setAllVisibility(event.currentTarget.checked)
    }

    private anyVisible(): boolean {
        if (this.props.populations != null) {
            for (let population of this.props.populations) {
                if (population.visible) {
                    return true
                }
            }
            return false
        } else {
            return true
        }
    }

    private visibleCheckboxDisabled(): boolean {
        if (this.props.populations == null) {
            return true
        } else if (this.props.populations.length == 0) {
            return true
        } else {
            return false
        }
    }

    private setDebounceTableScrolling = () => {
        this.setState({ tableScrolling: true })
        _.debounce((): void => {
            this.setState({ tableScrolling: false })
        }, 200)()
    }

    public render(): React.ReactElement {
        let populations = this.props.populations
        return (
            <div>
                <style>{'table.population-table th{padding:0.45rem;}'}</style>
                <style>{'table.population-table td{padding:0.35em;}'}</style>
                <ReactTableContainer width="100%" height="200px">
                    <table
                        className="table table-hover population-table"
                        onWheel={_.throttle(this.setDebounceTableScrolling, 100)}
                    >
                        <thead style={{ backgroundColor: 'white' }}>
                            <tr>
                                <th>Name</th>
                                <th>Color</th>
                                <th>
                                    <Checkbox
                                        checked={this.anyVisible()}
                                        onChange={this.setVisibility}
                                        label="Visible"
                                        disabled={this.visibleCheckboxDisabled()}
                                        style={{ display: 'table-cell' }}
                                    />
                                </th>
                                <th> </th>
                            </tr>
                        </thead>
                        <tbody>{this.populationRows(populations, this.state.tableScrolling)}</tbody>
                    </table>
                </ReactTableContainer>
            </div>
        )
    }
}
