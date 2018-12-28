export function calculateMedian(input: number[]){
    let sorted = input.sort()
    let length = sorted.length
    if(length % 2 == 0){
        // If even take the average of the two middle intensity values
        return (sorted[(length/2) - 1] + sorted[length/2])/2
    } else {
        // If odd return the middle intensity value
        return sorted[Math.ceil(length/2) - 1]
    }
}

export function calculateMean(input: number[]){
    let sum = 0
    let count = 0
    for (let value of input){
        sum += value
        count += 1
    }
    return sum/count
}
