// Simplified port of https://github.com/ZELLMECHANIK-DRESDEN/fcswrite/blob/master/fcswrite/fcswrite.py

import { range } from 'd3'
import * as fs from 'fs'

let sanatize: Record<string, string> = { µ: 'u', '²': '2', ' ': '', '?': '', _: '' }

// Use this method to generate a buffer that will allow us to write the floats represented as binary floats instead of strings.
function floatArrayToBuffer(data: number[]): Buffer {
    let arr = Float32Array.from(data)
    let buffer = Buffer.alloc(arr.length * arr.BYTES_PER_ELEMENT)
    for (let i = 0; i < arr.length; i++) {
        // Write the float in Big-Endian and move the offset
        buffer.writeFloatBE(arr[i], i * arr.BYTES_PER_ELEMENT)
    }
    return buffer
}

// Data should have one row per event, and each row should have one entry per chName in order of chNames.
export function writeToFCS(filename: string, chNames: string[], data: number[][], version?: string): void {
    // Sanity check. Every row should have an entry for every channel.
    data.map((value: number[]) => {
        if (chNames.length != value.length) throw 'Length of data content does not match length of chNames'
    })

    // Sanatize Channel Names for Compatability with FCS Reading Software
    let sanatizedChNames = chNames.map(
        (value: string): string => {
            let sanatized = value
            for (let key in sanatize) {
                sanatized = sanatized.replace(key, sanatize[key])
            }
            return sanatized
        },
    )

    // DATA segment
    let flattenedData = ([] as number[]).concat(...data)
    let binaryData = floatArrayToBuffer(flattenedData)

    // TEXT segment
    let headerSize = 256

    let text = '/$BEGINANALYSIS/0/$ENDANALYSIS/0'
    text += '/$BEGINSTEXT/0/$ENDSTEXT/0'
    // Add placeholders for $BEGINDATA and $ENDDATA, because we don't
    // know yet how long TEXT is.
    text += '/$BEGINDATA/{data_start_byte}/$ENDDATA/{data_end_byte}'
    // Default to Big Endian. If want to do LE, need to write 1,2,3,4 and switch floatArrayToBuffer method.
    text += '/$BYTEORD/4,3,2,1/$DATATYPE/F'
    text += `/$MODE/L/$NEXTDATA/0/$TOT/${data.length}`
    text += `/$PAR/${chNames.length}`
    text += '/$CYT/MantisViewer'
    if (version) text += version

    // Check for content of data columns and set range
    for (let i of range(chNames.length)) {
        let chValues = data.map((value: number[]) => {
            return value[i]
        })
        let range = Math.max(...chValues)
        let name = sanatizedChNames[i]
        let j = i + 1
        text += `/$P${j}B/32/$P${j}E/0,0/$P${j}N/${name}/$P${j}R/${range}/$P${j}D/Linear`
    }
    text += '/'

    // SET $BEGINDATA and $ENDDATA using the current size of TEXT plus padding.
    let textPadding = 47 // for visual separation and safety
    let dataStartByte = headerSize + text.length + textPadding
    let dataEndByte = dataStartByte + (binaryData.length - 1)
    text = text.replace('{data_start_byte}', dataStartByte.toString())
    text = text.replace('{data_end_byte}', dataEndByte.toString())
    let lenText = text.length
    // Pad TEXT segment with spaces until data_start_byte
    text = text.padEnd(dataStartByte - headerSize)

    // HEADER segment
    let ver = 'FCS3.0'
    let textFirst = headerSize.toString().padStart(8)
    let textLast = (lenText + headerSize - 1).toString().padStart(8)

    // Starting with FCS 3.0, data segment can end beyond byte 99,999,999,
    // in which case a zero is written in each of the two header fields (the
    // values are given in the text segment keywords $BEGINDATA and $ENDDATA)
    let dataFirst = '0'.padStart(8)
    let dataLast = '0'.padStart(8)
    if (dataEndByte <= 99999999) {
        dataFirst = dataStartByte.toString().padStart(8)
        dataLast = dataEndByte.toString().padStart(8)
    }

    // We don't have an analysis segment. Write 0s for the start/end.
    let anaFirst = '0'.padStart(8)
    let anaLast = '0'.padStart(8)

    let header = (ver + '    ' + textFirst + textLast + dataFirst + dataLast + anaFirst + anaLast).padEnd(256)

    //Write to file
    var stream = fs.createWriteStream(filename)
    stream.write(Buffer.from(header, 'ascii'))
    stream.write(Buffer.from(text, 'ascii'))
    stream.write(binaryData)
    // Not doing a CRC. Write all 0s.
    stream.write(Buffer.from('00000000', 'ascii'))
    stream.close()
}
