jest.mock('../workers/ImageDataWorker')
jest.mock('pixi.js', () => {
    return jest.fn().mockImplementation(() => {
        return {}
    })
})
jest.mock(
    'worker-loader?name=dist/[name].js!../workers/ImageDataWorker.worker',
    () => {
        return jest.fn().mockImplementation(() => {
            return {}
        })
    },
    { virtual: true },
)
import * as path from 'path'
import { ImageData } from './ImageData'

test('loadFolder', function() {
    let folder = path.join(process.cwd(), 'test/files/project/set_one')
    let imageData = new ImageData()
    imageData.loadFolder(folder, () => {
        console.log('Ready!')
    })
})
