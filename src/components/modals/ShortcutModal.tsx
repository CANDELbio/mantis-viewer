import { observer } from 'mobx-react'
import * as React from 'react'
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
                            <li>
                                You can delete a population without a confirmation by holding <b>Command/Window</b> when
                                clicking on the delete button.
                            </li>
                            <li>
                                You can select a segment on the image to change its populations by holding <b>Shift</b>{' '}
                                and then clicking on it.
                            </li>
                            <li>
                                You can increment or decrement the selected segment by holding <b>Alt</b> or{' '}
                                <b>Command/Windows</b> and then pressing <b>=</b> or <b>-</b> respectively.
                            </li>
                            <li>
                                You can toggle marking selected segments on the image with a cross and outline by
                                holding <b>Alt</b> or <b>Command/Windows</b> and then pressing <b>h</b>.
                            </li>
                            <li>
                                You can fullscreen the renderer by pressing <b>Alt</b> or <b>Command/Window</b> and F.
                                You can exit fullscreen by pressing escape.
                            </li>
                        </ul>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
