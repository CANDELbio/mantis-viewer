jest.mock('./ImageDataWorker.worker')
import { ImageDataWorker } from './ImageDataWorker'

test('terminate', function() {
    let worker = new ImageDataWorker()
    worker.terminate()
})
