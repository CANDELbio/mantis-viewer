import * as React from 'react'
import { observer } from 'mobx-react'
import { Modal, ModalHeader, ModalBody, Button } from 'reactstrap'
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'
import { Grid, Row, Col } from 'react-flexbox-grid'
import path = require('path')

export interface DataImportModalProps {
    open: boolean
    directory: string | null
    openDirectoryPicker: () => void
    closeModal: () => void
    readyToImport: boolean
    import: () => void
    projectDirectories: string[]
    projectCsvs: string[]
    setImageSet: (imageSet: string | null) => void
    imageSet: string | null
    imageSetTiffs: string[]
    setSegmentation: (file: string | null) => void
    setFeatures: (file: string | null) => void
    setPopulations: (file: string | null) => void
}

interface DataImportModalState {
    page: number
}

const minPage = 1
const maxPage = 1

@observer
export class DataImportModal extends React.Component<DataImportModalProps, DataImportModalState> {
    public constructor(props: DataImportModalProps) {
        super(props)
    }

    public state = {
        page: 1,
    }

    private decrementPage = (): void => {
        let curPage = this.state.page
        if (curPage < minPage) {
            curPage -= 1
            this.setState({ page: curPage })
        }
    }

    private incrementPage = (): void => {
        let curPage = this.state.page
        if (curPage < minPage) {
            curPage += 1
            this.setState({ page: curPage })
        }
    }

    private body(): JSX.Element | null {
        let body = null
        let selectedDirectory = null
        if (this.props.directory)
            selectedDirectory = (
                <div>
                    <br />
                    Selected Directory:
                    <br />
                    {path.basename(this.props.directory)}
                </div>
            )
        if (this.state.page == 1) {
            body = (
                <div>
                    Welcome to the file import wizard!
                    <Button type="button" size="sm" onClick={this.props.openDirectoryPicker}>
                        Select a project directory...
                    </Button>
                    {selectedDirectory}
                </div>
            )
        }

        return body
    }

    public render(): React.ReactNode {
        let modal = null

        if (this.props.open) {
            modal = (
                <Modal isOpen={true}>
                    <ModalHeader>Project Import Wizard</ModalHeader>
                    <ModalBody>
                        <Grid>
                            <Row middle="xs" center="xs">
                                <Col xs={2}>
                                    <a href="#" onClick={this.decrementPage}>
                                        <IoIosArrowBack size="1.5em" style={{ position: 'absolute' }} />
                                    </a>
                                </Col>
                                <Col xs={8}>{this.body()}</Col>
                                <Col xs={2} onClick={this.incrementPage}>
                                    <a href="#">
                                        <IoIosArrowForward size="1.5em" style={{ position: 'absolute' }} />
                                    </a>
                                </Col>
                            </Row>
                            <Row middle="xs" center="xs">
                                <Col xs={5}>
                                    <Button type="button" size="sm" onClick={this.props.closeModal}>
                                        Cancel
                                    </Button>
                                </Col>
                                <Col xs={2}>
                                    {this.state.page}/{maxPage}
                                </Col>
                                <Col xs={5}>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={this.props.import}
                                        disabled={!this.props.readyToImport}
                                    >
                                        Import
                                    </Button>
                                </Col>
                            </Row>
                        </Grid>
                    </ModalBody>
                </Modal>
            )
        }
        return modal
    }
}
