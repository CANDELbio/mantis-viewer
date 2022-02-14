import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody, Button } from 'reactstrap'
import { Checkbox } from '@blueprintjs/core'
import { Grid, Row, Col } from 'react-flexbox-grid'

export interface ChooseSegmentFeaturesModalProps {
    displayModal: boolean
    chooseSum: boolean
    setChooseSum: (x: boolean) => void
    closeModal: () => void
    calculate: () => void
}

@observer
export class ChooseSegmentFeaturesModal extends React.Component<ChooseSegmentFeaturesModalProps, {}> {
    public constructor(props: ChooseSegmentFeaturesModalProps) {
        super(props)
    }

    public render(): React.ReactNode {
        const calcSum = (
            <div>
                <Checkbox
                    checked={this.props.chooseSum}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                        this.props.setChooseSum(e.target.checked)
                    }
                    label="Calculate Sum"
                />
            </div>
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
                                    <ul>
                                        <li>{calcSum}</li>
                                    </ul>
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
