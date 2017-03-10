import * as React from "react";
import * as ReactDOM from "react-dom"
import Jimp = require("jimp")

interface ImageProps {
    width: number
    height: number
}

export class Image extends React.Component<ImageProps, undefined> {
    constructor(props: ImageProps) {
        super(props)
    }

    mountImg(img: HTMLImageElement) {
        console.log("In mount img")
        console.log(img)
        Jimp.read("https://media.licdn.com/mpr/mpr/shrinknp_200_200/p/5/005/09a/2fc/3f167f3.jpg")       .then(function (lenna: any) {
                lenna.resize(256, 256)            // resize
                .quality(60)                 // set JPEG quality
                .greyscale()                 // set greyscale
                .getBase64(Jimp.MIME_JPEG, function (err:any , src:any) {
                    img.setAttribute("src", src)
                    img.setAttribute("width", "250")
                    img.setAttribute("height", "250")
                });
            }).catch(function (err:any) {
                console.error(err);
            });
    }


    render() {
        return(
            <div>
                <img
                    ref={(img) => {this.mountImg(img)}}
                />
            </div>
        )
    }
}

