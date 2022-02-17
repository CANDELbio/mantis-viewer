import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody, Button } from 'reactstrap'
import Select from 'react-select'
import { Checkbox } from '@blueprintjs/core'
import { Grid, Row, Col } from 'react-flexbox-grid'
import {
    SelectOption,
    SelectStyle,
    SelectTheme,
    getSelectedOptions,
    generateSelectOptions,
    onClearableSelectChange,
} from '../../lib/SelectUtils'
import { PlotStatistic, PlotStatisticOptions, PlotStatistics } from '../../definitions/UIDefinitions'

export interface ChooseSegmentFeaturesModalProps {
    displayModal: boolean
    // chooseSum: boolean
    //setChooseSum: (x: boolean) => void
    selectedStatistics: string[]
    setSelectedStatistics: (x: string[]) => void

    closeModal: () => void
    calculate: () => void
}

@observer
export class ChooseSegmentFeaturesModal extends React.Component<ChooseSegmentFeaturesModalProps, {}> {
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

    private featureOptions: { value: string; label: string }[]

    public render(): React.ReactNode {
        // const calcSum = (
        //    <div>
        //       <Checkbox
        //          checked={this.props.chooseSum}
        //            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
        //               this.props.setChooseSum(e.target.checked)
        //           }
        //           label="Calculate Sum"
        //       />
        //   </div>
        // )

        const allStats = generateSelectOptions(PlotStatistics)
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
                            <Row middle="xs" center="xs">
                                <Col xs={12}>
                                    <ul>{featureSelection}</ul>
                                </Col>
                            </Row>

                            <Row middle="xs" center="xs">
                                <Col xs={6}>
                                    <Button type="button" size="sm" onClick={this.props.closeModal}>
                                        Cancel
                                    </Button>
                                </Col>
                                <Col xs={6}>
                                    <Button type="button" size="sm" onClick={this.props.calculate}>
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
