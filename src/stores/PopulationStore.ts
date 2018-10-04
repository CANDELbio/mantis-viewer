import { observable, 
    action } from "mobx"
import { SelectedPopulation } from "../interfaces/ImageInterfaces"
import * as fs from 'fs'
import * as Shortid from 'shortid'

import { SelectedRegionColor } from "../interfaces/UIDefinitions"

export class PopulationStore {

    constructor() {
        this.initialize()
    }
    // An array of the regions selected.
    @observable selectedPopulations: SelectedPopulation[]
    // ID of a region to be highlighted. Used when mousing over in list of selected regions.
    @observable highlightedPopulations: string[]

    @action initialize = () => {
        this.selectedPopulations = []
        this.highlightedPopulations = []
    }

    newROIName(){
        if (this.selectedPopulations == null) return "Selection 1"
        return "Selection " + (this.selectedPopulations.length + 1).toString()
    }

    @action addSelectedPopulation = (selectedRegion: number[]|null, selectedSegments: number[]) => {
        let newRegion = {
            id: Shortid.generate(),
            selectedRegion: selectedRegion,
            selectedSegments: selectedSegments,
            name: this.newROIName(),
            notes: null,
            color: SelectedRegionColor,
            visible: true
        }
        this.selectedPopulations = this.selectedPopulations.concat([newRegion])
    }

    @action deleteSelectedPopulation = (id: string) => {
        if(this.selectedPopulations != null){
            this.selectedPopulations = this.selectedPopulations.filter(region => region.id != id)
        }
    }

    @action highlightSelectedPopulation = (id: string) => {
        this.highlightedPopulations = this.highlightedPopulations.concat([id])
    }

    @action unhighlightSelectedPopulation = (id: string) => {
        this.highlightedPopulations = this.highlightedPopulations.filter(regionId => regionId != id)
    }

    @action updateSelectedPopulationName = (id: string, newName:string) => {
        if(this.selectedPopulations != null){
            this.selectedPopulations = this.selectedPopulations.slice().map(function(region) {
                if(region.id == id){
                    region.name = newName
                    return region
                }
                else {
                    return region
                }
            })
        }
    }

    @action updateSelectedPopulationNotes = (id: string, newNotes:string) => {
        if(this.selectedPopulations != null){
            this.selectedPopulations = this.selectedPopulations.slice().map(function(region) {
                if(region.id == id){
                    region.notes = newNotes
                    return region
                }
                else {
                    return region
                }
            })
        }
    }

    @action updateSelectedPopulationColor = (id: string, color: number) => {
        if(this.selectedPopulations != null){
            this.selectedPopulations = this.selectedPopulations.slice().map(function(region) {
                if(region.id == id){
                    region.color = color
                    return region
                }
                else {
                    return region
                }
            })
        }
    }

    @action updateSelectedPopulationVisibility = (id: string, visible:boolean) => {
        console.log("Updating visibility of " + id + " to " + visible)
        if(this.selectedPopulations != null){
            this.selectedPopulations = this.selectedPopulations.slice().map(function(region) {
                if(region.id == id){
                    region.visible = visible
                    return region
                }
                else {
                    return region
                }
            })
        }
    }

    @action setAllSelectedPopulationVisibility = (visible:boolean) => {
        if(this.selectedPopulations != null){
            this.selectedPopulations = this.selectedPopulations.slice().map(function(region) {
                region.visible = visible
                return region
            })
        }
    }

    @action exportSelectedPopulations = (filename:string) => {
        if(this.selectedPopulations != null){
            let exportingContent = JSON.stringify(this.selectedPopulations)
            fs.writeFile(filename, exportingContent, 'utf8', function (err) {
                if (err) {
                    console.log("An error occured while writing regions of interest to file.")
                    return console.log(err)
                }
             
                console.log("Regions of interest file has been saved.")
            })
        }
    }

    @action importSelectedPopulations = (filename:string) => {
        if(this.selectedPopulations == null || this.selectedPopulations.length == 0) {
            let importingContent = fs.readFileSync(filename, 'utf8')
            let importedRegions:SelectedPopulation[] = JSON.parse(importingContent)
            this.selectedPopulations = importedRegions
        }
    }

    @action clearSelectedPopulations = () => {
        this.selectedPopulations = []
    }

    @action addPopulationsFromCSV = (filename:string) => {
        console.log("Add populations from " + filename)        
    }

}