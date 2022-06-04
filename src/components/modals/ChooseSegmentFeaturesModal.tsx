import { observer } from 'mobx-react'
import * as React from 'react'
import { Grid, Row, Col } from 'react-flexbox-grid'
import Select from 'react-select'
import { Modal, ModalHeader, ModalBody, Button } from 'reactstrap'
import { PlotStatisticOptions } from '../../definitions/UIDefinitions'
import { SelectOption, SelectStyle, SelectTheme, getSelectedOptions } from '../../lib/SelectUtils'

export interface ChooseSegmentFeaturesModalProps {
    displayModal: boolean
    selectedStatistics: string[]
    setSelectedStatistics: (x: string[]) => void
    closeModal: () => void
    calculate: () => void
}

@observer
export class ChooseSegmentFeaturesModal extends React.Component<ChooseSegmentFeaturesModalProps> {
    public constructor(props: ChooseSegmentFeaturesModalProps) {
        super(props)
    }

    private onStatisticSelect = (selected: SelectOption[] | null): void => {
        let features: string[] = []
        if (selected != null)
            features = selected.map((o: SelectOption) => {
                return o.value
            })
        this.props.setSelectedStatistics(features)
    }

    private rowStyle = { marginBottom: '8px' }

    private calculateButtonDisabled = (): boolean => {
        if (this.props.selectedStatistics.length) {
            return false
        } else {
            return true
        }
    }

    public render(): React.ReactNode {
        const allStats = PlotStatisticOptions
        const selectedStats = getSelectedOptions(this.props.selectedStatistics, PlotStatisticOptions)

        const featureSelection = (
            <Select
                value={selectedStats}
                options={allStats}
                onChange={this.onStatisticSelect}
                isClearable={true}
                isMulti={true}
                placeholder="Statistic"
                styles={SelectStyle}
                theme={SelectTheme}
            />
        )

        let modal = null
        if (this.props.displayModal) {
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>Choose Features to Calculate</ModalHeader>
                    <ModalBody>
                        <Grid>
                            <Row middle="xs" center="xs" style={this.rowStyle}>
                                <Col xs={12}>{featureSelection}</Col>
                            </Row>

                            <Row middle="xs" center="xs">
                                <Col xs={6}>
                                    <Button type="button" size="sm" onClick={this.props.closeModal}>
                                        Cancel
                                    </Button>
                                </Col>
                                <Col xs={6}>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={this.props.calculate}
                                        disabled={this.calculateButtonDisabled()}
                                    >
                                        Calculate
                                    </Button>
                                </Col>
                            </Row>
                        </Grid>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
