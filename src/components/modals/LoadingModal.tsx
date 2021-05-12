import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody, Spinner, Progress } from 'reactstrap'

export interface LoadingModalProps {
    numCalculated: number
    numToCalculate: number
    imageDataLoading: boolean
    segmentationDataLoading: boolean
    segmentFeaturesCalculating: boolean
    segmentFeaturesImporting: boolean
    selectionsLoading: boolean
    applicationReloading: boolean
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
            this.props.segmentFeaturesCalculating ||
            this.props.segmentFeaturesImporting ||
            this.props.selectionsLoading ||
            this.props.numToCalculate > 0
        ) {
            let modalText = 'Processing...'
            if (this.props.imageDataLoading) modalText = 'Image data is loading...'
            if (this.props.segmentationDataLoading) modalText = 'Segmentation data is loading...'
            if (this.props.segmentFeaturesCalculating) modalText = 'Segment intensities are being calculated...'
            if (this.props.segmentFeaturesImporting) modalText = 'Segment features are importing...'
            if (this.props.selectionsLoading) modalText = 'Selections features are importing...'
            if (this.props.applicationReloading) modalText = 'Mantis is reloading...'
            let progressElement = <Spinner style={{ width: '5rem', height: '5rem' }} color="secondary" />
            let progressText = null
            const numToCalculate = this.props.numToCalculate
            if (numToCalculate > 1) {
                const numCalculated = this.props.numCalculated
                progressElement = <Progress value={(numCalculated / numToCalculate) * 100} />
                progressText = (
                    <div style={{ textAlign: 'center', marginTop: '5px' }}>
                        {numCalculated} of {numToCalculate}
                    </div>
                )
            }
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>{modalText}</ModalHeader>
                    <ModalBody>
                        <div style={{ textAlign: 'center' }}>{progressElement}</div>
                        {progressText}
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
