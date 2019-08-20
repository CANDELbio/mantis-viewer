import * as React from 'react'
import Select from 'react-select'
import { observer } from 'mobx-react'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'

export interface ImageSetSelectorProps {
    selectedImageSet: string | null
    imageSetOptions: { value: string; label: string }[]
    setSelectedImageSet: (x: { value: string; label: string }) => void
    previousImageSet: () => void
    nextImageSet: () => void
}

@observer
export class ImageSetSelector extends React.Component<ImageSetSelectorProps, {}> {
    public constructor(props: ImageSetSelectorProps) {
        super(props)
    }

    public render(): React.ReactNode {
        let previousArrow = null
        let nextArrow = null
        if (this.props.imageSetOptions.length > 1) {
            previousArrow = (
                <div>
                    <a href="#" onClick={this.props.previousImageSet}>
                        <IoIosArrowBack size="1.5em" />
                    </a>
                </div>
            )
            nextArrow = (
                <div style={{ position: 'relative' }}>
                    <a href="#" onClick={this.props.nextImageSet}>
                        <IoIosArrowForward size="1.5em" />
                    </a>
                </div>
            )
        }
        if (this.props.imageSetOptions.length > 0) {
            return (
                <Grid fluid={true}>
                    <Row between="xs">
                        <Col xs={12} sm={12} md={12} lg={12}>
                            <div>Selected Image Set:</div>
                        </Col>
                    </Row>
                    <Row between="xs">
                        <Col xs={10} sm={10} md={10} lg={10}>
                            <Select
                                value={this.props.selectedImageSet == null ? undefined : this.props.selectedImageSet}
                                options={this.props.imageSetOptions}
                                onChange={this.props.setSelectedImageSet}
                                clearable={false}
                                style={{ width: '100%' }}
                            />
                        </Col>
                        <Col xs={2} sm={2} md={2} lg={2}>
                            {previousArrow}
                            {nextArrow}
                        </Col>
                    </Row>
                </Grid>
            )
        } else {
            return <p>Use the menu to select a file or folder.</p>
        }
    }
}
