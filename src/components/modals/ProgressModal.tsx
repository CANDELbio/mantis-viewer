import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody, Progress } from 'reactstrap'

export interface ProgressModalProps {
    numCalculated: number
    numToCalculate: number
}

@observer
export class ProgressModal extends React.Component<ProgressModalProps, {}> {
    public constructor(props: ProgressModalProps) {
        super(props)
    }

    public render(): React.ReactNode {
        let modal = null
        if (this.props.numToCalculate > 0) {
            const progress = (this.props.numCalculated / this.props.numToCalculate) * 100
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>Working...</ModalHeader>
                    <ModalBody>
                        <div style={{ textAlign: 'center' }}>
                            <Progress value={progress} />
                        </div>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
