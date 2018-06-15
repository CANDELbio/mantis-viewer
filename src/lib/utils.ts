
//Assumes the input array to be sorted
export function quantile(array:number[] | Float32Array | Uint16Array, 
    prob:number, isSorted: boolean) {
    let v = isSorted ? array : array.slice().sort((a, b) => a - b)
    let len = v.length
    let index = prob * (len-1);
    var fracPart = index % 1;
    let ret:number = 0

    if (fracPart === 0) {
        let value = v[index]
        ret = value
    } else {
        let integerPart = Math.floor(index);

        let left = v[integerPart];
        let right = v[integerPart+1];

        // Q(prob) = (1-f)*A[floor(index)] + f*A[floor(index)+1]
        ret = (left * (1 - fracPart)) + (right * fracPart)
    }
    return(ret)
}

export function rescaler(domain:[number, number], range:[number, number]) {
    let diffDomain = domain[1] - domain[0]
    let diffRange = range[1] - range[0]

    return (x:number) => {
        return((x - domain[0]) / diffDomain * diffRange + range[0])
    }
}