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
    @observable public numToExport: number
    @observable public numExported: number

    @observable public checkImportingSegmentFeaturesClearDuplicates: boolean

    public constructor() {
        this.initialize()
    }

    @action public initialize = (): void => {
        this.clearSegmentationRequested = false
        this.numToExport = 0
        this.numExported = 0
        this.checkImportingSegmentFeaturesClearDuplicates = false
    }

    @action public setInfoMessage = (message: string): void => {
        console.log('Setting info message to: ' + message)
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

    @action public setNumToExport = (value: number): void => {
        this.numToExport = value
    }

    @action public incrementNumExported = (): void => {
        this.numExported += 1
        // If we've exported all files, mark done.
        if (this.numExported >= this.numToExport) {
            this.numToExport = 0
            this.numExported = 0
        }
    }

    @action setCheckImportingSegmentFeaturesClearDuplicates = (value: boolean): void => {
        this.checkImportingSegmentFeaturesClearDuplicates = value
    }
}
