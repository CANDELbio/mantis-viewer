import { SelectOption } from '../definitions/UIDefinitions'

export const SelectStyle = {
    option: (provided: React.CSSProperties) => ({
        ...provided,
        width: '100%',
    }),
    menu: (provided: React.CSSProperties) => ({
        ...provided,
        width: '100%',
        minWidth: 'fit-content',
    }),
}

export function generateSelectOptions(values: string[], labelTransform?: (i: string) => string): SelectOption[] {
    return values.map((s: string) => {
        let l = labelTransform ? labelTransform(s) : s
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
