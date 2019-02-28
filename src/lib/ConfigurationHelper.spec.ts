import { getDefaultChannelMarkers, getDefaultChannelDomains } from './ConfigurationHelper'
import { expect } from 'chai'
import 'mocha'

describe('getDefaultChannelDomains', () => {
    it('should the default channel domains', () => {
        let result = getDefaultChannelDomains()
        expect(result['rChannel']).to.eql([0, 0.7])
        expect(result['gChannel']).to.eql([0, 0.7])
        expect(result['bChannel']).to.eql([0, 0.7])
    })
})

describe('getDefaultChannelMarkers', () => {
    it('should pick default channel markers by priority if they are present', () => {
        let result = getDefaultChannelMarkers(['FOO', 'CD8', 'CD4', 'CD20', 'BLAH'])
        expect(result['rChannel']).to.eql('CD4')
        expect(result['gChannel']).to.eql('CD8')
        expect(result['bChannel']).to.eql('FOO')
    })
})
