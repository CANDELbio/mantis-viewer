import * as _ from "underscore"
import * as PIXI from "pixi.js"

import { TiffDataMap, MinMaxMap, SpriteMap, ImageBitmapMap } from "../interfaces/ImageInterfaces"

export class ImageData {

    data: TiffDataMap
    minmax: MinMaxMap
    sprites: SpriteMap

    width: number
    height: number

    get channelNames() : string[] {
        let channelNames = _.keys(this.data).sort()
        return(channelNames)
    }

    meanPixelIntensity(chName:string, pixels:number[]):number {
        if(chName in this.data) {
            let chData = this.data[chName]
            let sum = 0
            let count = 0
            for (let curPixel of pixels){
                sum += chData[curPixel]
                count += 1
            }
            return sum/count
        }
        else {
            throw new Error('Channel name ' + chName + ' not found in ' + this.channelNames.toString())
        }
    }

    medianPixelIntensity(chName:string, pixels:number[]):number {
        if(chName in this.data) {
            let chData = this.data[chName]
            let values = []
            for (let curPixel of pixels){
                values.push(chData[curPixel])
            }
            // Find the median! Sort the intensity values by intensity.
            values.sort()
            let length = values.length
            if(length % 2 == 0){
                // If even take the average of the two middle intensity values
                return (values[(length/2) - 1] + values[length/2])/2
            } else {
                // If odd return the middle intensity value
                return values[Math.ceil(length/2) - 1]
            }
        }
        else {
            throw new Error('Channel name ' + chName + ' not found in ' + this.channelNames.toString())
        }
    }

    imageBitmapsToSprites(bitmaps: ImageBitmapMap) {
        let sprites:SpriteMap = {}
        for(let chName in bitmaps){
            let bitmap = bitmaps[chName]
            let offScreen = document.createElement("canvas")

            offScreen.width = bitmap.width
            offScreen.height = bitmap.height

            let ctx = offScreen.getContext("2d")
            if(ctx) ctx.drawImage(bitmap, 0, 0)
            sprites[chName] = new PIXI.Sprite(PIXI.Texture.fromCanvas(offScreen))
        }
        return sprites
    }

    constructor(data: TiffDataMap, minmax: MinMaxMap, bitmaps: ImageBitmapMap, width: number, height: number) {
        this.data = data
        this.minmax = minmax
        this.sprites = this.imageBitmapsToSprites(bitmaps)
        this.width = width
        this.height = height
    }
}