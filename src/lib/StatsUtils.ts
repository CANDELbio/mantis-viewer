export function calculateMedian(input: number[]): number {
    const sorted = input.sort((n1, n2) => n1 - n2)
    const length = sorted.length
    if (length % 2 == 0) {
        // If even take the average of the two middle intensity values
        return (sorted[length / 2 - 1] + sorted[length / 2]) / 2
    } else {
        // If odd return the middle intensity value
        return sorted[Math.ceil(length / 2) - 1]
    }
}

export function calculateMean(input: number[]): number {
    let sum = 0
    let count = 0
    for (const value of input) {
        sum += value
        count += 1
    }
    return sum / count
}

export function calculateSum(input: number[]): number {
    return input.reduce((a: number, b: number) => a + b, 0)
}
