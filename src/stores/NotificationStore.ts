import { observable, action } from 'mobx'

export class NotificationStore {
    @observable public infoMessage: string | null

    // Message to be shown if there is an error.
    // Setting this to a string will cause the string to be displayed in a dialog
    // The render thread will set this back to null once displayed.
    @observable public errorMessage: string | null

    // Message to be shown if the user is being prompted to delete the active image set.
    @observable public removeMessage: string | null

    // Gets set to true when the user requests to clear segmentation so that we can ask to confirm.
    @observable public clearSegmentationRequested: boolean

    // Used to track progress when exporting FCS/Stats for whole project
    // or when calculating features for whole project
    @observable public numToCalculate: number
    @observable public numCalculated: number
    @observable public projectSegmentFeaturesCalculating: boolean

    // Used to track progress when importing segment features
    // Separate from numToCalculate above due to the case of a project import
    // where features can be simultaneously imported and calculated.
    @observable public numToImport: number
    @observable public numImported: number

    @observable public checkCalculateSegmentFeatures: boolean
    // Gets set to true when segmentation features have already been calculated
    // So that we can ask the user if they want to overwrite the old ones
    @observable public checkOverwriteGeneratingSegmentFeatures: boolean
    @observable public checkOverwriteImportingSegmentFeatures: boolean
    // Flag to kick up a dialog to check if the user wants to calculate all features
    // for the plot. Used when toggling plot all image sets.
    @observable public checkCalculateAllFeaturesForPlot: boolean

    // If we're importing a project and one is already open set this flag to true
    // to check if the user wants to continue importing
    @observable public checkImportProject: boolean

    // If a user has requested a cancellation we want to confirm with the user
    @observable public cancellationRequested: boolean

    // Set this flag to true if we've encountered an error and need to reload
    @observable public reloadMainWindow: boolean

    public constructor() {
        this.initialize()
    }

    @action public initialize = (): void => {
        this.clearSegmentationRequested = false
        this.numToCalculate = 0
        this.numCalculated = 0
        this.projectSegmentFeaturesCalculating = false
        this.numToImport = 0
        this.numImported = 0
        this.checkOverwriteGeneratingSegmentFeatures = false
        this.checkOverwriteImportingSegmentFeatures = false
        this.checkCalculateAllFeaturesForPlot = false
        this.checkImportProject = false
        this.reloadMainWindow = false
        this.cancellationRequested = false
    }

    @action public setInfoMessage = (message: string): void => {
        this.infoMessage = message
    }

    @action public clearInfoMessage = (): void => {
        this.infoMessage = null
    }

    @action public setErrorMessage = (message: string): void => {
        this.errorMessage = message
    }

    @action public clearErrorMessage = (): void => {
        this.errorMessage = null
    }

    @action public setRemoveMessage = (message: string): void => {
        this.removeMessage = message
    }

    @action public clearRemoveMessage = (): void => {
        this.removeMessage = null
    }

    @action public setClearSegmentationRequested = (value: boolean): void => {
        this.clearSegmentationRequested = value
    }

    @action public setNumToCalculate = (value: number): void => {
        this.numToCalculate = value
        this.numCalculated = 0
    }

    @action public incrementNumCalculated = (): void => {
        this.numCalculated += 1
        // If we've exported all files, mark done.
        if (this.numCalculated >= this.numToCalculate) {
            this.numToCalculate = 0
            this.numCalculated = 0
        }
    }

    @action public setProjectSegmentFeaturesCalculating = (value: boolean): void => {
        this.projectSegmentFeaturesCalculating = value
    }

    @action public setNumToImport = (value: number): void => {
        this.numToImport = value
        this.numImported = 0
    }

    @action public incrementNumImported = (): void => {
        this.numImported += 1
        // If we've exported all files, mark done.
        if (this.numImported >= this.numToImport) {
            this.numToImport = 0
            this.numImported = 0
        }
    }

    @action public setCheckCalculateSegmentFeatures = (check: boolean): void => {
        this.checkCalculateSegmentFeatures = check
    }

    @action setCheckOverwriteGeneratingSegmentFeatures = (value: boolean): void => {
        this.checkOverwriteGeneratingSegmentFeatures = value
    }

    @action setCheckOverwriteImportingSegmentFeatures = (value: boolean): void => {
        this.checkOverwriteImportingSegmentFeatures = value
    }

    @action setCheckCalculateAllFeaturesForPlot = (value: boolean): void => {
        this.checkCalculateAllFeaturesForPlot = value
    }

    @action setCheckImportProject = (value: boolean): void => {
        this.checkImportProject = value
    }

    @action requestReloadMainWindow = (): void => {
        this.reloadMainWindow = true
    }

    @action setCancellationRequested = (value: boolean): void => {
        this.cancellationRequested = value
    }
}
