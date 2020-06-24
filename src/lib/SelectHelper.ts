export interface SelectOption {
    label: string
    value: string
}

export const SelectStyle = {
    option: (provided: React.CSSProperties): React.CSSProperties => ({
        ...provided,
        width: '100%',
    }),
    menu: (provided: React.CSSProperties): React.CSSProperties => ({
        ...provided,
        width: '100%',
        minWidth: 'fit-content',
    }),
}

// TODO: Can't figure out which type to import from react-select
// TODO: Stick these theme colors somewhere
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SelectTheme = (theme: any): any => ({
    ...theme,
    colors: {
        ...theme.colors,
        primary: '#685bc7',
        primary75: '#857ad6',
        primary50: '#978ce6',
        primary25: '#b8aefc',
    },
})

export function generateSelectOptions(values: string[], labelTransform?: (i: string) => string): SelectOption[] {
    return values.map((s: string) => {
        const l = labelTransform ? labelTransform(s) : s
        return { value: s, label: l }
    })
}

export function getSelectedOptions(values: string[] | string | null, options: SelectOption[]): SelectOption[] | null {
    if (values) {
        return options.filter((option: SelectOption) => {
            if (Array.isArray(values)) {
                return values.includes(option.value)
            } else {
                return values == option.value
            }
        })
    }
    return null
}

export function onSelectChange(callback: (value: string) => void): (value: SelectOption) => void {
    return (selected: SelectOption): void => callback(selected.value)
}

export function onClearableSelectChange(callback: (value: string | null) => void): (value: SelectOption) => void {
    return (selected: SelectOption): void => {
        const value = selected ? selected.value : null
        callback(value)
    }
}
