import { State } from "../interfaces/State"
import { connect } from "react-redux"
import { Dispatch } from "redux"
import * as Hello from "../components/Hello"
import * as UserActions from "../actions/UserActions"


const mapStateToProps = (state: State, ownprops: Hello.HelloProps) : Hello.HelloProps => {
    return {
        compiler: "Gino",
        framework: "Pino",
        value: state.value
    }
}


const mapDispatchToProps = (dispatch: any, ownprops: Hello.HelloProps) : Hello.HelloProps => {
    return {...ownprops, 
        onSliderChange: (value: number) => {
            dispatch(UserActions.setValue(value))
        },
        onSelectFile: (value: string) => {
            dispatch(UserActions.selectFile(value))
        }
    }
}

export const MainFrame = connect<{}, {}, {}>(mapStateToProps, mapDispatchToProps)(Hello.Hello)

