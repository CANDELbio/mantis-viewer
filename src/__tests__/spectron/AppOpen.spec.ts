import * as electron from 'electron'
import { Application } from 'spectron'

describe('Application launch', function() {
    let app: Application = new Application({
        // path to electron app
        args: ['./main.js'],
        path: '' + electron,
        startTimeout: 30000,
        waitTimeout: 30000,
    })

    beforeEach(function() {
        return app.start()
    })

    afterEach(function() {
        return app.stop()
    })

    it('shows an initial window', async function() {
        jest.setTimeout(10000)
        let windowCount = await app.client.getWindowCount()
        expect(windowCount).toEqual(3)
    })
})
