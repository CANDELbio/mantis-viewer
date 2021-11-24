import * as React from 'react'
import { ContextMenu, MenuItem } from 'react-contextmenu'
import { observer } from 'mobx-react'

export interface ImageContextMenuProps {
    segmentIds: number[]
    setEditingPopulations: (segmentId: number) => void
}

export const ImageContextMenuId = 'image_viewer_context_menu'

interface ImageContextMenuState {
    segmentIds: number[]
}

@observer
export class ImageContextMenu extends React.Component<ImageContextMenuProps, ImageContextMenuState> {
    public constructor(props: ImageContextMenuProps) {
        super(props)
    }

    public state: ImageContextMenuState = {
        segmentIds: [],
    }

    public static getDerivedStateFromProps(props: ImageContextMenuProps): ImageContextMenuState | null {
        const segmentIds = props.segmentIds
        if (segmentIds.length != 0) {
            return { segmentIds: segmentIds }
        }
        return null
    }

    private onEditPopulationsClick = (
        _e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>,
        data: { segmentId: number },
    ): void => {
        this.props.setEditingPopulations(data.segmentId)
    }

    private segmentMenuEntries(): JSX.Element[] {
        return this.state.segmentIds.map((segmentId) => {
            return (
                <MenuItem key={segmentId} data={{ segmentId: segmentId }} onClick={this.onEditPopulationsClick}>
                    Edit populations for segment {segmentId}
                </MenuItem>
            )
        })
    }

    public render(): React.ReactNode {
        const contextMenu = (
            <ContextMenu id={ImageContextMenuId} hideOnLeave={true}>
                {this.segmentMenuEntries()}
            </ContextMenu>
        )
        return contextMenu
    }
}
