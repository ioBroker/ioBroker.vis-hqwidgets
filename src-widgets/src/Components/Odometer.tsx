import React from 'react';

/**
 * The rolling number display of `tplHqOdometer` - the replacement for `odometer.js` and its seven theme
 * stylesheets. Each digit is a vertical ribbon of 0...9 that is moved with a CSS transform.
 */

export interface OdometerFormat {
    /** Separator between groups of the integer part, e.g. `.` in `1.234` */
    groupSeparator: string;
    /** Size of such a group, usually 3 */
    groupSize: number;
    /** Separator before the decimals, e.g. `,` */
    decimalSeparator: string;
    /** Number of decimal places */
    decimals: number;
}

/**
 * Parses the format string of the vis-1 widget, e.g. `(.ddd),dd`:
 * the part in the brackets repeats over the integer digits, what follows describes the decimals.
 */
export function parseFormat(format: string | undefined | null): OdometerFormat {
    const result: OdometerFormat = { groupSeparator: '', groupSize: 3, decimalSeparator: '', decimals: 0 };
    const parsed = /^\(?([^)]*)\)?(?:(.)(d+))?$/.exec(format || '(.ddd),dd');
    if (!parsed) {
        return result;
    }
    const group = parsed[1] || 'ddd';
    const separator = group.replace(/d/g, '');
    result.groupSeparator = separator;
    result.groupSize = (group.match(/d/g) || []).length || 3;
    if (parsed[2] && parsed[3]) {
        result.decimalSeparator = parsed[2];
        result.decimals = parsed[3].length;
    }
    return result;
}

/** Splits the value into the characters to show, applying grouping, decimals and optional leading zeros */
export function formatOdometerValue(value: number, format: OdometerFormat, leadingZeros: boolean): string {
    const negative = value < 0;
    const fixed = Math.abs(value).toFixed(format.decimals);
    const [rawInteger, decimals] = fixed.split('.');

    let integer = rawInteger;
    if (leadingZeros && integer.length < format.groupSize) {
        integer = integer.padStart(format.groupSize, '0');
    }

    let grouped = integer;
    if (format.groupSeparator) {
        const parts: string[] = [];
        for (let end = integer.length; end > 0; end -= format.groupSize) {
            parts.unshift(integer.substring(Math.max(0, end - format.groupSize), end));
        }
        grouped = parts.join(format.groupSeparator);
    }

    let text = grouped;
    if (format.decimals && decimals) {
        text += (format.decimalSeparator || '.') + decimals;
    }
    return negative ? `-${text}` : text;
}

interface OdometerProps {
    value: number;
    format: OdometerFormat;
    leadingZeros: boolean;
    theme: string;
    /** Duration of the roll in ms */
    duration: number;
}

/** One digit column - the ribbon carries 0...9 and is shifted to the wanted digit */
function Digit(props: { digit: number; duration: number }): React.JSX.Element {
    return (
        <span
            className="hq-odometer-digit"
            style={{ height: '1.1em' }}
        >
            {/* Keeps the column as wide as the widest digit */}
            <span style={{ visibility: 'hidden' }}>0</span>
            <span
                className="hq-odometer-ribbon"
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    transform: `translateY(-${props.digit * 10}%)`,
                    transitionDuration: `${props.duration}ms`,
                }}
            >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <span
                        key={n}
                        style={{ height: '1.1em', lineHeight: '1.1em' }}
                    >
                        {n}
                    </span>
                ))}
            </span>
        </span>
    );
}

export default function Odometer(props: OdometerProps): React.JSX.Element {
    const text = formatOdometerValue(props.value, props.format, props.leadingZeros);

    return (
        <span className={`hq-odometer hq-odometer-${props.theme || 'car'}`}>
            {text.split('').map((char, index) =>
                char >= '0' && char <= '9' ? (
                    <Digit
                        key={index}
                        digit={parseInt(char, 10)}
                        duration={props.duration}
                    />
                ) : (
                    <span
                        key={index}
                        className="hq-odometer-separator"
                    >
                        {char}
                    </span>
                ),
            )}
        </span>
    );
}
