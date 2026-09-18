/*
 * Stub of the vis-2 runtime, shared by the development page (`index.html`) and the screenshot page
 * (`shots.html`).
 *
 * Importing this module puts `window.visRxWidget` in place. The widgets extend it, so they may only be imported
 * afterwards - both pages load them with a dynamic `import()` after this module.
 */
import React from 'react';

const RUNTIME_WORDS: Record<string, string> = {
    'just now': 'just now',
    'for %s min.': 'for %s min.',
    forHours: 'for %s hrs. and %s min.',
    for1Hour: 'for %s hr. and %s min.',
    'for2-4Hours': 'for %s hrs. and %s min.',
    yesterday: 'yesterday',
    'for %s hours': 'for %s hours',
    opened: 'opened',
    closed: 'closed',
    open: 'Open',
    close: 'Close',
    open_lock: 'Unlock',
    close_lock: 'Lock',
    open_door: 'Open door',
    'Low battery on sash sensor': 'Low battery on sash sensor',
    'Low battery on handle sensor': 'Low battery on handle sensor',
};

class VisRxWidgetStub extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
        this.state = {
            rxData: props.rxData || {},
            rxStyle: props.rxStyle || {},
            values: props.values || {},
            editMode: !!props.editMode,
            visible: true,
        };
    }

    /** The values live in the page, not in the widget - this is what feeds them in on every change */
    static getDerivedStateFromProps(props: any, state: any): any {
        if (
            props.values !== state.values ||
            props.rxData !== state.rxData ||
            props.rxStyle !== state.rxStyle ||
            !!props.editMode !== state.editMode
        ) {
            return {
                values: props.values,
                rxData: props.rxData,
                rxStyle: props.rxStyle || {},
                editMode: !!props.editMode,
            };
        }
        return null;
    }

    static getI18nPrefix(): string {
        return '';
    }

    static t(key: string, ...args: string[]): string {
        let word = RUNTIME_WORDS[key] || key;
        for (const arg of args) {
            word = word.replace('%s', arg);
        }
        return word;
    }

    componentDidMount(): void {}

    componentWillUnmount(): void {}

    componentDidUpdate(_prevProps: any, _prevState: any): void {}

    renderWidgetBody(_props: any): any {
        return null;
    }

    render(): React.ReactNode {
        return (this as any).renderWidgetBody({ widget: {}, style: {}, className: '', overlayClassNames: [] });
    }
}

(window as any).visRxWidget = VisRxWidgetStub;

/** Fills in the defaults of `getWidgetInfo()`, the way the vis editor does when a widget is created */
export function withDefaults(Widget: any, data: Record<string, any>): Record<string, any> {
    const info = Widget.getWidgetInfo();
    const result: Record<string, any> = {};
    for (const group of info.visAttrs) {
        for (const field of group.fields) {
            if (field.default !== undefined) {
                result[field.name] = field.default;
            }
        }
    }
    return { ...result, ...data };
}
