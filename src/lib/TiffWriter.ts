/* eslint-disable @typescript-eslint/no-explicit-any */
// Heavily inspired by and borrowed from canvas-to-tiff
// https://github.com/motiz88/canvas-to-tiff/blob/master/src/canvastotiff.js
import * as fs from 'fs'

export const TiffWriter = {
    /**
     * @private
     */
    _dly: 9,

    /**
     * Convert a Uint8ClampedArray to an ArrayBuffer containing an 8 bit grayscale TIFF file
     * of width x height. The call is asynchronous so a callback must be provided.
     */
    toArrayBuffer: function (
        arr: Uint8ClampedArray,
        width: number,
        height: number,
        callback: (arr: ArrayBuffer) => void,
        options: { littleEndian?: boolean },
    ): void {
        options = options || {}

        const w = width,
            h = height,
            iOffset = 258, // todo calc based on offset field length, add to final offset when compiled
            offsetList: number[] = [],
            sid = 'MantisViewer\0',
            lsb = !!options.littleEndian,
            xRes = 10000,
            yRes = 10000,
            length = arr.length,
            fileLength = iOffset + length,
            file = new ArrayBuffer(fileLength),
            file8 = new Uint8Array(file),
            view = new DataView(file),
            date = new Date()

        let pos = 0,
            offset = 0,
            entries = 0,
            idfOffset: number,
            dateStr: string

        function pad2(str: string): string {
            str += ''
            return str.length === 1 ? '0' + str : str
        }

        // helper method to move current buffer position
        function set16(data: number): void {
            view.setUint16(pos, data, lsb)
            pos += 2
        }

        function set32(data: number): void {
            view.setUint32(pos, data, lsb)
            pos += 4
        }

        function setStr(str: string): void {
            let i = 0
            while (i < str.length) view.setUint8(pos++, str.charCodeAt(i++) & 0xff)
            if (pos & 1) pos++
        }

        function getStrLen(str: string): number {
            const l = str.length
            return l & 1 ? l + 1 : l
        }

        function addEntry(tag: number, type: number, count: number, value: number, dltOffset?: number): void {
            set16(tag)
            set16(type)
            set32(count)

            if (dltOffset) {
                offset += dltOffset
                offsetList.push(pos)
            }

            if (count === 1 && type === 3 && !dltOffset) {
                set16(value)
                set16(0) // pad
            } else {
                set32(value)
            }

            entries++
        }

        function addIDF(offset?: number): void {
            idfOffset = offset || pos
            pos += 2
        }

        function endIDF(): void {
            view.setUint16(idfOffset, entries, lsb)
            set32(0)

            const delta = 14 + entries * 12 // 14 = offset to IDF (8) + IDF count (2) + end pointer (4)

            // compile offsets
            for (let i = 0; i < offsetList.length; i++) {
                const p = offsetList[i]
                const o = view.getUint32(p, lsb)
                view.setUint32(p, o + delta, lsb)
            }
        }
        // Header
        set16(lsb ? 0x4949 : 0x4d4d) // II or MM
        set16(42) // magic 42
        set32(8) // offset to first IFD

        // IFD
        addIDF() // IDF start
        addEntry(0xfe, 4, 1, 0) // NewSubfileType
        addEntry(0x100, 4, 1, w) // ImageWidth
        addEntry(0x101, 4, 1, h) // ImageLength (height)
        addEntry(0x102, 3, 1, 8) // BitsPerSample
        addEntry(0x103, 3, 1, 1) // Compression
        addEntry(0x106, 3, 1, 1) // PhotometricInterpretation: BlackIsZero
        addEntry(0x111, 4, 1, iOffset, 0) // StripOffsets
        addEntry(0x115, 3, 1, 1) // SamplesPerPixel
        addEntry(0x117, 4, 1, length) // StripByteCounts
        addEntry(0x11a, 5, 1, offset, 8) // XResolution
        addEntry(0x11b, 5, 1, offset, 8) // YResolution
        addEntry(0x128, 3, 1, 3) // ResolutionUnit: cm
        addEntry(0x131, 2, sid.length, offset, getStrLen(sid)) // sid
        addEntry(0x132, 2, 0x14, offset, 0x14) // Datetime
        endIDF()

        // Fields section > long ---------------------------

        // XRes PPI
        set32(xRes)
        set32(1)

        // YRes PPI
        set32(yRes)
        set32(1)

        // sid
        setStr(sid)

        // date
        dateStr =
            date.getFullYear() +
            ':' +
            pad2((date.getMonth() + 1).toString()) +
            ':' +
            pad2(date.getDate().toString()) +
            ' '
        dateStr +=
            pad2(date.getHours().toString()) +
            ':' +
            pad2(date.getMinutes().toString()) +
            ':' +
            pad2(date.getSeconds().toString())
        setStr(dateStr)

        // Image data here (todo if very large, split into block based copy)
        file8.set(arr, iOffset)

        // make actual async
        setTimeout(function () {
            callback(file)
        }, this._dly)
    },

    arrayToFile: function (
        arr: Uint8ClampedArray,
        width: number,
        height: number,
        filename: string,
        options?: any,
    ): void {
        this.toArrayBuffer(
            arr,
            width,
            height,
            function (arr: ArrayBuffer) {
                fs.appendFileSync(filename, Buffer.from(arr))
            },
            options || {},
        )
    },
}
