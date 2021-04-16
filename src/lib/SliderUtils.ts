export function labelStepSize(sliderMax: number): number {
    const unroundedStepSize = sliderMax / 3
    const roundedStepSize = Math.round(unroundedStepSize)
    return roundedStepSize == 0 ? unroundedStepSize : roundedStepSize
}

export function stepSize(sliderMax: number): number {
    return sliderMax / 1000 // Might want to change the number/size of steps. Seemed like a good starting point.
}

export function sliderLabelRendererFunction(sliderMax: number): (value: number) => string {
    return (value: number): string => {
        if (sliderMax < 1) {
            return value.toFixed(3)
        } else if (sliderMax < 1000) {
            return value.toFixed(1)
        } else {
            return value.toExponential(1)
        }
    }
}
