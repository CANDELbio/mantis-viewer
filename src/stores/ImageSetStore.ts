import { ProjectStore } from './ProjectStore'
import { ImageStore } from './ImageStore'
import { SegmentationStore } from './SegmentationStore'
import { PlotStore } from './PlotStore'
import { PopulationStore } from './PopulationStore'

import * as path from 'path'

export class ImageSetStore {
    public constructor(projectStore: ProjectStore) {
        this.projectStore = projectStore
        this.imageStore = new ImageStore(this)
        this.plotStore = new PlotStore(this)
        this.segmentationStore = new SegmentationStore(this)
        this.populationStore = new PopulationStore()
    }

    public projectStore: ProjectStore
    public imageStore: ImageStore
    public segmentationStore: SegmentationStore
    public plotStore: PlotStore
    public populationStore: PopulationStore

    public imageSetName = (): string | void => {
        const selectedImageDirectory = this.imageStore.selectedDirectory
        if (selectedImageDirectory) return path.basename(selectedImageDirectory)
    }
}
