import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody } from 'reactstrap'
import Select from 'react-select'
import { SelectOption, SelectStyle, SelectTheme, getSelectedOptions } from '../../lib/SelectUtils'
import { SelectedPopulation } from '../../stores/PopulationStore'

export interface SegmentPopulationModalProps {
    segmentId: number | null
    populations: SelectedPopulation[]
    closeModal: () => void
    removeSegmentFromPopulation: (segment: number, population: string) => void
    addSegmentToPopulation: (segment: number, population: string) => void
}

interface SegmentPopulationModalState {
    segmentId: number
    segmentPopulations: string[]
}

@observer
export class SegmentPopulationModal extends React.Component<SegmentPopulationModalProps, SegmentPopulationModalState> {
    public constructor(props: SegmentPopulationModalProps) {
        super(props)
    }

    private onSegmentPopulationsSelect = (selected: SelectOption[] | null): void => {
        const curSegment = this.state.segmentId
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

    public state: SegmentPopulationModalState

    public static getDerivedStateFromProps(props: SegmentPopulationModalProps): SegmentPopulationModalState | null {
        const segmentId = props.segmentId
        if (segmentId) {
            const segmentPopulations = []
            for (const population of props.populations) {
                if (!population.regionGraphics && population.selectedSegments.includes(segmentId)) {
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
                if (!population.regionGraphics) selectOptions.push({ value: population.id, label: population.name })
            }

            const selectedOptions = getSelectedOptions(this.state.segmentPopulations, selectOptions)

            modal = (
                <Modal isOpen={true} toggle={this.props.closeModal}>
                    <ModalHeader toggle={this.props.closeModal}>
                        Edit Populations for Segment {this.props.segmentId}
                    </ModalHeader>
                    <ModalBody>
                        <Select
                            value={selectedOptions}
                            options={selectOptions}
                            onChange={this.onSegmentPopulationsSelect}
                            isMulti={true}
                            placeholder={'Select populations...'}
                            styles={SelectStyle}
                            theme={SelectTheme}
                        />
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
