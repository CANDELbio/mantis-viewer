jest.mock('../workers/ImageDataWorker')
jest.mock('pixi.js')
import * as path from 'path'
import { ImageData } from './ImageData'

beforeEach(() => {
    const createElement = document.createElement.bind(document)
    document.createElement = (tagName: any) => {
        if (tagName === 'canvas') {
            return {
                getContext: () => ({}),
                measureText: () => ({}),
            }
        }
        return createElement(tagName)
    }
})

test('loadFolder', function() {
    let folder = path.join(process.cwd(), 'test/files/project/set_one')
    let imageData = new ImageData()
    imageData.loadFolder(folder, () => {
        console.log('Ready!')
    })
})
