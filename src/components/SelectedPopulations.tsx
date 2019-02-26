import * as React from 'react'
import { SelectedPopulation } from '../interfaces/ImageInterfaces'
import { EditableText, Button, Checkbox } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import { CompactPicker, ColorResult } from 'react-color'

interface SelectedProps {
    updateName: (id: string, name: string) => void
    updateNotes: (id: string, notes: string) => void
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
}

interface TableRowState {
    pickerVisible: boolean
}

@observer
export class SelectedPopulations extends React.Component<SelectedPopulationProps, {}> {
    public constructor(props: SelectedPopulationProps) {
        super(props)
    }

    private TableRowItem = class TableRow extends React.Component<SelectedDataRowProps, TableRowState> {
        public state = {
            pickerVisible: false,
        }

        private deletePopulation = () => {
            this.props.deletePopulation(this.props.population.id)
        }

        private updateName = (name: string) => {
            this.props.updateName(this.props.population.id, name)
        }

        private updateNotes = (notes: string) => {
            this.props.updateNotes(this.props.population.id, notes)
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
            let hex = this.props.population.color.toString(16)
            hex = '000000'.substr(0, 6 - hex.length) + hex
            return '#' + hex
        }

        public render(): React.ReactElement {
            let thisNotes = this.props.population.notes == null ? '' : this.props.population.notes
            return (
                <tr onMouseEnter={this.highlightPopulation} onMouseLeave={this.unhighlightPopulation}>
                    <td>
                        <EditableText defaultValue={this.props.population.name} onConfirm={this.updateName} />
                    </td>
                    <td onClick={this.onTogglePicker} style={{ backgroundColor: this.backgroundColor() }}>
                        {this.state.pickerVisible && (
                            <div style={{ position: 'absolute', zIndex: 9999 }}>
                                <CompactPicker
                                    color={'#' + this.props.population.color.toString(16)}
                                    onChangeComplete={this.handleColorChange}
                                />
                            </div>
                        )}
                    </td>
                    <td>
                        <EditableText defaultValue={thisNotes} onConfirm={this.updateNotes} />
                    </td>
                    <td>
                        <Checkbox checked={this.props.population.visible} onChange={this.updateVisibility} />
                    </td>
                    <td>
                        <Button text={'Delete'} onClick={this.deletePopulation} />
                    </td>
                </tr>
            )
        }
    }

    private populationRows(populations: SelectedPopulation[] | null): JSX.Element[] | null {
        if (populations != null) {
            return populations.map(population => {
                return (
                    <this.TableRowItem
                        key={population.id}
                        population={population}
                        updateName={this.props.updateName}
                        updateNotes={this.props.updateNotes}
                        deletePopulation={this.props.deletePopulation}
                        updateColor={this.props.updateColor}
                        updateVisibility={this.props.updateVisibility}
                        highlightPopulation={this.props.highlightPopulation}
                        unhighlightPopulation={this.props.unhighlightPopulation}
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

    public render(): React.ReactElement {
        let populations = this.props.populations
        return (
            <div>
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Color</th>
                            <th>Notes</th>
                            <th>
                                <Checkbox
                                    checked={this.anyVisible()}
                                    onChange={this.setVisibility}
                                    label="Visible"
                                    disabled={this.visibleCheckboxDisabled()}
                                />
                            </th>
                            <th> </th>
                        </tr>
                    </thead>
                    <tbody>{this.populationRows(populations)}</tbody>
                </table>
            </div>
        )
    }
}
