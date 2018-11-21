// Got from https://github.com/ctrlplusb/react-sizeme/issues/130
// Might be able to remove when included with an NPM release
declare module 'react-sizeme' {
    import { Component, ComponentType } from 'react'

    type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

    interface SizeMeProps {
        size: {
            width: number;
            height: number|null;
        };
    }

    export interface SizeMeOptions {
        monitorWidth?: boolean;
        monitorHeight?: boolean;
        monitorPosition?: boolean;
        refreshRate?: number;
        refreshMode?: 'throttle' | 'debounce';
        noPlaceholder?: boolean;
        children(props: SizeMeProps): JSX.Element;
    }

    export class SizeMe extends Component<SizeMeOptions> {
    }

    export const withSize: (options?: SizeMeOptions) => <P extends SizeMeProps>(component: ComponentType<P>) => ComponentType<Omit<P, 'size'>>;
}