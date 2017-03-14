import * as React from "react";
import * as ReactDOM from "react-dom"
import Jimp = require("jimp")

interface ImageProps {
    width: number
    height: number
    imgData: any
}

export class Image extends React.Component<ImageProps, undefined> {
    constructor(props: ImageProps) {
        super(props)
    }
    /*
    mountImg(imgEl: HTMLImageElement) {
        console.log("In mount img")
        console.log(imgEl)
        console.log(this.props.fileName)
        let width = this.props.width
        let height = this.props.height
        if(this.props.fileName != null) {
            Jimp.read(this.props.fileName).then(function (img: any) {
                    console.log(img)
                    img.resize(width, height)
                    .color([
                        { apply: 'red', params: [50] }
                    ])            
                    .getBase64(Jimp.MIME_JPEG, function (err:any , src:any) {
                        imgEl.setAttribute("src", src)
                        imgEl.setAttribute("width", width.toString())
                        imgEl.setAttribute("height", height.toString())
                    });
                }).catch(function (err:any) {
                    console.error(err);
                });
        }
    }

    */

    mountImg(imgEl: HTMLImageElement) {
        if(imgEl != null) {
            let width = this.props.width
            let height = this.props.height
            this.props.imgData.getBase64(Jimp.MIME_JPEG, function (err:any , src:any) {
                            imgEl.setAttribute("src", src)
                            imgEl.setAttribute("width", width.toString())
                            imgEl.setAttribute("height", height.toString())
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

