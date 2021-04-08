import * as React from 'react'
import Select from 'react-select'
import { observer } from 'mobx-react'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'
import {
    SelectStyle,
    SelectTheme,
    getSelectedOptions,
    generateSelectOptions,
    onSelectChange,
} from '../lib/SelectHelper'
import { basename } from 'path'

export interface ImageSetSelectorProps {
    selectedImageSet: string | null
    imageSets: string[]
    setSelectedImageSet: (x: string) => void
    previousImageSet: () => void
    nextImageSet: () => void
}

@observer
export class ImageSetSelector extends React.Component<ImageSetSelectorProps, {}> {
    public constructor(props: ImageSetSelectorProps) {
        super(props)
    }

    public render(): React.ReactNode {
        let arrowControls = null
        if (this.props.imageSets.length > 1) {
            arrowControls = (
                <div>
                    <a href="#" onClick={this.props.previousImageSet}>
                        <IoIosArrowBack size="1.5em" style={{ position: 'absolute', top: 0, left: 0 }} />
                    </a>
                    <a href="#" onClick={this.props.nextImageSet}>
                        <IoIosArrowForward size="1.5em" style={{ position: 'absolute' }} />
                    </a>
                </div>
            )
        }

        // Sorts the images in a human readable order (numbers first, numbers in number line order)
        const collator = new Intl.Collator(undefined, {
            numeric: true,
            sensitivity: 'base',
        })
        const sortedImageSets = this.props.imageSets.slice().sort(collator.compare)

        const imageSetOptions = generateSelectOptions(sortedImageSets, basename)
        const selectedValue = getSelectedOptions(this.props.selectedImageSet, imageSetOptions)
        return (
            <Grid fluid={true}>
                <Row between="xs">
                    <Col xs={12} sm={12} md={12} lg={12}>
                        <div>Selected Image:</div>
                    </Col>
                </Row>
                <Row between="xs">
                    <Col xs={10} sm={10} md={10} lg={10}>
                        <Select
                            value={selectedValue}
                            options={imageSetOptions}
                            onChange={onSelectChange(this.props.setSelectedImageSet)}
                            isClearable={false}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={sortedImageSets.length == 0}
                        />
                    </Col>
                    <Col xs={2} sm={2} md={2} lg={2}>
                        {arrowControls}
                    </Col>
                </Row>
            </Grid>
        )
    }
}
