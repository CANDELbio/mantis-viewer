interface SetValue {
    type: "SetValue"
    value: number
}

interface SelectFile {
    type: "SelectFile"
    value: string
}

export function setValue(x: number) : SetValue {
    return {
        type: "SetValue", 
        value: x
    }
}

export function selectFile(x: string) : SelectFile {
    return {
        type: "SelectFile",
        value: x
    }
}

export type Action = SetValue | SelectFile

