import { observer } from 'mobx-react'
import * as React from 'react'
import Creatable from 'react-select/creatable'
import { Modal, ModalHeader, ModalBody } from 'reactstrap'
import { SelectOption, SelectStyle, SelectTheme, getSelectedOptions } from '../../lib/SelectUtils'
import { SelectedPopulation } from '../../stores/PopulationStore'

export interface SegmentPopulationModalProps {
    segmentId: number | null
    populations: SelectedPopulation[]
    closeModal: () => void
    removeSegmentFromPopulation: (segment: number, populationId: string) => void
    addSegmentToPopulation: (segment: number, populationId: string) => void
    createPopulationFromSegments: (segments: number[], name?: string) => void
}

interface SegmentPopulationModalState {
    segmentId?: number
    segmentPopulations: string[]
}

@observer
export class SegmentPopulationModal extends React.Component<SegmentPopulationModalProps, SegmentPopulationModalState> {
    public constructor(props: SegmentPopulationModalProps) {
        super(props)
    }

    public state: SegmentPopulationModalState = {
        segmentPopulations: [],
    }

    private onSegmentPopulationsSelect = (selected: SelectOption[] | null): void => {
        const curSegment = this.state.segmentId
        if (curSegment) {
            const segmentPopulations = this.state.segmentPopulations
            const selectedPopulationOptions = selected ? selected : []
            const updatedPopulations = selectedPopulationOptions.map((p) => {
                return p.value
            })
            const removedPopulations = segmentPopulations.filter((p) => {
                return !updatedPopulations.includes(p)
            })
            const newPopulations = updatedPopulations.filter((p) => {
                return !segmentPopulations.includes(p)
            })
            removedPopulations.forEach((p) => this.props.removeSegmentFromPopulation(curSegment, p))
            newPopulations.forEach((p) => this.props.addSegmentToPopulation(curSegment, p))
        }
    }

    private onSegmentPopulationsCreate = (created: string): void => {
        if (this.state.segmentId) this.props.createPopulationFromSegments([this.state.segmentId], created)
    }

    public static getDerivedStateFromProps(props: SegmentPopulationModalProps): SegmentPopulationModalState | null {
        const segmentId = props.segmentId
        if (segmentId) {
            const segmentPopulations = []
            for (const population of props.populations) {
                if (!population.regionBitmap && population.selectedSegments.includes(segmentId)) {
                    segmentPopulations.push(population.id)
                }
            }
            return { segmentId: segmentId, segmentPopulations: segmentPopulations }
        }
        return null
    }

    public render(): React.ReactNode {
        let modal = null
        const segmentId = this.props.segmentId
        if (segmentId) {
            const selectOptions: SelectOption[] = []
            for (const population of this.props.populations) {
                if (!population.regionBitmap) selectOptions.push({ value: population.id, label: population.name })
            }

            const selectedOptions = getSelectedOptions(this.state.segmentPopulations, selectOptions)

            modal = (
                <Modal isOpen={true} toggle={this.props.closeModal}>
                    <ModalHeader toggle={this.props.closeModal}>
                        Edit Populations for Segment {this.props.segmentId}
                    </ModalHeader>
                    <ModalBody>
                        <Creatable
                            value={selectedOptions}
                            options={selectOptions}
                            onChange={this.onSegmentPopulationsSelect}
                            onCreateOption={this.onSegmentPopulationsCreate}
                            isMulti={true}
                            placeholder={'Select populations...'}
                            styles={SelectStyle}
                            theme={SelectTheme}
                        />
                        <div style={{ paddingLeft: '0.1em', color: 'grey' }}>
                            Select Populations or Type to Create a New Population
                        </div>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
