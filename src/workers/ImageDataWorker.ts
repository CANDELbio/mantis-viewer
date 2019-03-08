import Worker = require('worker-loader?name=dist/[name].js!../workers/ImageDataWorker.worker')

export class ImageDataWorker {
    private worker: Worker

    public constructor() {
        this.worker = new Worker()
    }

    public terminate(): void {
        this.worker.terminate
    }

    public addEventListener(type: string, listener: (ev: MessageEvent) => void, options?: boolean): void {
        this.worker.addEventListener(type, listener, options)
    }

    public postMessage(message: any): void {
        this.worker.postMessage(message)
    }
}
