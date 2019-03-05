import 'jsdom-global/register'
import { ImageData } from './ImageData'
import { expect } from 'chai'
import * as path from 'path'
import 'mocha'

// Currently failing with a 'Worker is not defined' error
// describe('loadFolder', () => {
//     it('should load all files in a folder', () => {
//         let imageData = new ImageData()
//         let folder = path.join(process.cwd(), 'test/files/project/set_one')
//         imageData.loadFolder(folder, (d: ImageData) => {
//             console.log('Ready!')
//         })
//     })
// })
