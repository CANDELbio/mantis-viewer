import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody } from 'reactstrap'

export interface ChooseSegmentFeaturesModalProps {
    displayModal: boolean
}

@observer
export class ChooseSegmentFeaturesModal extends React.Component<ChooseSegmentFeaturesModalProps, {}> {
    public constructor(props: ChooseSegmentFeaturesModalProps) {
        super(props)
    }

    public render(): React.ReactNode {
        let modal = null
        if (this.props.displayModal) {
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>Choose Features to Calculate</ModalHeader>
                    <ModalBody>
                        <ul>
                            <li>Segment Feature Choice will go here.</li>
                        </ul>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
