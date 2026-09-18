import React, { type CSSProperties } from 'react';

import type {
    RxRenderWidgetProps,
    RxWidgetInfoAttributesField,
    RxWidgetInfoGroup,
    VisRxWidgetState,
    VisRxWidgetProps,
} from '@iobroker/types-vis-2';

import Generic from '../Generic';
import CircularSlider from './CircularSlider';
import { BatteryIcon, NoDataIcon, WorkingIcon } from './Indicators';
import {
    descriptionToText,
    formatDate,
    formatNumber,
    getTimeInterval,
    isTrue,
    toNumber,
    toStateValue,
    withPx,
} from '../utils';
import '../styles.css';

/** Skins the `styleNormal` / `styleActive` fields offer. The names are stored in existing projects. */
export const SKINS: string[] = [
    'vis-hq-button-base-normal',
    'vis-hq-button-base-on',
    'hq-button-base-normal',
    'hq-button-base-on',
    'hq-button-base-intemp',
    'hq-button-base-outtemp',
    'hq-button-no-background',
    'hq-button-red-normal',
    'hq-button-red-active',
    'hq-button-green-normal',
    'hq-button-green-active',
    'hq-button-metall-normal',
    'hq-button-metall-active',
    'hq-button-nice-blue',
    'hq-button-nice-red',
    'hq-button-nice-green',
    'hq-button-nice-yellow',
    'hq-button-nice-grey',
    'hq-button-glossy-blue',
    'hq-button-glossy-green',
    'hq-button-push-red',
    'hq-button-push-green',
    'glossy-button-grey',
    'glossy-button-grey-active',
    'glossy-button-orange',
    'glossy-button-orange-active',
    'glossy-button-blue',
    'glossy-button-blue-active',
    'glossy-button-green',
    'glossy-button-green-active',
    'glossy-button-pink',
    'glossy-button-pink-active',
];

/** Animations of the `changeEffect` field */
export const CHANGE_EFFECTS: string[] = [
    '',
    'waves',
    'wobble',
    'tada',
    'swing',
    'shake',
    'rubberBand',
    'pulse',
    'flash',
    'bounce',
];

export const DATE_FORMATS: string[] = [
    '',
    'YYYY.MM.DD hh:mm:ss',
    'DD.MM.YYYY hh:mm:ss',
    'YYYY/MM/DD hh:mm:ss',
    'hh:mm:ss',
    'hh:mm',
];

export interface HqButtonBaseRxData {
    oid: string;
    'oid-working': string;
    'oid-battery': string;
    'oid-signal': string;
    readOnly: boolean;

    unit: string;
    min: string | number | boolean;
    max: string | number | boolean;
    digits: number;
    step: number;
    is_comma: boolean;
    pushButton: boolean;
    set_by_click: string;

    caption: string;
    captionOn: string;
    iconName: string;
    iconOn: string;
    btIconWidth: number;
    offsetAuto: boolean;
    leftOffset: number;
    topOffset: number;
    circleWidth: number;
    showValue: boolean;
    alwaysShow: boolean;
    midTextColor: string;

    hoursLastAction: string;
    timeAsInterval: boolean;
    format_date: string;
    descriptionLeftDisabled: boolean;
    descriptionLeft: string;
    infoLeftFontSize: number;
    infoRight: string;
    infoFontRightSize: number;
    infoColor: string;
    infoBackground: string;
    infoLeftPaddingLeft: number;
    infoLeftPaddingRight: number;
    infoRightPaddingLeft: number;
    infoRightPaddingRight: number;

    styleNormal: string;
    styleActive: string;
    usejQueryStyle: boolean;
    changeEffect: string;
    waveColor: string;
    testActive: boolean;

    urlTrue: string;
    urlFalse: string;
    oidTrue: string;
    oidFalse: string;
    oidTrueValue: string;
    oidFalseValue: string;

    'oid-humidity': string;
    'oid-actual': string;
    'oid-drive': string;
    valveBinary: boolean;
    valve1: boolean;

    url: string;
    dialog_title: string;
    dialog_width: number;
    dialog_height: number;
    dialog_timeout: number;
    dialog_modal: boolean;
    dialog_open: boolean;
}

export interface HqButtonBaseState extends VisRxWidgetState {
    /** Measured size of the widget - the arc and both description pills are sized from it */
    width: number;
    height: number;
    /** Pointer is over the widget, so the value arc is shown */
    hovered: boolean;
    /** Value while the user drags the arc */
    tempValue: number | null;
    /** Restarts the change animation - the value is only used as a react key */
    effectCounter: number;
    /** Re-render once a minute so the relative "last change" text stays correct */
    timeTick: number;
    dialogOpen: boolean;
}

// The original compared values of different types with `==` all over the place, e.g. the string '0' from the
// editor against the number 0 of a state. Reproducing that keeps configurations working that rely on it.
const looseEqual = (a: unknown, b: unknown): boolean => a == b;

/**
 * Everything the four round hqWidgets (On/Off, Dimmer, Inner and Outdoor temperature) have in common:
 * the button chrome, both description pills, the indicators, the value arc and the click handling.
 *
 * The vis-1 widget set had this as one `vis.binds.hqwidgets.button` object that all four templates called into,
 * with a `wType` argument telling it whether it drives a number.
 */
export default abstract class HqButtonBase<
    RxData extends HqButtonBaseRxData,
    State extends HqButtonBaseState = HqButtonBaseState,
> extends Generic<RxData, State> {
    private readonly refRoot: React.RefObject<HTMLDivElement | null> = React.createRef();
    private resizeObserver: ResizeObserver | null = null;
    private timeInterval: ReturnType<typeof setInterval> | null = null;
    private dialogTimer: ReturnType<typeof setTimeout> | null = null;
    /** Timestamp until which a value change is treated as caused by this widget (no change animation) */
    private ownChangeUntil = 0;
    private lastSeenValue: unknown = undefined;
    private pushButtonUpHandler: ((e: Event) => void) | null = null;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            width: 0,
            height: 0,
            hovered: false,
            tempValue: null,
            effectCounter: 0,
            timeTick: 0,
            dialogOpen: false,
        };
    }

    /** `true` for the dimmer and both temperature widgets - the vis-1 `wType === 'number'` */
    // eslint-disable-next-line class-methods-use-this
    protected isNumber(): boolean {
        return false;
    }

    /** `true` for both temperature widgets - they never switch into the "active" skin */
    // eslint-disable-next-line class-methods-use-this
    protected isTemperature(): boolean {
        return false;
    }

    /** The state the arc controls. The outdoor temperature has none, it only displays `oid-actual`. */
    protected getMainOid(): string {
        return this.state.rxData.oid;
    }

    componentDidMount(): void {
        super.componentDidMount();

        if (this.refRoot.current) {
            this.resizeObserver = new ResizeObserver(() => this.measure());
            this.resizeObserver.observe(this.refRoot.current);
            this.measure();
        }

        // The relative time text ("for 5 min.") has to be refreshed without a state change
        if (this.state.rxData.hoursLastAction && isTrue(this.state.rxData.timeAsInterval) && !this.state.editMode) {
            this.timeInterval = setInterval(() => this.setState({ timeTick: Date.now() }), 60000);
        }

        // `dialog_open` is the "test" switch of the chart dialog and only opens it in the editor
        if (this.state.editMode && isTrue(this.state.rxData.dialog_open) && this.state.rxData.url) {
            this.setState({ dialogOpen: true });
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
            this.timeInterval = null;
        }
        this.clearDialogTimer();
        this.removePushButtonHandler();
    }

    private clearDialogTimer(): void {
        if (this.dialogTimer) {
            clearTimeout(this.dialogTimer);
            this.dialogTimer = null;
        }
    }

    /** Opens the chart dialog and closes it again after `dialog_timeout` */
    protected openDialog = (): void => {
        this.setState({ dialogOpen: true });
        this.clearDialogTimer();
        const timeout = toNumber(this.state.rxData.dialog_timeout, 0);
        if (timeout) {
            this.dialogTimer = setTimeout(() => {
                this.dialogTimer = null;
                this.setState({ dialogOpen: false });
            }, timeout);
        }
    };

    protected closeDialog = (): void => {
        this.clearDialogTimer();
        this.setState({ dialogOpen: false });
    };

    componentDidUpdate(prevProps: VisRxWidgetProps, prevState: typeof this.state): void {
        super.componentDidUpdate(prevProps, prevState);
        this.measure();

        // Run the configured animation when the value changed from the outside
        const value = this.getRawValue();
        if (this.lastSeenValue === undefined) {
            this.lastSeenValue = value;
        } else if (value !== this.lastSeenValue) {
            this.lastSeenValue = value;
            const own = Date.now() < this.ownChangeUntil;
            if (this.state.rxData.changeEffect && !own) {
                this.setState({ effectCounter: this.state.effectCounter + 1 });
            }
        }
    }

    private measure(): void {
        const el = this.refRoot.current;
        if (!el) {
            return;
        }
        const width = el.clientWidth;
        const height = el.clientHeight;
        if (width !== this.state.width || height !== this.state.height) {
            this.setState({ width, height });
        }
    }

    private removePushButtonHandler(): void {
        if (this.pushButtonUpHandler) {
            window.removeEventListener('pointerup', this.pushButtonUpHandler);
            window.removeEventListener('pointercancel', this.pushButtonUpHandler);
            this.pushButtonUpHandler = null;
        }
    }

    // ------------------------------------------------------------------ values

    protected getRawValue(): any {
        const oid = this.getMainOid();
        return oid ? this.state.values[`${oid}.val`] : undefined;
    }

    protected isAcknowledged(): boolean {
        const oid = this.getMainOid();
        return oid ? this.state.values[`${oid}.ack`] !== false : true;
    }

    protected getLastChange(): number | undefined {
        const oid = this.getMainOid();
        return oid ? this.state.values[`${oid}.lc`] : undefined;
    }

    protected getDigits(): number | null {
        const digits = this.state.rxData.digits;
        return digits === undefined || digits === null || (digits as unknown as string) === ''
            ? null
            : parseInt(digits as unknown as string, 10);
    }

    /** `min` / `max` may be a number, `true`/`false` or a free text, exactly like in the vis-1 widget */
    protected getLimit(which: 'min' | 'max'): any {
        const raw = this.state.rxData[which];
        const fallback = which === 'min' ? (this.isNumber() ? 0 : false) : this.isNumber() ? 100 : true;

        if (raw === undefined || raw === null || raw === '') {
            return fallback;
        }
        if (raw === true || raw === 'true') {
            return true;
        }
        if (raw === false || raw === 'false') {
            return false;
        }
        if (this.isNumber()) {
            return toNumber(raw, fallback as number);
        }
        const parsed = parseFloat(raw as string);
        return parsed.toString() === raw.toString() ? parsed : raw;
    }

    protected getNumericValue(): number {
        const value = this.state.tempValue !== null ? this.state.tempValue : this.getRawValue();
        return toNumber(value, toNumber(this.getLimit('min'), 0));
    }

    /** `normal` or `active` - which of the two skins is used and which icon/caption is shown */
    protected getButtonState(): 'normal' | 'active' {
        let state: 'normal' | 'active';
        const min = this.getLimit('min');
        const max = this.getLimit('max');
        const raw = this.state.tempValue !== null ? this.state.tempValue : this.getRawValue();
        const value = this.isNumber() ? toNumber(raw, toNumber(min, 0)) : raw;

        if (this.isTemperature()) {
            state = 'normal';
        } else if (looseEqual(value, min)) {
            state = 'normal';
        } else if (looseEqual(value, max)) {
            state = 'active';
        } else if (
            max &&
            (value === null || value === '' || value === undefined || value === 'false' || value === false)
        ) {
            state = 'normal';
        } else if (this.isNumber()) {
            state = max ? (value > toNumber(min, 0) ? 'active' : 'normal') : value ? 'active' : 'normal';
        } else {
            state = max ? (looseEqual(value, max) ? 'active' : 'normal') : value ? 'active' : 'normal';
        }

        if (this.state.editMode && isTrue(this.state.rxData.testActive)) {
            state = state === 'normal' ? 'active' : 'normal';
        }
        return state;
    }

    protected getSkin(state: 'normal' | 'active'): string {
        const data = this.state.rxData;
        if (isTrue(data.usejQueryStyle)) {
            return state === 'normal' ? 'ui-state-default' : 'ui-state-active';
        }
        return state === 'normal'
            ? data.styleNormal || 'vis-hq-button-base-normal'
            : data.styleActive || 'vis-hq-button-base-on';
    }

    /** Value of the valve/drive state, normalized the way the vis-1 widget did it */
    protected getDrive(): string | number | null {
        const data = this.state.rxData;
        if (!data['oid-drive']) {
            return null;
        }
        let value = this.getPropertyValue('oid-drive');
        if (value === null || value === undefined) {
            value = 0;
        }
        if (isTrue(data.valveBinary)) {
            let boolValue: boolean;
            if (value === 'true' || value === true) {
                boolValue = true;
            } else if (value === 'false' || value === false) {
                boolValue = false;
            } else {
                boolValue = !!parseFloat(value);
            }
            return boolValue ? Generic.t('opened') : Generic.t('closed');
        }
        if (isTrue(data.valve1)) {
            // the value runs from 0 to 1.01
            return Math.min(100, Math.max(0, Math.round(toNumber(value) * 100)));
        }
        return Math.round(toNumber(value));
    }

    // ------------------------------------------------------------------ writing

    protected setOwnValue(oid: string, value: any): void {
        if (!oid || oid === 'nothing_selected') {
            return;
        }
        // Suppress the change animation for the value that comes back from our own write
        this.ownChangeUntil = Date.now() + 1000;
        this.props.context.setValue(oid, value);
    }

    /** Click on the button body of the On/Off widget */
    protected onToggle = (): void => {
        const data = this.state.rxData;
        if (this.state.editMode || isTrue(data.readOnly)) {
            return;
        }
        const min = this.getLimit('min');
        const max = this.getLimit('max');
        const isOn = this.getButtonState() !== 'normal';
        const newValue = isOn ? min : max;

        // The additional control states/URLs are written with the new state, not the old one
        if (data.oidTrue) {
            if (!isOn) {
                this.setOwnValue(data.oidTrue, toStateValue(data.oidTrueValue, max));
            } else {
                this.setOwnValue(data.oidFalse || data.oidTrue, toStateValue(data.oidFalseValue, min));
            }
        }
        if (data.urlTrue) {
            void fetch(!isOn ? data.urlTrue : data.urlFalse || data.urlTrue).catch(e =>
                console.warn(`Cannot call URL: ${e}`),
            );
        }
        this.setOwnValue(data.oid, newValue);
    };

    /** Press and release of the On/Off widget in push-button mode */
    protected onPushDown = (e: React.PointerEvent<HTMLDivElement>): void => {
        const data = this.state.rxData;
        if (this.state.editMode || isTrue(data.readOnly)) {
            return;
        }
        e.preventDefault();

        const min = this.getLimit('min');
        const max = this.getLimit('max');

        if (data.oidTrue) {
            this.setOwnValue(data.oidTrue, toStateValue(data.oidTrueValue, max));
        }
        if (data.urlTrue) {
            void fetch(data.urlTrue).catch(err => console.warn(`Cannot call URL: ${err}`));
        }
        this.setOwnValue(data.oid, max);

        // Listen on the window so the release is caught even when the pointer left the button
        this.removePushButtonHandler();
        this.pushButtonUpHandler = (): void => {
            this.removePushButtonHandler();
            if (data.oidFalse || data.oidTrue) {
                this.setOwnValue(data.oidFalse || data.oidTrue, toStateValue(data.oidFalseValue, min));
            }
            if (data.urlFalse || data.urlTrue) {
                void fetch(data.urlFalse || data.urlTrue).catch(err => console.warn(`Cannot call URL: ${err}`));
            }
            this.setOwnValue(data.oid, min);
        };
        window.addEventListener('pointerup', this.pushButtonUpHandler);
        window.addEventListener('pointercancel', this.pushButtonUpHandler);
    };

    /**
     * Tap on the arc of the dimmer.
     *
     * Since 1.4.0: above 5% of the range a tap switches off, below it switches to the maximum. With
     * `set_by_click` configured that value is used instead of the maximum.
     */
    protected onArcClick = (): void => {
        const data = this.state.rxData;
        if (this.state.editMode || isTrue(data.readOnly)) {
            return;
        }
        if (this.isTemperature()) {
            if (data.url) {
                this.openDialog();
            }
            return;
        }
        const min = toNumber(this.getLimit('min'), 0);
        const max = toNumber(this.getLimit('max'), 100);
        const value = this.getNumericValue();
        const setByClick = toNumber(data.set_by_click, NaN);

        let newValue: number;
        if (!isNaN(setByClick)) {
            newValue = value > min ? min : setByClick;
        } else if (value - min > (max - min) / 20) {
            newValue = min;
        } else {
            newValue = max;
        }
        this.setState({ tempValue: null });
        this.setOwnValue(data.oid, newValue);
    };

    protected onArcChange = (value: number): void => {
        this.setState({ tempValue: null });
        if (this.state.editMode || isTrue(this.state.rxData.readOnly)) {
            return;
        }
        const digits = this.getDigits();
        const rounded = digits === null ? value : parseFloat(value.toFixed(digits));
        this.setOwnValue(this.state.rxData.oid, rounded);
    };

    // ------------------------------------------------------------------ rendering

    /** Text of the right pill: static text, value with unit, valve and the "last change" line */
    private renderRightInfo(): React.JSX.Element | null {
        const data = this.state.rxData;
        const width = this.state.width;

        let timeText = '';
        if (data.hoursLastAction) {
            timeText = isTrue(data.timeAsInterval)
                ? getTimeInterval(this.getLastChange(), toNumber(data.hoursLastAction, 0), Generic.t)
                : formatDate(this.getLastChange(), data.format_date);
        }

        let valueText = '';
        if (this.isNumber() && this.getMainOid()) {
            const raw = this.state.tempValue !== null ? this.state.tempValue : this.getRawValue();
            const value = raw === undefined || raw === null ? this.getLimit('min') : raw;
            valueText = `${formatNumber(toNumber(value), this.getDigits(), isTrue(data.is_comma))}${data.unit ?? ''}`;
        }

        const drive = this.getDrive();

        if (!data.infoRight && !timeText && !valueText && drive === null) {
            return null;
        }

        const style: CSSProperties = {
            paddingLeft: `${5 + width / 2 + toNumber(data.infoRightPaddingLeft, 0)}px`,
            paddingRight: withPx(data.infoRightPaddingRight, '15px'),
            fontSize: toNumber(data.infoFontRightSize, 12),
        };
        if (data.infoColor) {
            style.color = data.infoColor;
        }
        if (data.infoBackground) {
            style.background = data.infoBackground;
        }

        return (
            <div
                className="hq-rightinfo"
                style={style}
            >
                {data.infoRight ? <span>{descriptionToText(data.infoRight)}</span> : null}
                {valueText ? (
                    <span>
                        {data.infoRight ? <br /> : null}
                        {valueText}
                    </span>
                ) : null}
                {drive !== null ? (
                    <span>
                        <br />
                        {drive}
                        {isTrue(data.valveBinary) ? '' : '%'}
                    </span>
                ) : null}
                {timeText ? (
                    <span>
                        {data.infoRight || valueText || drive !== null ? <br /> : null}
                        {timeText}
                    </span>
                ) : null}
            </div>
        );
    }

    private renderLeftInfo(): React.JSX.Element | null {
        const data = this.state.rxData;
        if (isTrue(data.descriptionLeftDisabled) || !data.descriptionLeft) {
            return null;
        }
        const width = this.state.width;
        // The pill grows to the left of the button centre, the same way the vis-1 widget placed it
        const offset = Math.max(width / 2, width - 20);

        const style: CSSProperties = {
            right: `${offset}px`,
            paddingLeft: withPx(data.infoLeftPaddingLeft, '15px'),
            paddingRight: withPx(data.infoLeftPaddingRight, '50px'),
            fontSize: toNumber(data.infoLeftFontSize, 12),
        };
        if (data.infoColor) {
            style.color = data.infoColor;
        }
        if (data.infoBackground) {
            style.background = data.infoBackground;
        }

        return (
            <div
                className="hq-leftinfo"
                style={style}
            >
                {descriptionToText(data.descriptionLeft)}
            </div>
        );
    }

    /** Actual temperature and humidity in the middle of the button */
    private renderCenterInfo(): React.JSX.Element | null {
        const data = this.state.rxData;
        const humidity = data['oid-humidity'] ? this.getPropertyValue('oid-humidity') : undefined;
        const actual = data['oid-actual'] ? this.getPropertyValue('oid-actual') : undefined;

        if ((humidity === undefined || humidity === null) && (actual === undefined || actual === null)) {
            return null;
        }

        const style: CSSProperties = {};
        if (data.midTextColor) {
            style.color = data.midTextColor;
        }

        return (
            <div
                className="hq-centerinfo"
                style={style}
            >
                {actual !== undefined && actual !== null ? (
                    <div className="hq-actual">
                        {formatNumber(toNumber(actual), this.getDigits(), isTrue(data.is_comma))}
                        {data.unit ?? ''}
                    </div>
                ) : null}
                {humidity !== undefined && humidity !== null ? (
                    <div className="hq-humidity">{`${Math.round(toNumber(humidity))}%`}</div>
                ) : null}
            </div>
        );
    }

    /** Icon and caption in the middle of the button */
    private renderCenter(buttonState: 'normal' | 'active', dimmed: boolean): React.JSX.Element {
        const data = this.state.rxData;
        const icon = buttonState === 'normal' ? data.iconName : data.iconOn || data.iconName;
        const caption = buttonState === 'active' && data.captionOn ? data.captionOn : data.caption;
        // Below the icon when the widget is taller than wide, next to it otherwise - as in the vis-1 widget
        const vertical = this.state.height > this.state.width;

        const style: CSSProperties = isTrue(data.offsetAuto)
            ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
            : { left: `${toNumber(data.leftOffset, 15)}%`, top: `${toNumber(data.topOffset, 55)}%` };

        if (dimmed) {
            style.opacity = 0.7;
        }

        return (
            <div
                className={`hq-center${vertical ? ' hq-center-vertical' : ''}`}
                style={style}
            >
                {data.iconName || data.iconOn ? (
                    <img
                        className="hq-center-img"
                        src={icon || ''}
                        alt=""
                        style={{ height: toNumber(data.btIconWidth, 56), opacity: icon ? 1 : 0 }}
                    />
                ) : null}
                {caption ? <div>{caption}</div> : null}
            </div>
        );
    }

    /** The two expanding rings of the `waves` effect */
    private renderWaves(): React.JSX.Element | null {
        if (this.state.rxData.changeEffect !== 'waves' || !this.state.effectCounter) {
            return null;
        }
        const border = `2px solid ${this.state.rxData.waveColor || 'grey'}`;
        const style: CSSProperties = {
            top: -2,
            left: -2,
            width: this.state.width,
            height: this.state.height,
            borderRadius: 'inherit',
            border,
        };
        return (
            <React.Fragment key={this.state.effectCounter}>
                <div
                    className="hq-wave hq-wave1"
                    style={style}
                />
                <div
                    className="hq-wave hq-wave2"
                    style={style}
                />
            </React.Fragment>
        );
    }

    /** The value arc of the dimmer and the temperature widgets */
    protected renderArc(): React.JSX.Element | null {
        const data = this.state.rxData;
        if (!this.isNumber() || !this.getMainOid() || !this.state.width) {
            return null;
        }

        const alwaysShow = isTrue(data.alwaysShow);
        const visible = alwaysShow || this.state.hovered;
        const size = Math.round(((100 + toNumber(data.circleWidth, 50)) * this.state.width) / 100);
        const min = toNumber(this.getLimit('min'), 0);
        const max = toNumber(this.getLimit('max'), 100);
        const digits = this.getDigits();
        const isComma = isTrue(data.is_comma);

        // The temperature widgets colour the arc by value, from cyan at the minimum to red at the maximum
        /*
         * Cold to warm: blue at the minimum, red at the maximum, over cyan, green and yellow in between.
         *
         * The vis-1 formula ran the hue from 180 up to 360, which put magenta right in the middle of a normal
         * room temperature range - 21.5 °C on a 6...30 scale came out violet. Running it down from 240 to 0
         * keeps the same ends and gives the usual temperature colours in between.
         */
        const colorize = this.isTemperature()
            ? (value: number, isPrevious: boolean): string => {
                  const ratio = max === min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
                  return `hsla(${Math.round(240 - 240 * ratio)}, 70%, 50%, ${isPrevious ? 0.7 : 0.9})`;
              }
            : undefined;

        return (
            <CircularSlider
                className={visible ? undefined : 'hq-arc-hidden'}
                style={{
                    left: (this.state.width - size) / 2,
                    top: (this.state.height - size) / 2,
                }}
                size={size}
                value={this.getNumericValue()}
                previousValue={toNumber(this.getRawValue(), min)}
                displayPrevious
                min={min}
                max={max}
                step={toNumber(data.step, 1)}
                color={this.isTemperature() ? 'black' : '#FFCC00'}
                colorize={colorize}
                displayValue={isTrue(data.showValue) && !(this.isTemperature() && alwaysShow)}
                formatValue={(value: number) => `${formatNumber(value, digits, isComma)}${data.unit ?? ''}`}
                readOnly={this.state.editMode || isTrue(data.readOnly)}
                onChanging={(value: number) => this.setState({ tempValue: value })}
                onChange={this.onArcChange}
                onClick={this.onArcClick}
            />
        );
    }

    /** The chart dialog of the temperature widgets */
    private renderDialog(): React.JSX.Element | null {
        const data = this.state.rxData;
        if (!this.state.dialogOpen || !data.url) {
            return null;
        }
        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isTrue(data.dialog_modal) ? 'rgba(0,0,0,0.5)' : 'transparent',
                }}
                onClick={this.closeDialog}
            >
                <div
                    style={{
                        width: toNumber(data.dialog_width, 600),
                        height: toNumber(data.dialog_height, 400),
                        background: '#fff',
                        borderRadius: 4,
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <iframe
                        title={data.dialog_title || data['oid-actual'] || 'chart'}
                        src={data.url}
                        style={{ width: '100%', height: '100%', border: 0 }}
                    />
                </div>
            </div>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const buttonState = this.getButtonState();
        const skin = this.getSkin(buttonState);
        const value = this.getRawValue();
        const mainOid = this.getMainOid();

        const hasNoData = !!mainOid && (value === undefined || value === null);
        const working = data['oid-working']
            ? !!this.getPropertyValue('oid-working')
            : !!mainOid && !this.isAcknowledged();
        const battery = data['oid-battery'] ? !!this.getPropertyValue('oid-battery') : false;
        const signal = data['oid-signal'] ? this.getPropertyValue('oid-signal') : undefined;

        const alwaysShow = isTrue(data.alwaysShow);
        const arcVisible = this.isNumber() && !!mainOid && (alwaysShow || this.state.hovered);
        // While the arc is on top of the button the middle info would only be in the way
        const centerInfo = arcVisible && !alwaysShow ? null : this.renderCenterInfo();

        const interactive =
            !this.state.editMode &&
            !isTrue(data.readOnly) &&
            !this.isNumber() &&
            !!(data.oid || data.oidTrue || data.oidFalse || data.urlTrue || data.urlFalse);

        const isPushButton = interactive && isTrue(data.pushButton);
        const effectClass =
            data.changeEffect && data.changeEffect !== 'waves' && this.state.effectCounter
                ? ` hq-effect-${data.changeEffect}`
                : '';

        const mainStyle: CSSProperties = {
            borderRadius: 'inherit',
        };

        // A widget without a controllable state but with a chart URL opens the chart when clicked
        const opensDialog = !interactive && !!data.url && !this.state.editMode && !arcVisible;

        let onMainClick: (() => void) | undefined;
        if (interactive && !isPushButton) {
            onMainClick = this.onToggle;
        } else if (opensDialog) {
            onMainClick = this.openDialog;
        }

        return (
            <div
                ref={this.refRoot}
                className={this.getRootClass()}
                style={{ borderRadius: (this.state.rxStyle?.['border-radius'] as string) || undefined }}
                onPointerEnter={() => this.setState({ hovered: true })}
                onPointerLeave={() => this.setState({ hovered: false })}
            >
                {this.renderLeftInfo()}
                {this.renderRightInfo()}
                <div
                    key={this.state.effectCounter}
                    className={`hq-main ${skin}${effectClass}${interactive || opensDialog ? '' : ' hq-main-none'}`}
                    style={mainStyle}
                    onClick={onMainClick}
                    onPointerDown={isPushButton ? this.onPushDown : undefined}
                >
                    {this.renderWaves()}
                    {centerInfo}
                    {this.renderCenter(buttonState, !!centerInfo)}
                </div>
                {this.renderArc()}
                {hasNoData ? <NoDataIcon /> : null}
                {working ? <WorkingIcon /> : null}
                {battery ? <BatteryIcon /> : null}
                {signal !== undefined && signal !== null ? <div className="hq-signal">{signal}</div> : null}
                {this.renderDialog()}
            </div>
        );
    }

    // ------------------------------------------------------------------ attribute groups
    // The field names are the ones of the vis-1 widget set, so a widget that is migrated to vis-2 keeps its
    // configuration - only the tpl id decides which implementation renders it, and React wins.

    static groupCenter(options: {
        /** The On/Off button has a second caption for the active state */
        withCaptionOn?: boolean;
        /** The dimmer and both temperature widgets carry the value arc */
        withCircle?: boolean;
        /** Colour of the text in the middle - only the temperature widgets offer it */
        withMidTextColor?: boolean;
        iconDefault?: string;
        iconWidthDefault?: number;
        leftOffsetDefault?: number;
    }): RxWidgetInfoGroup {
        const fields: RxWidgetInfoAttributesField[] = [{ name: 'caption', label: 'caption' }];
        if (options.withCaptionOn) {
            fields.push({ name: 'captionOn', label: 'captionOn' });
        }
        fields.push(
            { name: 'iconName', label: 'iconName', type: 'image', default: options.iconDefault },
            { name: 'iconOn', label: 'iconOn', type: 'image' },
            {
                name: 'btIconWidth',
                label: 'btIconWidth',
                type: 'slider',
                min: 0,
                max: 400,
                step: 1,
                default: options.iconWidthDefault ?? 56,
            },
            { name: 'offsetAuto', label: 'offsetAuto', type: 'checkbox', default: true },
            {
                name: 'leftOffset',
                label: 'leftOffset',
                type: 'slider',
                min: 0,
                max: 100,
                step: 1,
                default: options.leftOffsetDefault ?? 15,
                hidden: 'data.offsetAuto === true || data.offsetAuto === "true"',
            },
            {
                name: 'topOffset',
                label: 'topOffset',
                type: 'slider',
                min: 0,
                max: 100,
                step: 1,
                default: 55,
                hidden: 'data.offsetAuto === true || data.offsetAuto === "true"',
            },
        );
        if (options.withCircle) {
            fields.push(
                { name: 'circleWidth', label: 'circleWidth', type: 'slider', min: 1, max: 200, step: 1, default: 50 },
                { name: 'showValue', label: 'showValue', type: 'checkbox', default: true },
                { name: 'alwaysShow', label: 'alwaysShow', type: 'checkbox' },
            );
        }
        if (options.withMidTextColor) {
            fields.push({ name: 'midTextColor', label: 'midTextColor', type: 'color' });
        }
        return { name: 'center', label: 'group_center', fields };
    }

    static groupLeftRight(withRight: boolean): RxWidgetInfoGroup {
        const fields: RxWidgetInfoAttributesField[] = [
            {
                name: 'hoursLastAction',
                label: 'hoursLastAction',
                type: 'select',
                noTranslation: true,
                options: ['', '1', '2', '3', '6', '12', '24', '1024'],
            },
            {
                name: 'timeAsInterval',
                label: 'timeAsInterval',
                type: 'checkbox',
                default: true,
                hidden: '!data.hoursLastAction',
            },
            {
                name: 'format_date',
                label: 'format_date',
                type: 'select',
                noTranslation: true,
                options: DATE_FORMATS,
                hidden: '!data.hoursLastAction || data.timeAsInterval === true || data.timeAsInterval === "true"',
            },
            { name: 'descriptionLeftDisabled', label: 'descriptionLeftDisabled', type: 'checkbox' },
            {
                name: 'descriptionLeft',
                label: 'descriptionLeft',
                hidden: 'data.descriptionLeftDisabled === true || data.descriptionLeftDisabled === "true"',
            },
            {
                name: 'infoLeftFontSize',
                label: 'infoLeftFontSize',
                type: 'slider',
                min: 6,
                max: 50,
                step: 1,
                default: 12,
            },
        ];
        if (withRight) {
            fields.push({ name: 'infoRight', label: 'infoRight' });
        }
        fields.push(
            {
                name: 'infoFontRightSize',
                label: 'infoFontRightSize',
                type: 'slider',
                min: 6,
                max: 50,
                step: 1,
                default: 12,
            },
            { name: 'infoColor', label: 'infoColor', type: 'color' },
            { name: 'infoBackground', label: 'infoBackground', type: 'color' },
            {
                name: 'infoLeftPaddingLeft',
                label: 'infoLeftPaddingLeft',
                type: 'slider',
                min: 0,
                max: 100,
                step: 1,
                default: 15,
            },
            {
                name: 'infoLeftPaddingRight',
                label: 'infoLeftPaddingRight',
                type: 'slider',
                min: 0,
                max: 100,
                step: 1,
                default: 50,
            },
            { name: 'infoRightPaddingLeft', label: 'infoRightPaddingLeft', type: 'slider', min: 0, max: 100, step: 1 },
            {
                name: 'infoRightPaddingRight',
                label: 'infoRightPaddingRight',
                type: 'slider',
                min: 0,
                max: 100,
                step: 1,
                default: 15,
            },
        );
        return { name: 'leftRight', label: 'group_leftRight', fields };
    }

    static groupStyles(normalDefault?: string, activeDefault?: string, withActive = true): RxWidgetInfoGroup {
        const fields: RxWidgetInfoAttributesField[] = [
            {
                name: 'styleNormal',
                label: 'styleNormal',
                type: 'select',
                noTranslation: true,
                options: SKINS,
                default: normalDefault,
            },
        ];
        if (withActive) {
            fields.push({
                name: 'styleActive',
                label: 'styleActive',
                type: 'select',
                noTranslation: true,
                options: SKINS,
                default: activeDefault,
            });
        }
        fields.push(
            { name: 'usejQueryStyle', label: 'usejQueryStyle', type: 'checkbox' },
            {
                name: 'changeEffect',
                label: 'changeEffect',
                type: 'select',
                noTranslation: true,
                options: CHANGE_EFFECTS,
            },
            { name: 'waveColor', label: 'waveColor', type: 'color', hidden: 'data.changeEffect !== "waves"' },
            { name: 'testActive', label: 'testActive', type: 'checkbox' },
        );
        return { name: 'styles', label: 'group_styles', fields };
    }

    static groupIndicators(): RxWidgetInfoAttributesField[] {
        return [
            { name: 'oid-working', type: 'id', label: 'oid-working', noSubscribe: false },
            {
                name: 'oid-battery',
                type: 'id',
                label: 'oid-battery',
                filter: { common: { role: 'indicator.battery' } },
            },
            { name: 'oid-signal', type: 'id', label: 'oid-signal' },
        ];
    }
}
