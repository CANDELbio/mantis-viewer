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

test('loadFolder', function () {
    const folder = path.join(process.cwd(), 'test/files/project/set_one')
    const imageData = new ImageData()
    imageData.loadFolder(folder, null, () => {
        console.log('Ready!')
    })
})
