import { calculateMean, calculateMedian } from './StatsHelper'

describe('calculateMean', () => {
    it('should return the mean for a set of integers', () => {
        let result = calculateMean([1, 2, 3, 4, 5])
        expect(result).toEqual(3)
    })
})

describe('calculateMedian', () => {
    it('should return the median for a set of integers', () => {
        let result = calculateMedian([100, 22, 33, 80, 1])
        expect(result).toEqual(33)
    })
})
