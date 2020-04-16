import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody, Progress } from 'reactstrap'

export interface ExportModalProps {
    numExported: number
    numToExport: number
}

@observer
export class ExportModal extends React.Component<ExportModalProps, {}> {
    public constructor(props: ExportModalProps) {
        super(props)
    }

    public render(): React.ReactNode {
        let modal = null
        if (this.props.numToExport > 0) {
            const exportProgress = (this.props.numExported / this.props.numToExport) * 100
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>Files exporting...</ModalHeader>
                    <ModalBody>
                        <div style={{ textAlign: 'center' }}>
                            <Progress value={exportProgress} />
                        </div>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
