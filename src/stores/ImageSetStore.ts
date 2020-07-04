import { when } from 'mobx'
import { ProjectStore } from './ProjectStore'
import { ImageStore } from './ImageStore'
import { SegmentationStore } from './SegmentationStore'
import { PlotStore } from './PlotStore'
import { PopulationStore } from './PopulationStore'

import * as path from 'path'

export class ImageSetStore {
    public constructor(projectStore: ProjectStore, directory: string) {
        this.projectStore = projectStore
        this.imageStore = new ImageStore(this)
        this.plotStore = new PlotStore(this)
        this.segmentationStore = new SegmentationStore(this)
        this.populationStore = new PopulationStore(this)
        this.directory = directory
        this.name = path.basename(directory)
    }

    public projectStore: ProjectStore
    public imageStore: ImageStore
    public segmentationStore: SegmentationStore
    public plotStore: PlotStore
    public populationStore: PopulationStore
    public directory: string
    public name: string

    public loadImageStoreData = (): void => {
        const imageStore = this.imageStore
        const settingStore = this.projectStore.settingStore
        if (imageStore.imageData == null) {
            const imageSubdirectory = settingStore.imageSubdirectory
            const imageDirectory =
                imageSubdirectory && imageSubdirectory.length > 0
                    ? path.join(this.directory, imageSubdirectory)
                    : this.directory
            // Select the directory for image data
            imageStore.selectDirectory(imageDirectory)

            // Set defaults once image data has loaded
            when(
                (): boolean => !imageStore.imageDataLoading,
                (): void => settingStore.setDefaultImageSetSettings(imageStore),
            )
        }
    }
}
