import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody, Spinner } from 'reactstrap'

export interface LoadingModalProps {
    imageDataLoading: boolean
    segmentationDataLoading: boolean
    segmentFeaturesLoading: boolean
    segmentFeaturesImporting: boolean
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
            this.props.segmentFeaturesLoading ||
            this.props.segmentFeaturesImporting
        ) {
            let modalText = 'Image data is loading...'
            if (this.props.segmentationDataLoading) modalText = 'Segmentation data is loading...'
            if (this.props.segmentFeaturesLoading) modalText = 'Segment intensities are being calculated...'
            if (this.props.segmentFeaturesImporting) modalText = 'Segment features are importing...'
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
