/* eslint-disable @typescript-eslint/no-empty-function */
jest.mock(
    'worker-loader?name=dist/[name].js!../workers/ImageDataWorker.worker',
    () => {
        return jest.fn().mockImplementation(() => {
            return {
                addEventListener: (): void => {},
            }
        })
    },
    { virtual: true },
)
import { ImageDataWorker } from './ImageDataWorker'

test('terminate', function () {
    const worker = new ImageDataWorker(() => {})
    worker.terminate()
})
