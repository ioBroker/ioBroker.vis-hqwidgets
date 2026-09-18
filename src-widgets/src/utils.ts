/**
 * Helpers shared by all hqWidgets.
 *
 * Widget attributes come out of the vis editor as strings, so every value that is logically a boolean or a number
 * has to be coerced before use - the vis-1 widget set did that inline everywhere, here it lives in one place.
 */

/** `true`, `'true'` and `1` are true; everything else is false */
export function isTrue(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
}

/** Parses a value that may be a number, a numeric string or empty. Returns `defaultValue` when it is not a number */
export function toNumber(value: unknown, defaultValue = 0): number {
    if (typeof value === 'number') {
        return isFinite(value) ? value : defaultValue;
    }
    if (typeof value !== 'string' || value === '') {
        return defaultValue;
    }
    const parsed = parseFloat(value.replace(',', '.'));
    return isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Turns a configured on/off value into the value that is written to the state.
 *
 * The vis-1 widgets accepted `true`/`false`/numbers/strings in the same field, so `'0'` has to end up as the
 * number `0` and `'false'` as the boolean `false`, while a plain text stays text.
 */
export function toStateValue(
    value: string | number | boolean | undefined | null,
    fallback: string | number | boolean,
): string | number | boolean {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    if (typeof value === 'boolean' || typeof value === 'number') {
        return value;
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    const parsed = parseFloat(value);
    if (parsed.toString() === value) {
        return parsed;
    }
    return value;
}

/** Formats a number with the configured digits and decimal separator */
export function formatNumber(value: number, digits: number | null, isComma: boolean): string {
    let result = digits === null || digits === undefined ? value.toString() : value.toFixed(digits);
    if (isComma) {
        result = result.replace('.', ',');
    }
    return result;
}

/** Appends `px` if the value carries no unit yet */
export function withPx(value: string | number | undefined | null, defaultValue: string): string {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    const str = value.toString();
    return /px$|rem$|em$|%$/.test(str) ? str : `${str}px`;
}

/**
 * "Last change" text, e.g. "for 5 min.".
 *
 * Returns an empty string when the change is older than `hoursToShow`, which is how the widget hides the line.
 * `t` is `Generic.t` - the caller passes it in so this stays free of the widget base class.
 */
export function getTimeInterval(
    lastChange: number | string | undefined | null,
    hoursToShow: number,
    t: (key: string, ...args: string[]) => string,
): string {
    if (!lastChange) {
        return '';
    }

    let timestamp: number = typeof lastChange === 'string' ? new Date(lastChange).getTime() : lastChange;

    // if less than 2000.01.01 00:00:00 it must be seconds and not milliseconds
    if (timestamp < 946681200000) {
        timestamp *= 1000;
    }

    const seconds = (Date.now() - timestamp) / 1000;

    if (seconds < 0) {
        return '';
    }
    if (hoursToShow && seconds / 3600 > hoursToShow) {
        return '';
    }

    if (seconds < 60) {
        return t('just now');
    }
    if (seconds <= 3600) {
        return t('for %s min.', Math.floor(seconds / 60).toString());
    }
    if (seconds <= 3600 * 24) {
        const hrs = Math.floor(seconds / 3600);
        const min = Math.floor(seconds / 60) % 60;
        if (hrs === 1 || hrs === 21) {
            return t('for1Hour', hrs.toString(), min.toString());
        }
        if (hrs >= 2 && hrs <= 4) {
            return t('for2-4Hours', hrs.toString(), min.toString());
        }
        return t('forHours', hrs.toString(), min.toString());
    }
    if (seconds <= 3600 * 48) {
        return t('yesterday');
    }
    return t('for %s hours', Math.floor(seconds / 3600).toString());
}

const pad = (num: number, size = 2): string => num.toString().padStart(size, '0');

/**
 * Formats a timestamp with the format strings the vis-1 widget offered
 * (`YYYY.MM.DD hh:mm:ss`, `DD.MM.YYYY hh:mm:ss`, `YYYY/MM/DD hh:mm:ss`, `hh:mm:ss`, `hh:mm`).
 */
export function formatDate(timestamp: number | string | undefined | null, format?: string): string {
    if (!timestamp) {
        return '';
    }
    let ms: number = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    if (ms < 946681200000) {
        ms *= 1000;
    }
    const date = new Date(ms);
    if (isNaN(date.getTime())) {
        return '';
    }

    return (format || 'DD.MM.YYYY hh:mm:ss')
        .replace('YYYY', date.getFullYear().toString())
        .replace('MM', pad(date.getMonth() + 1))
        .replace('DD', pad(date.getDate()))
        .replace('hh', pad(date.getHours()))
        .replace('mm', pad(date.getMinutes()))
        .replace('ss', pad(date.getSeconds()));
}

/**
 * Text of the left/right description.
 *
 * The vis-1 widgets replaced every space with `&nbsp;` so a description never wrapped, and `\n` with a line
 * break. Here the same is expressed with real line breaks plus `white-space: pre` on the element.
 */
export function descriptionToText(text: string | undefined | null): string {
    return (text || '').replace(/\\n/g, '\n');
}

/** Widths of the value arc: `circleWidth` is a percentage on top of the widget width */
export function arcSize(widgetWidth: number, circleWidth: number | string | undefined): number {
    return Math.round(((100 + toNumber(circleWidth, 50)) * widgetWidth) / 100);
}

/** `#rgb`, `#rrggbb`, `rgb()` and `rgba()` to [r, g, b], or `null` for anything else */
function parseColor(color: string): [number, number, number] | null {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
    if (hex) {
        const value = hex[1];
        if (value.length === 3) {
            return [
                parseInt(value[0] + value[0], 16),
                parseInt(value[1] + value[1], 16),
                parseInt(value[2] + value[2], 16),
            ];
        }
        return [
            parseInt(value.substring(0, 2), 16),
            parseInt(value.substring(2, 4), 16),
            parseInt(value.substring(4, 6), 16),
        ];
    }
    const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(color.trim());
    if (rgb) {
        return [Math.round(parseFloat(rgb[1])), Math.round(parseFloat(rgb[2])), Math.round(parseFloat(rgb[3]))];
    }
    return null;
}

/**
 * Mixes a colour with white (`amount` > 0) or black (`amount` < 0), where 1 is fully white and -1 fully black.
 * A colour that cannot be parsed - a name like `red`, or a CSS variable - is returned unchanged.
 */
export function shade(color: string, amount: number): string {
    const rgb = parseColor(color);
    if (!rgb) {
        return color;
    }
    const target = amount >= 0 ? 255 : 0;
    const ratio = Math.min(1, Math.abs(amount));
    const mix = (value: number): number => Math.round(value + (target - value) * ratio);
    return `rgb(${mix(rgb[0])}, ${mix(rgb[1])}, ${mix(rgb[2])})`;
}

/**
 * The brushed look of the window body, the door frame and the door leaf, derived from a single colour:
 * almost white at the top, the colour itself at the bottom. With `#8e8e90` this is the default look.
 */
export function frameGradient(color: string): string {
    return `linear-gradient(to bottom, ${shade(color, 0.85)} 0%, ${color} 100%)`;
}

/** The diagonal look of the sash frame: the colour at the bottom left, almost white at the top right */
export function sashGradient(color: string): string {
    return `linear-gradient(45deg, ${color} 0%, ${shade(color, 0.9)} 100%)`;
}
