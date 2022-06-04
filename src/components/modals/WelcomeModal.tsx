import { observer } from 'mobx-react'
import * as React from 'react'
import { Modal, ModalHeader, ModalBody } from 'reactstrap'

export interface WelcomeModalProps {
    displayModal: boolean
}

@observer
export class WelcomeModal extends React.Component<WelcomeModalProps, Record<string, never>> {
    public constructor(props: WelcomeModalProps) {
        super(props)
    }

    public render(): React.ReactNode {
        let modal = null
        if (this.props.displayModal) {
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>Welcome to Mantis Viewer!</ModalHeader>
                    <ModalBody>
                        <ul>
                            <li>
                                To start using the application click on the <b>mantis-viewer</b> menu in the top left{' '}
                                and then click <b>Open</b>. From this menu you can select <b>Project Import Wizard</b>{' '}
                                to have Mantis guide you through loading a project directory containing multiple images{' '}
                                directories, <b> Existing Project</b> to load a previously imported project or{' '}
                                <b>Image</b> to load a single image directory.
                            </li>
                            <li>
                                You can select regions of interest on the image by holding <b>Alt</b> or{' '}
                                <b>Command/Window</b> and clicking and drawing a region on the image.
                            </li>
                            <li>
                                You can select populations on the plot by using the <b>Lasso Select</b> or{' '}
                                <b>Box Select</b> tool in the menu at the top of the plot.
                            </li>
                            <li>
                                You can break the plot out into a larger window by clicking <b>Window</b> and then{' '}
                                <b>Open Plot Window</b>
                            </li>
                            <li>You can view a list of tips and keyboard shortcuts at anytime by typing ?</li>
                        </ul>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
