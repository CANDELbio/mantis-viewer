import { observable, computed, action, autorun } from "mobx"
import Jimp = require("jimp")


export class ImageStore {
    @observable value: number = 5
    @observable compiler = "Gino"
    @observable framework = "Pino" 
    @observable selectedFile: string | null
    @observable imageData: string | null = null

    @action updateImageData() {
        let imgData = null
        if(this.selectedFile != null) {
            Jimp.read(this.selectedFile).then(action((img: any) => {
                        img.getBase64(Jimp.MIME_JPEG, (err:any , src:string) => {
                            this.imageData = src
                        })
                    })).catch(function (err:any) {
                        console.error(err);
                    });
        }
    }

    @action setValue = (x: number) => {
        this.value = x
    }

    @action selectFile = (fName: string) => {
        this.selectedFile = fName
        this.updateImageData()
    }
     


    /*
    Alternative implementation using computed-async-mobx 
    imageData = computedAsync(null, async () => {
        if(this.selectedFile != null) {
            return(await Jimp.read(this.selectedFile))
        }
        else 
            return(null)
    })*/
}



