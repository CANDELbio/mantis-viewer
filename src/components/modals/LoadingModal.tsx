import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody, Spinner } from 'reactstrap'

export interface LoadingModalProps {
    imageDataLoading: boolean
    segmentationDataLoading: boolean
    segmentationStatisticsLoading: boolean
}

@observer
export class LoadingModal extends React.Component<LoadingModalProps, {}> {
    public constructor(props: LoadingModalProps) {
        super(props)
    }

    public render(): React.ReactNode {
        let modal = null
        if (
            this.props.imageDataLoading ||
            this.props.segmentationDataLoading ||
            this.props.segmentationStatisticsLoading
        ) {
            let modalText = 'Image Data is loading...'
            if (this.props.segmentationDataLoading) modalText = 'Segmentation Data is loading...'
            if (this.props.segmentationStatisticsLoading) modalText = 'Segmentation Statistics are loading...'
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>{modalText}</ModalHeader>
                    <ModalBody>
                        <div style={{ textAlign: 'center' }}>
                            <Spinner style={{ width: '5rem', height: '5rem' }} color="secondary" />
                        </div>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
