import * as electron from 'electron'
import { Application } from 'spectron'
import { expect } from 'chai'
import 'mocha'

describe('application launch', function() {
    this.timeout(10000)

    let app: Application

    beforeEach(function() {
        // start application
        app = new Application({
            // path to electron app
            args: ['./main.js'],
            path: '' + electron,
            startTimeout: 30000,
            waitTimeout: 30000,
        })
        return app.start()
    })

    afterEach(function() {
        return app.stop()
    })

    it('shows an initial window', function() {
        return app.client.getWindowCount().then(function(count: number) {
            // 2 because there are two windows (plot starts hidden)
            expect(count).to.eql(2)
        })
    })
})
