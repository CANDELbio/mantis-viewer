import * as React from "react";
import * as ReactDOM from "react-dom"
import Jimp = require("jimp")

interface ImageProps {
    width: number
    height: number
    fileName: string | null
}

export class Image extends React.Component<ImageProps, undefined> {
    constructor(props: ImageProps) {
        super(props)
    }

    mountImg(img: HTMLImageElement) {
        console.log("In mount img")
        console.log(img)
        console.log(this.props.fileName)
        if(this.props.fileName != null)
        {
            Jimp.read(this.props.fileName).then(function (lenna: any) {
                    console.log(lenna)
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

