import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody } from 'reactstrap'

export interface WelcomeModalProps {
    displayModal: boolean
}

@observer
export class WelcomeModal extends React.Component<WelcomeModalProps, {}> {
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
                                and then click <b>Open</b>. From this menu you can select <b>Image Set</b> to load a{' '}
                                single set of images or <b>Project</b> to load a folder containing multiple image sets.
                            </li>
                            <li>
                                You can select regions of interest on the image by holding <b>Alt</b> or{' '}
                                <b>Command/Window</b> and clicking and drawing a region on the image.
                            </li>
                            <li>
                                You can quickly switch between image sets in a project by holding <b>Alt</b> or{' '}
                                <b>Command/Windows</b> and then pressing the left or right arrow key.
                            </li>
                            <li>
                                You can fullscreen the renderer by pressing <b>Alt</b> or <b>Command/Window</b> and F.
                                You can exit fullscreen by pressing escape.
                            </li>
                            <li>
                                You can select populations on the plot by using the <b>Lasso Select</b> or{' '}
                                <b>Box Select</b> tool in the menu at the top of the plot.
                            </li>
                            <li>
                                You can break the plot out into a larger window by clicking <b>Window</b> and then{' '}
                                <b>Open Plot Window</b>
                            </li>
                        </ul>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
