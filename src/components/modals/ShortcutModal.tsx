import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody } from 'reactstrap'

export interface ShortcutModalProps {
    displayModal: boolean
    toggleModal: () => void
}

@observer
export class ShortcutModal extends React.Component<ShortcutModalProps, Record<string, never>> {
    public constructor(props: ShortcutModalProps) {
        super(props)
    }

    public render(): React.ReactNode {
        let modal = null
        if (this.props.displayModal) {
            modal = (
                <Modal isOpen={true} toggle={this.props.toggleModal}>
                    <ModalHeader>Tips and Shortcuts</ModalHeader>
                    <ModalBody>
                        <ul>
                            <li>
                                You can switch between images in a project by holding <b>Alt</b> or{' '}
                                <b>Command/Windows</b> and then pressing the left or right arrow key.
                            </li>
                            <li>
                                You can switch between marker to channel mappings by holding <b>Alt</b> or{' '}
                                <b>Command/Windows</b> and then pressing the up or down arrow key.
                            </li>
                            <li>
                                You can adjust channel settings by holding a channel key along with the below{' '}
                                combinations. The channel keys are Q for red, W for green, E for blue, R for cyan, A for{' '}
                                magenta, S for yellow, and D for black.
                            </li>
                            <li>
                                You can adjust the upper channel brightness threshold by holding the desired channel key{' '}
                                and then pressing left or right.
                            </li>
                            <li>
                                You can adjust the lower channel brightness threshold by holding the desired channel key{' '}
                                and then pressing up or down.
                            </li>
                            <li>
                                You can toggle a channel&apos;s visibility by holding the desired channel key and then{' '}
                                pressing the space bar.
                            </li>
                            <li>
                                You can fullscreen the renderer by pressing <b>Alt</b> or <b>Command/Window</b> and F.
                                You can exit fullscreen by pressing escape.
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
                                You can edit a segment&apos;s populations by right clicking the segment on the image.
                            </li>
                        </ul>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
