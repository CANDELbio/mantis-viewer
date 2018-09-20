import * as PIXI from "pixi.js"

export interface PixelLocation {
    x: number,
    y: number,
}

export interface RGBAColor {
    r: number,
    g: number,
    b: number,
    a: number
}

export class GraphicsHelper {
    
    public static generateSpriteFromPixels(pixels: PixelLocation[], color: RGBAColor, width: number, height: number) {
        let offScreen = document.createElement("canvas")
        offScreen.width = width
        offScreen.height = height

        let ctx = offScreen.getContext("2d")
        if(ctx) {
            let imageData = ctx.getImageData(0, 0, offScreen.width, offScreen.height)
            let canvasData = imageData.data

            
            for(let pixel of pixels){
                // Canvas data is a linear array that has four entries per pixel.
                // This is how we convert from x, y coords to the start index for the canvas data.
                let i = ((pixel.y * width) + pixel.x) * 4
                canvasData[i] = color.r
                canvasData[i+1] = color.g
                canvasData[i+2] = color.b
                canvasData[i+3] = color.a
            }
            
            ctx.putImageData(imageData, 0, 0)

        }
        return(new PIXI.Sprite(PIXI.Texture.fromCanvas(offScreen)))
    }
}