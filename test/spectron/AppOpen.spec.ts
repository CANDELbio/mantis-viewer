import * as electron from 'electron'
import { Application } from 'spectron'
import { use, expect } from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import 'mocha'

describe('Application launch', function() {
    this.timeout(10000)

    before(() => {
        use(chaiAsPromised)
    })

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

    it('shows an initial window', function() {
        expect(app.client.getWindowCount()).to.eventually.equal(2)
    })
})
