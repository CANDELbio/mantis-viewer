import * as React from 'react'
import Select from 'react-select'
import { observer } from 'mobx-react'
import { Grid, Row, Col } from 'react-flexbox-grid'
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io'
import { ChannelMappingControls, ChannelMappingControlsProps } from './ChannelMappingControls'
import {
    SelectStyle,
    SelectTheme,
    getSelectedOptions,
    generateSelectOptions,
    onSelectChange,
} from '../../lib/SelectUtils'
import { basename } from 'path'

export interface ImageSelectorProps extends ChannelMappingControlsProps {
    selectedImage: string | null
    images: string[]
    setSelectedImage: (x: string) => void
    previousImage: () => void
    nextImage: () => void
}

@observer
export class ImageSelector extends React.Component<ImageSelectorProps, Record<string, never>> {
    public constructor(props: ImageSelectorProps) {
        super(props)
    }

    public render(): React.ReactNode {
        let controls = null
        const channelMappingControls = (
            <ChannelMappingControls
                selectedChannelMapping={this.props.selectedChannelMapping}
                channelMappings={this.props.channelMappings}
                saveChannelMapping={this.props.saveChannelMapping}
                deleteChannelMapping={this.props.deleteChannelMapping}
                loadChannelMapping={this.props.loadChannelMapping}
                iconStyle={{ position: 'absolute', top: '0.5em', left: '-1em' }}
            />
        )
        if (this.props.images.length > 1) {
            controls = (
                <div>
                    {channelMappingControls}
                    <a href="#" onClick={this.props.previousImage}>
                        <IoIosArrowBack size="1.5em" style={{ position: 'absolute', top: '0.5em', left: '0.25em' }} />
                    </a>
                    <a href="#" onClick={this.props.nextImage}>
                        <IoIosArrowForward size="1.5em" style={{ position: 'absolute', top: '0.5em', left: '1.5em' }} />
                    </a>
                </div>
            )
        } else {
            controls = <div>{channelMappingControls}</div>
        }

        // Sorts the images in a human readable order (numbers first, numbers in number line order)
        const collator = new Intl.Collator(undefined, {
            numeric: true,
            sensitivity: 'base',
        })
        const sortedImageSets = this.props.images.slice().sort(collator.compare)

        const imageSetOptions = generateSelectOptions(sortedImageSets, basename)
        const selectedValue = getSelectedOptions(this.props.selectedImage, imageSetOptions)
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
                            onChange={onSelectChange(this.props.setSelectedImage)}
                            isClearable={false}
                            styles={SelectStyle}
                            theme={SelectTheme}
                            isDisabled={sortedImageSets.length == 0}
                        />
                    </Col>
                    <Col xs={2} sm={2} md={2} lg={2}>
                        {controls}
                    </Col>
                </Row>
            </Grid>
        )
    }
}
