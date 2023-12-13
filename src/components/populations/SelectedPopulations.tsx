import { EditableText, Checkbox } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import * as React from 'react'
import { CompactPicker, ColorResult } from 'react-color'
import { IoMdCloseCircle, IoMdAddCircle, IoMdCreate, IoMdEye, IoMdEyeOff } from 'react-icons/io'
import ReactTableContainer from 'react-table-container'
import { Popover, PopoverBody } from 'reactstrap'
import _ from 'underscore'

import { CreatePopulation } from './CreatePopulation'
import { PopulationCreationOptions } from '../../definitions/UIDefinitions'
import { MinMax } from '../../interfaces/ImageInterfaces'
import { hexToString } from '../../lib/ColorHelper'
import { SelectedPopulation } from '../../stores/PopulationStore'

interface SelectedProps {
    updateName: (id: string, name: string) => void
    updateColor: (id: string, color: number) => void
    updateVisibility: (id: string, visibility: boolean) => void
    updateSegments: (id: string, segments: number[]) => void
    deletePopulation: (id: string, confirm: boolean) => void
    highlightPopulation: (id: string) => void
    unhighlightPopulation: (id: string) => void
    userHighlightedSegmentId: number | null
    removeSegmentFromPopulation: (segment: number, populationId: string) => void
    addSegmentToPopulation: (segment: number, populationId: string) => void
    labelingPopulation: string | null
    setLabelingPopulation: (id: string | null) => void
}

interface SelectedPopulationProps extends SelectedProps {
    populations: SelectedPopulation[] | null
    setAllVisibility: (visibility: boolean) => void
    segmentationDataLoaded: boolean
    availableFeatures: string[]
    setSelectedFeature: (feature: string) => void
    selectedFeature: string | null
    selectedFeatureMinMax: MinMax | null
    createPopulationFromSegments: (segments: number[], name?: string) => void
    createPopulationFromRange: (min: number, max: number, marker: string, name?: string) => void
    tableHeight: number
}

interface SelectedDataRowProps extends SelectedProps {
    population: SelectedPopulation
    tableScrolling: boolean
}

interface SelectedPopulationState {
    tableScrolling: boolean
    addPopulationPopoverVisible: boolean
    selectedPopulationCreationOption: string
    newPopulationSegmentIds: string
}

interface SelectedDataRowState {
    colorPopoverVisible: boolean
    segmentPopoverVisible: boolean
}

function parseSegmentIds(toParse: string): number[] {
    return toParse
        .split(',')
        .map((v: string): number => {
            return parseInt(v)
        })
        .filter((v: number): boolean => {
            return !Number.isNaN(v)
        })
}

function visibleIcon(visible: boolean, onClick: () => void): JSX.Element {
    const icon = visible ? <IoMdEye size="1.5em" /> : <IoMdEyeOff size="1.5em" />
    return (
        <a href="#" onClick={onClick}>
            {icon}
        </a>
    )
}

@observer
export class SelectedPopulations extends React.Component<SelectedPopulationProps, SelectedPopulationState> {
    public constructor(props: SelectedPopulationProps) {
        super(props)
    }

    public state = {
        tableScrolling: false,
        addPopulationPopoverVisible: false,
        selectedPopulationCreationOption: PopulationCreationOptions[0].value,
        newPopulationSegmentIds: '',
    }

    private onToggleAddPopulationPopover = (): void =>
        this.setState({ addPopulationPopoverVisible: !this.state.addPopulationPopoverVisible })

    private TableRowItem = class TableRow extends React.Component<SelectedDataRowProps, SelectedDataRowState> {
        public state = {
            colorPopoverVisible: false,
            segmentPopoverVisible: false,
        }

        private deletePopulation = (e: React.MouseEvent): void => {
            this.props.deletePopulation(this.props.population.id, !e.metaKey)
        }

        private updateName = (name: string): void => {
            this.props.updateName(this.props.population.id, name)
        }

        private updateColor = (color: number): void => {
            this.props.updateColor(this.props.population.id, color)
        }

        private updateVisibility = (): void => {
            this.props.updateVisibility(this.props.population.id, !this.props.population.visible)
        }

        private highlightPopulation = (): void => {
            this.props.highlightPopulation(this.props.population.id)
        }

        private unhighlightPopulation = (): void => {
            this.props.unhighlightPopulation(this.props.population.id)
        }

        private onToggleColorPopover = (): void =>
            this.setState({ colorPopoverVisible: !this.state.colorPopoverVisible, segmentPopoverVisible: false })

        private handleColorChange = (color: ColorResult): void =>
            this.updateColor(parseInt(color.hex.replace(/^#/, ''), 16))

        private backgroundColor = (): string => {
            return hexToString(this.props.population.color)
        }

        private onToggleSegmentPopover = (): void =>
            this.setState({ colorPopoverVisible: false, segmentPopoverVisible: !this.state.segmentPopoverVisible })

        private onToggleContainsCheckboxCallback = (): ((event: React.FormEvent<HTMLInputElement>) => void) => {
            const userHighlightedSegmentId = this.props.userHighlightedSegmentId
            const populationId = this.props.population.id
            return (event: React.FormEvent<HTMLInputElement>) => {
                if (userHighlightedSegmentId) {
                    if (event.currentTarget.checked) {
                        this.props.addSegmentToPopulation(userHighlightedSegmentId, populationId)
                    } else {
                        this.props.removeSegmentFromPopulation(userHighlightedSegmentId, populationId)
                    }
                }
            }
        }

        private onToggleLabelingCheckboxCallback = (): (() => void) => {
            const populationId = this.props.population.id
            const labelingPopulationId = this.props.labelingPopulation
            return () => {
                if (labelingPopulationId == populationId) {
                    this.props.setLabelingPopulation(null)
                } else {
                    this.props.setLabelingPopulation(populationId)
                }
            }
        }

        private onChangeSelectedSegments = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            const updatedSegments = parseSegmentIds(event.target.value)
            this.props.updateSegments(this.props.population.id, updatedSegments)
        }

        // Use this special function to turn off the picker whenever the user starts scrolling on the parent table.
        public static getDerivedStateFromProps(
            props: SelectedDataRowProps,
            state: SelectedDataRowState,
        ): SelectedDataRowState | null {
            if ((state.colorPopoverVisible || state.segmentPopoverVisible) && props.tableScrolling) {
                return {
                    colorPopoverVisible: false,
                    segmentPopoverVisible: false,
                }
            }
            return null
        }

        public render(): React.ReactElement {
            const rowPopulation = this.props.population
            const userHighlightedSegmentId = this.props.userHighlightedSegmentId
            const containsCheckboxChecked = userHighlightedSegmentId
                ? this.props.population.selectedSegments.includes(userHighlightedSegmentId)
                : false
            return (
                <tr onMouseEnter={this.highlightPopulation} onMouseLeave={this.unhighlightPopulation}>
                    <td>
                        <EditableText
                            defaultValue={rowPopulation.name}
                            onConfirm={this.updateName}
                            selectAllOnFocus={true}
                        />
                    </td>
                    <td
                        id={'color-' + rowPopulation.id}
                        onClick={this.onToggleColorPopover}
                        style={{
                            backgroundColor: this.backgroundColor(),
                            cursor: 'pointer',
                            width: '50px',
                        }}
                    />
                    {/* Popover outside of the td so that the user can interact with it */}
                    <Popover
                        placement="left"
                        isOpen={this.state.colorPopoverVisible && !this.props.tableScrolling}
                        trigger="legacy"
                        target={'color-' + rowPopulation.id}
                        toggle={this.onToggleColorPopover}
                        style={{ backgroundColor: 'transparent' }}
                    >
                        {/* Compact picker is meant to be used as its own popover element, but doesn't work with ReactTableContainer */}
                        {/* Instead we style the compact-picker element to have a box-shadow to mask its default box-shadow */}
                        {/* And we set padding of PopoverBody to 6.8px to reduce the padding around compact picker and make it look natural */}
                        <PopoverBody style={{ padding: '6.8px' }}>
                            <div style={{ position: 'relative' }}>
                                <style>{'.compact-picker {box-shadow:0 0 0 6px #FFFFFF;}'}</style>
                                <CompactPicker
                                    color={hexToString(rowPopulation.color)}
                                    onChangeComplete={this.handleColorChange}
                                />
                            </div>
                        </PopoverBody>
                    </Popover>
                    <td>
                        {' '}
                        <Checkbox
                            checked={containsCheckboxChecked}
                            onChange={this.onToggleContainsCheckboxCallback()}
                            disabled={!this.props.userHighlightedSegmentId || rowPopulation.regionBitmap != undefined}
                        />
                    </td>
                    <td>
                        <Checkbox
                            checked={rowPopulation.id == this.props.labelingPopulation}
                            onChange={this.onToggleLabelingCheckboxCallback()}
                        />
                    </td>
                    <td id={'edit-' + rowPopulation.id} onClick={this.onToggleSegmentPopover}>
                        <a href="#">
                            <IoMdCreate size="1.5em" />
                        </a>
                    </td>
                    <td>{visibleIcon(rowPopulation.visible, this.updateVisibility)}</td>
                    {/* Popover outside of the td so that the user can interact with it */}
                    <Popover
                        placement="left"
                        isOpen={this.state.segmentPopoverVisible && !this.props.tableScrolling}
                        trigger="legacy"
                        target={'edit-' + rowPopulation.id}
                        toggle={this.onToggleSegmentPopover}
                        style={{ backgroundColor: 'transparent' }}
                    >
                        <PopoverBody>
                            <div
                                style={{ position: 'relative' }}
                                // Stop the scroll from propagating to the table and causing the popover to close
                                onWheel={(e): void => {
                                    e.stopPropagation()
                                }}
                            >
                                <textarea
                                    defaultValue={rowPopulation.selectedSegments.join(', ')}
                                    readOnly={rowPopulation.pixelIndexes ? true : false}
                                    disabled={rowPopulation.pixelIndexes ? true : false}
                                    onBlur={this.onChangeSelectedSegments}
                                    style={{ overflow: 'auto' }}
                                />
                            </div>
                        </PopoverBody>
                    </Popover>
                    <td>
                        <a href="#" onClick={this.deletePopulation}>
                            <IoMdCloseCircle size="1.5em" />
                        </a>
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
                .map((population) => {
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
                            updateSegments={this.props.updateSegments}
                            userHighlightedSegmentId={this.props.userHighlightedSegmentId}
                            removeSegmentFromPopulation={this.props.removeSegmentFromPopulation}
                            addSegmentToPopulation={this.props.addSegmentToPopulation}
                            tableScrolling={tableScrolling}
                            labelingPopulation={this.props.labelingPopulation}
                            setLabelingPopulation={this.props.setLabelingPopulation}
                        />
                    )
                })
        }
        return null
    }

    private anyVisible(): boolean {
        if (this.props.populations != null) {
            for (const population of this.props.populations) {
                if (population.visible) {
                    return true
                }
            }
            return false
        } else {
            return true
        }
    }

    private setVisibility = (): void => {
        this.props.setAllVisibility(!this.anyVisible())
    }

    private setDebounceTableScrolling = (): void => {
        this.setState({ tableScrolling: true })
        _.debounce((): void => {
            this.setState({ tableScrolling: false })
        }, 200)()
    }

    private addPopulationButton(): JSX.Element {
        return (
            <a
                href="#"
                className={`${this.props.segmentationDataLoaded ? '' : 'disabled'}`}
                onClick={this.onToggleAddPopulationPopover}
            >
                <IoMdAddCircle size="1.5em" id="add-population-button" />
            </a>
        )
    }

    private createPopulationPopover(): JSX.Element {
        return (
            <Popover
                placement="left"
                isOpen={this.state.addPopulationPopoverVisible}
                trigger="legacy"
                target="add-population-button"
                toggle={this.onToggleAddPopulationPopover}
                style={{ backgroundColor: 'transparent' }}
                className="create-population-popover"
            >
                <PopoverBody>
                    <CreatePopulation
                        availableFeatures={this.props.availableFeatures}
                        setSelectedFeature={this.props.setSelectedFeature}
                        selectedFeature={this.props.selectedFeature}
                        selectedFeatureMinMax={this.props.selectedFeatureMinMax}
                        createPopulationFromSegments={this.props.createPopulationFromSegments}
                        createPopulationFromRange={this.props.createPopulationFromRange}
                        onCreatePopulation={this.onToggleAddPopulationPopover}
                    ></CreatePopulation>
                </PopoverBody>
            </Popover>
        )
    }

    public render(): React.ReactElement {
        const populations = this.props.populations
        const tableHeight = this.props.tableHeight + 'px'
        const theadClassName = populations && populations.length ? undefined : 'empty-table'
        return (
            <div>
                <style>{'table.population-table th{padding:0.45rem;}'}</style>
                <style>{'table.population-table td{padding:0.35em;}'}</style>
                <ReactTableContainer width="100%" height={tableHeight} style={{ borderRadius: '5px' }}>
                    <table
                        className="table table-hover population-table"
                        onWheel={_.throttle(this.setDebounceTableScrolling, 100)}
                    >
                        <thead style={{ backgroundColor: 'white' }} className={theadClassName}>
                            <tr>
                                <th>Name</th>
                                <th>Color</th>
                                <th>Contains Segment</th>
                                <th>Add Segments</th>
                                <th />
                                <th>{visibleIcon(this.anyVisible(), this.setVisibility)}</th>
                                <th>{this.addPopulationButton()}</th>
                            </tr>
                        </thead>
                        <tbody>{this.populationRows(populations, this.state.tableScrolling)}</tbody>
                    </table>
                </ReactTableContainer>
                {/* Popover outside of the table so that the user can interact with it */}
                {this.createPopulationPopover()}
            </div>
        )
    }
}
