jest.mock(
    'worker-loader?name=dist/[name].js!../workers/ImageDataWorker.worker',
    () => {
        return jest.fn().mockImplementation(() => {
            return {}
        })
    },
    { virtual: true },
)
import { ImageDataWorker } from './ImageDataWorker'

test('terminate', function() {
    let worker = new ImageDataWorker()
    worker.terminate()
})
