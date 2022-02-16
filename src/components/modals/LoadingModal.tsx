import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Spinner, Progress, Button } from 'reactstrap'

export interface LoadingModalProps {
    numCalculated: number
    numToCalculate: number
    numImported: number
    numToImport: number
    imageDataLoading: boolean
    segmentationDataLoading: boolean
    segmentFeaturesCalculating: boolean
    segmentFeaturesImporting: boolean
    selectionsLoading: boolean
    applicationReloading: boolean
    requestCancellation(value: boolean): void
    cancelRequested: boolean
}

@observer
export class LoadingModal extends React.Component<LoadingModalProps, Record<string, never>> {
    public constructor(props: LoadingModalProps) {
        super(props)
    }

    private requestCancellation = (): void => {
        this.props.requestCancellation(true)
    }

    public render(): React.ReactNode {
        let modal = null
        if (
            this.props.imageDataLoading ||
            this.props.segmentationDataLoading ||
            this.props.segmentFeaturesCalculating ||
            this.props.segmentFeaturesImporting ||
            this.props.selectionsLoading ||
            this.props.numToCalculate > 0 ||
            this.props.numToImport > 0
        ) {
            let modalText = 'Processing...'

            const segmentFeaturesImporting = this.props.segmentFeaturesImporting

            if (this.props.imageDataLoading) modalText = 'Image data is loading...'
            if (this.props.segmentationDataLoading) modalText = 'Segmentation data is loading...'
            if (this.props.segmentFeaturesCalculating) modalText = 'Segment intensities are being calculated...'
            if (segmentFeaturesImporting) modalText = 'Segment features are importing...'
            if (this.props.selectionsLoading) modalText = 'Selections are importing...'
            if (this.props.applicationReloading) modalText = 'Mantis is reloading...'

            let progressElement = <Spinner style={{ width: '5rem', height: '5rem' }} color="secondary" />
            let progressText = null

            const numToCalculate = segmentFeaturesImporting ? this.props.numToImport : this.props.numToCalculate
            let modalFooter = null
            if (numToCalculate > 1) {
                const numCalculated = segmentFeaturesImporting ? this.props.numImported : this.props.numCalculated
                progressElement = <Progress value={(numCalculated / numToCalculate) * 100} />
                progressText = (
                    <div style={{ textAlign: 'center', marginTop: '5px' }}>
                        {numCalculated} of {numToCalculate}
                    </div>
                )
                modalFooter = (
                    <ModalFooter>
                        <Button onClick={this.requestCancellation} size="sm" disabled={this.props.cancelRequested}>
                            {this.props.cancelRequested ? 'Cancelling' : 'Cancel'}
                        </Button>
                    </ModalFooter>
                )
            }
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>{modalText}</ModalHeader>
                    <ModalBody>
                        <div style={{ textAlign: 'center' }}>{progressElement}</div>
                        {progressText}
                    </ModalBody>
                    {modalFooter}
                </Modal>
            )
        }
        return modal
    }
}
