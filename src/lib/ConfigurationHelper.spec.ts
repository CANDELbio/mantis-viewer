import { ConfigurationHelper } from './ConfigurationHelper'

describe('getDefaultChannelDomains', () => {
    it('should the default channel domains', () => {
        let helper = new ConfigurationHelper()
        let result = helper.getDefaultChannelDomains()
        expect(result['rChannel']).toEqual([0, 0.7])
        expect(result['gChannel']).toEqual([0, 0.7])
        expect(result['bChannel']).toEqual([0, 0.7])
    })
})

describe('getDefaultChannelMarkers', () => {
    it('should pick default channel markers by priority if they are present', () => {
        let helper = new ConfigurationHelper()
        let result = helper.getDefaultChannelMarkers(['FOO', 'CD8', 'CD4', 'CD20', 'BLAH'])
        expect(result['rChannel']).toEqual('CD4')
        expect(result['gChannel']).toEqual('CD8')
        expect(result['bChannel']).toEqual('FOO')
    })
})
