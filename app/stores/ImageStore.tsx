import { observable, computed, action } from "mobx"
import {computedAsync } from "computed-async-mobx"
import Jimp = require("jimp")


export class ImageStore {
    @observable value: number = 5
    @observable compiler = "Gino"
    @observable framework = "Pino" 
    @observable selectedFile: string | null


    @action setValue = (x: number) => {
        this.value = x
    }

    @action selectFile = (fName: string) => {
        this.selectedFile = fName
    }


    imageData = computedAsync(null, async () => {
        if(this.selectedFile != null) {
            return(await Jimp.read(this.selectedFile))
        }
        else 
            return(null)
    })
}

