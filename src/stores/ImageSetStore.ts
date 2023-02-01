import { when } from 'mobx'
import * as path from 'path'
import { ImageStore } from './ImageStore'
import { PlotStore } from './PlotStore'
import { PopulationStore } from './PopulationStore'
import { ProjectStore } from './ProjectStore'
import { SegmentationStore } from './SegmentationStore'

export class ImageSetStore {
    public constructor(projectStore: ProjectStore, directory: string) {
        this.directory = directory
        this.name = path.basename(directory)
        this.projectStore = projectStore
        this.imageStore = new ImageStore(this)
        this.plotStore = new PlotStore(this)
        this.segmentationStore = new SegmentationStore(this)
        this.populationStore = new PopulationStore(this)
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
        const persistedValueStore = this.projectStore.persistedValueStore
        if (imageStore.imageData == null) {
            const imageSubdirectory = persistedValueStore.imageSubdirectory
            const imageDirectory =
                imageSubdirectory && imageSubdirectory.length > 0
                    ? path.join(this.directory, imageSubdirectory)
                    : this.directory
            // Select the directory for image data
            imageStore.selectDirectory(imageDirectory)

            // Set defaults once image data has loaded
            when(
                (): boolean => !imageStore.imageDataLoading,
                (): void => persistedValueStore.setDefaultImageSetSettings(imageStore),
            )
        }
    }
}
