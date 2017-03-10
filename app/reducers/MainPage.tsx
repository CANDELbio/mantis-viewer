import { State } from "../interfaces/State"
import { Action } from "../actions/UserActions"

export function mainPage(state: State, action: Action): State {
    switch(action.type) {
        case "SetValue": return {...state, value: action.value}
        case "SelectFile": return{...state, selectedFile: action.value}
        default:
            const _exhaustiveCheck: never = action;
            return state;
    }
}

