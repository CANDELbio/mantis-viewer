import * as React from "react";
import * as ReactDOM from "react-dom"
import * as d3 from "d3-scale"
import * as Papa from "papaparse"
import * as fs from "fs"
import { ImageStore } from "../stores/ImageStore"
import { observer } from "mobx-react"

interface IMCImageProps {
    imageData: {}[]
}


@observer
export class IMCImage extends React.Component<IMCImageProps, undefined> {
    /*
    parseData(fileName:string) {
        fs.readFile(fileName, {
                encoding: 'ascii',
                flag: 'r'
            }, (err, data) => {
                let res = Papa.parse(data, {
                    delimiter: "\t",
                    header: true
                })
                console.log(res)
                console.log(res.errors)
                console.log(res.data[0])
            }
        )
    }
*/


    render() {
        console.log("IMCImage rendering")
        return(
            <div>
                <img className="imcimage"/>
            </div>
        )
    }
}