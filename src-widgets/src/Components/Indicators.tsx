import React from 'react';

/** Low battery marker - the same icon the vis-1 widget set drew inline */
export function BatteryIcon(props: {
    size?: number;
    color?: string;
    angle?: number;
    title?: string;
}): React.JSX.Element {
    const size = props.size || 32;
    return (
        <div
            className="hq-battery"
            title={props.title}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 48 48"
            >
                <path
                    fill={props.color || '#FF5555'}
                    transform={`rotate(${props.angle === undefined ? -90 : props.angle}, 24, 24)`}
                    d="M31.33 8h-3.33v-4h-8v4h-3.33c-1.48 0-2.67 1.19-2.67 2.67v30.67c0 1.47 1.19 2.67 2.67 2.67h14.67c1.47 0 2.67-1.19 2.67-2.67v-30.67c-.01-1.48-1.2-2.67-2.68-2.67zm-5.33 28h-4v-4h4v4zm0-8h-4v-10h4v10z"
                />
            </svg>
        </div>
    );
}

/** Shown while the value is not acknowledged yet, or while the "working" state is true */
export function WorkingIcon(props: { size?: number }): React.JSX.Element {
    const size = props.size || 16;
    return (
        <div className="hq-working">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="#666"
            >
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
            </svg>
        </div>
    );
}

/** Shown as long as the configured state has no value at all */
export function NoDataIcon(props: { size?: number }): React.JSX.Element {
    const size = props.size || 16;
    return (
        <div className="hq-nodata">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
            </svg>
        </div>
    );
}
