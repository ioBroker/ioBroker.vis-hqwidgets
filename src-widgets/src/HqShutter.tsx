import React, { type CSSProperties } from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState, VisRxWidgetProps } from '@iobroker/types-vis-2';

import Generic from './Generic';
import VerticalSlider from './Components/VerticalSlider';
import { BatteryIcon } from './Components/Indicators';
import { watchOutsideClick } from './Components/outsideClick';
import { descriptionToText, frameGradient, isTrue, sashGradient, toNumber, withPx } from './utils';
import './styles.css';

/** How a sash opens. An empty type means a fixed pane without a handle. */
type SlideType = '' | 'left' | 'right' | 'top' | 'bottom';

interface HqShutterRxData {
    oid: string;
    'oid-working': string;
    min: number;
    max: number;
    border_width: number;
    slide_count: number;
    invert: boolean;
    hide_timeout: number;
    noAnimate: boolean;
    frameColor: string;
    popupHorizontalPos: 'top' | 'center' | 'bottom';
    popupVerticalPos: 'left' | 'center' | 'right';

    descriptionLeftDisabled: boolean;
    descriptionLeft: string;
    infoLeftFontSize: number;
    show_value: boolean;
    infoRight: string;
    infoFontRightSize: number;
    infoColor: string;
    infoBackground: string;
    infoLeftPaddingLeft: number;
    infoLeftPaddingRight: number;
    infoRightPaddingLeft: number;
    infoRightPaddingRight: number;

    [key: `slide_type${number}`]: SlideType;
    [key: `oid-slide-sensor${number}`]: string;
    [key: `oid-slide-sensor-lowbat${number}`]: string;
    [key: `oid-slide-handle${number}`]: string;
    [key: `oid-slide-handle-lowbat${number}`]: string;
}

interface HqShutterState extends VisRxWidgetState {
    width: number;
    height: number;
    popupOpen: boolean;
    /** Position shown while the user drags the popup slider */
    dragPosition: number | null;
}

/*
 * Size of the control popup. The vis-1 widget sized it with `width: 7em; height: 18em`, which lands here at a
 * normal font size - in pixels, so a widget with a tiny font does not end up with a popup nobody can hit.
 */
const POPUP_WIDTH = 112;
const POPUP_HEIGHT = 288;
/** Height of the open/close buttons (vis-1: `2.5em`) */
const POPUP_BUTTON_HEIGHT = 40;

/** open / tilted / closed of a window sensor or handle, in all the spellings the vis-1 widget accepted */
function isOpen(value: unknown): boolean {
    return value === 1 || value === '1' || value === true || value === 'true' || value === 'open' || value === 'opened';
}

function isTilted(value: unknown): boolean {
    return value === 2 || value === '2' || value === 'tilt' || value === 'tilted';
}

/**
 * `tplHqShutter` - window with sashes and a roller shutter.
 *
 * Clicking the widget opens a small popup with an up/down button and a slider; it closes itself again after
 * `hide_timeout` without interaction.
 */
export default class HqShutter extends Generic<HqShutterRxData, HqShutterState> {
    private readonly refRoot: React.RefObject<HTMLDivElement | null> = React.createRef();
    private resizeObserver: ResizeObserver | null = null;
    private hideTimer: ReturnType<typeof setTimeout> | null = null;
    /** Removes the listener that closes the popup on a click elsewhere in the view */
    private stopOutsideWatch: (() => void) | null = null;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            width: 0,
            height: 0,
            popupOpen: false,
            dragPosition: null,
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplHqShutter',
            visSet: 'hqwidgets',
            visSetLabel: 'set_label',
            visName: 'Window and Shutter',
            visWidgetLabel: 'window_and_shutter',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id', label: 'oid', filter: { common: { role: 'level.blind' } } },
                        {
                            name: 'oid-working',
                            type: 'id',
                            label: 'oid-working',
                            filter: { common: { role: 'indicator.working' } },
                        },
                        { name: 'min', label: 'min', type: 'number', default: 0 },
                        { name: 'max', label: 'max', type: 'number', default: 100 },
                        {
                            name: 'border_width',
                            label: 'border_width',
                            type: 'slider',
                            min: 0,
                            max: 10,
                            step: 1,
                            default: 3,
                        },
                        {
                            name: 'slide_count',
                            label: 'slide_count',
                            type: 'select',
                            noTranslation: true,
                            options: ['1', '2', '3', '4', '5', '6'],
                            default: '1',
                        },
                        { name: 'invert', label: 'invert', type: 'checkbox' },
                        { name: 'hide_timeout', label: 'hide_timeout', type: 'number', default: 2000 },
                        { name: 'noAnimate', label: 'noAnimate', type: 'checkbox' },
                        { name: 'frameColor', label: 'frameColor', type: 'color', tooltip: 'frameColor_tooltip' },
                        {
                            name: 'popupHorizontalPos',
                            label: 'popupHorizontalPos',
                            type: 'select',
                            options: ['top', 'center', 'bottom'],
                            default: 'center',
                        },
                        {
                            name: 'popupVerticalPos',
                            label: 'popupVerticalPos',
                            type: 'select',
                            options: ['left', 'center', 'right'],
                            default: 'center',
                        },
                    ],
                },
                {
                    name: 'leftRight',
                    label: 'group_leftRight',
                    fields: [
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
                        { name: 'show_value', label: 'show_value', type: 'checkbox' },
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
                        {
                            name: 'infoRightPaddingLeft',
                            label: 'infoRightPaddingLeft',
                            type: 'slider',
                            min: 0,
                            max: 100,
                            step: 1,
                            default: 15,
                        },
                        {
                            name: 'infoRightPaddingRight',
                            label: 'infoRightPaddingRight',
                            type: 'slider',
                            min: 0,
                            max: 100,
                            step: 1,
                            default: 15,
                        },
                    ],
                },
                {
                    name: 'slides',
                    label: 'group_slides',
                    indexFrom: 1,
                    indexTo: 'slide_count',
                    fields: [
                        {
                            name: 'slide_type',
                            label: 'slide_type',
                            type: 'select',
                            options: ['', 'left', 'right', 'top', 'bottom'],
                        },
                        { name: 'oid-slide-sensor', type: 'id', label: 'oid-slide-sensor' },
                        {
                            name: 'oid-slide-sensor-lowbat',
                            type: 'id',
                            label: 'oid-slide-sensor-lowbat',
                            filter: { common: { role: 'indicator.battery' } },
                        },
                        { name: 'oid-slide-handle', type: 'id', label: 'oid-slide-handle' },
                        {
                            name: 'oid-slide-handle-lowbat',
                            type: 'id',
                            label: 'oid-slide-handle-lowbat',
                            filter: { common: { role: 'indicator.battery' } },
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 120,
                height: 100,
                position: 'absolute',
            },
            visPrev: 'widgets/vis-2-widgets-hqwidgets/img/prev_shutter.svg',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return HqShutter.getWidgetInfo();
    }

    componentDidMount(): void {
        super.componentDidMount();
        if (this.refRoot.current) {
            this.resizeObserver = new ResizeObserver(() => this.measure());
            this.resizeObserver.observe(this.refRoot.current);
            this.measure();
        }
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.clearHideTimer();
        this.closePopup();
    }

    componentDidUpdate(prevProps: VisRxWidgetProps, prevState: typeof this.state): void {
        super.componentDidUpdate(prevProps, prevState);
        this.measure();
    }

    private measure(): void {
        const el = this.refRoot.current;
        if (!el) {
            return;
        }
        if (el.clientWidth !== this.state.width || el.clientHeight !== this.state.height) {
            this.setState({ width: el.clientWidth, height: el.clientHeight });
        }
    }

    private clearHideTimer(): void {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    }

    private openPopup(): void {
        this.stopOutsideWatch?.();
        // a click anywhere else in the view closes the popup again
        this.stopOutsideWatch = watchOutsideClick(this.refRoot, () => this.closePopup());
        this.setState({ popupOpen: true });
        this.restartHideTimer();
    }

    private closePopup(): void {
        this.stopOutsideWatch?.();
        this.stopOutsideWatch = null;
        this.clearHideTimer();
        if (this.state.popupOpen) {
            this.setState({ popupOpen: false, dragPosition: null });
        }
    }

    private restartHideTimer(): void {
        this.clearHideTimer();
        const timeout = toNumber(this.state.rxData.hide_timeout, 2000);
        if (timeout) {
            this.hideTimer = setTimeout(() => {
                this.hideTimer = null;
                this.closePopup();
            }, timeout);
        }
    }

    /** Shutter position in percent, 0 = fully open at the top, 100 = fully closed */
    private getShutterPosition(): number {
        const data = this.state.rxData;
        if (!data.oid) {
            return 0;
        }
        const raw = this.state.values[`${data.oid}.val`];
        if (raw === undefined || raw === null) {
            return 0;
        }
        const min = toNumber(data.min, 0);
        const max = toNumber(data.max, 100);
        const value = Math.min(max, Math.max(min, toNumber(raw, min)));
        const position = max === min ? 0 : Math.round((100 * (value - min)) / (max - min));
        return isTrue(data.invert) ? 100 - position : position;
    }

    /** Inverse of `getShutterPosition` - what has to be written to reach that position */
    private positionToValue(position: number): number {
        const data = this.state.rxData;
        const min = toNumber(data.min, 0);
        const max = toNumber(data.max, 100);
        const pos = isTrue(data.invert) ? 100 - position : position;
        return Math.round(min + (pos / 100) * (max - min));
    }

    private setPosition(position: number): void {
        if (this.state.editMode || !this.state.rxData.oid) {
            return;
        }
        this.props.context.setValue(this.state.rxData.oid, this.positionToValue(position));
        this.closePopup();
    }

    private renderSash(index: number, shutterPosition: number): React.JSX.Element {
        const data = this.state.rxData;
        const borderWidth = toNumber(data.border_width, 3);
        const type = data[`slide_type${index}`] || '';

        const handleOid = data[`oid-slide-handle${index}`];
        const sensorOid = data[`oid-slide-sensor${index}`];

        // Window handles report 0 = closed, 1 = tilted, 2 = open; the widget swaps 1 and 2 so that
        // "1" means open everywhere below.
        let handlePos: unknown = null;
        if (handleOid) {
            const raw = this.state.values[`${handleOid}.val`];
            handlePos = raw === 2 || raw === '2' ? 1 : raw === 1 || raw === '1' ? 2 : raw;
        }
        let slidePos: unknown = handlePos;
        if (sensorOid) {
            slidePos = this.state.values[`${sensorOid}.val`];
            if (!handleOid) {
                handlePos = slidePos;
            }
            if (handlePos === 2) {
                slidePos = 2;
            }
        }

        let wingClass = 'hq-sash-wing';
        if (type && isOpen(slidePos)) {
            wingClass += ` hq-sash-wing-opened-${type}`;
        } else if (type && isTilted(slidePos)) {
            wingClass += ' hq-sash-wing-tilted';
        }

        // Geometry of the handle, as in the vis-1 widget: a bar on the side opposite to the hinge
        const smallBorder = Math.max(1, Math.round(borderWidth / 3));
        const handleStyle: CSSProperties = { borderWidth: smallBorder };
        if (type === 'left' || type === 'right') {
            handleStyle.top = '50%';
            handleStyle.width = borderWidth;
            handleStyle.height = '15%';
            if (type === 'left') {
                handleStyle.left = `calc(100% - ${smallBorder * 2 + borderWidth}px)`;
            } else {
                handleStyle.left = 0;
            }
        } else if (type === 'top' || type === 'bottom') {
            handleStyle.left = '50%';
            handleStyle.height = borderWidth;
            handleStyle.width = '15%';
            if (type === 'bottom') {
                handleStyle.top = `calc(100% - ${smallBorder * 2 + borderWidth}px)`;
            } else {
                handleStyle.top = 0;
            }
        }
        if (handlePos !== null && handlePos !== undefined) {
            const origin = Math.round(smallBorder + borderWidth / 2);
            let rotation = 0;
            if (type === 'right' || type === 'bottom') {
                rotation = isOpen(handlePos) ? -90 : isTilted(handlePos) ? 180 : 0;
            } else {
                rotation = isOpen(handlePos) ? 90 : isTilted(handlePos) ? 180 : 0;
            }
            if (rotation) {
                handleStyle.transformOrigin = `${origin}px ${origin}px`;
                handleStyle.transform = `rotate(${rotation}deg)`;
            }
        }

        const sensorLowBat = data[`oid-slide-sensor-lowbat${index}`]
            ? !!this.state.values[`${data[`oid-slide-sensor-lowbat${index}`]}.val`]
            : false;
        const handleLowBat = data[`oid-slide-handle-lowbat${index}`]
            ? !!this.state.values[`${data[`oid-slide-handle-lowbat${index}`]}.val`]
            : false;

        // Without `frameColor` the colours of the stylesheet apply
        const frameColor = data.frameColor;
        const sashStyle: CSSProperties = { borderWidth };
        if (frameColor) {
            sashStyle.borderColor = frameColor;
            sashStyle.background = sashGradient(frameColor);
        }
        const wingStyle: CSSProperties = { borderWidth };
        if (frameColor) {
            wingStyle.borderColor = frameColor;
        }

        return (
            <div
                key={index}
                className="hq-sash"
                style={sashStyle}
            >
                <div
                    className="hq-sash-inner"
                    style={{ borderWidth }}
                >
                    {sensorLowBat ? (
                        <BatteryIcon
                            size={20}
                            title={Generic.t('Low battery on sash sensor')}
                        />
                    ) : null}
                    <div className="hq-sash-frame">
                        {handleLowBat ? (
                            <BatteryIcon
                                size={20}
                                color="#FF55FA"
                                title={Generic.t('Low battery on handle sensor')}
                            />
                        ) : null}
                        <div
                            className={`hq-shutter${isTrue(data.noAnimate) ? ' hq-shutter-no-animation' : ''}`}
                            style={{ height: `${shutterPosition}%` }}
                        />
                        <div
                            className={wingClass}
                            style={wingStyle}
                        >
                            {type ? (
                                <div
                                    className={`hq-handle${isTilted(handlePos) ? ' hq-handle-tilted' : ''}`}
                                    style={handleStyle}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private renderPopup(shutterPosition: number): React.JSX.Element | null {
        if (!this.state.popupOpen || !this.state.rxData.oid) {
            return null;
        }
        const data = this.state.rxData;
        const { width, height } = this.state;

        // Default is centred; the two position fields move the popup to one edge. The names are the ones the
        // vis-1 widget used - `popupVerticalPos` carries the left/right options.
        let top = Math.round((height - POPUP_HEIGHT) / 2);
        let left = Math.round((width - POPUP_WIDTH) / 2);
        if (data.popupVerticalPos === 'left') {
            left = Math.round(width - POPUP_WIDTH);
        } else if (data.popupVerticalPos === 'right') {
            left = 0;
        }
        if (data.popupHorizontalPos === 'top') {
            top = Math.round(height - POPUP_HEIGHT);
        } else if (data.popupHorizontalPos === 'bottom') {
            top = 0;
        }

        // The popup is bigger than the widget, so it reaches outside of it - keep it inside the window, the way
        // the vis-1 widget kept it inside the view
        const box = this.refRoot.current?.getBoundingClientRect();
        if (box) {
            top = Math.min(Math.max(top, -box.top + 4), window.innerHeight - box.top - POPUP_HEIGHT - 4);
            left = Math.min(Math.max(left, -box.left + 4), window.innerWidth - box.left - POPUP_WIDTH - 4);
        }

        const position = this.state.dragPosition !== null ? this.state.dragPosition : shutterPosition;

        return (
            <div
                className="hq-blind-popup"
                style={{ top, left, width: POPUP_WIDTH, height: POPUP_HEIGHT }}
                onClick={e => e.stopPropagation()}
                // While the user is on the popup it must not close under their fingers; afterwards the
                // `hide_timeout` starts again
                onPointerDown={() => this.clearHideTimer()}
                onPointerUp={() => this.restartHideTimer()}
                onPointerCancel={() => this.restartHideTimer()}
            >
                <div
                    className="hq-blind-popup-button"
                    style={{ height: POPUP_BUTTON_HEIGHT }}
                    title={Generic.t('open')}
                    onClick={() => this.setPosition(0)}
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="22"
                        height="22"
                    >
                        <path
                            d="M6 15l6-6 6 6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <VerticalSlider
                    position={position}
                    onChanging={value => this.setState({ dragPosition: value })}
                    onChange={value => this.setPosition(value)}
                />
                <div
                    className="hq-blind-popup-button"
                    style={{ height: POPUP_BUTTON_HEIGHT }}
                    title={Generic.t('close')}
                    onClick={() => this.setPosition(100)}
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="22"
                        height="22"
                    >
                        <path
                            d="M6 9l6 6 6-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </div>
        );
    }

    private renderLeftInfo(): React.JSX.Element | null {
        const data = this.state.rxData;
        if (isTrue(data.descriptionLeftDisabled) || !data.descriptionLeft) {
            return null;
        }
        const offset = Math.max(this.state.width / 2, this.state.width - 20);
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

    private renderRightInfo(shutterPosition: number): React.JSX.Element | null {
        const data = this.state.rxData;
        if (!isTrue(data.show_value)) {
            return null;
        }
        const style: CSSProperties = {
            paddingLeft: `${5 + this.state.width / 2 + toNumber(data.infoRightPaddingLeft, 15)}px`,
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
                {`${shutterPosition}%`}
            </div>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const borderWidth = toNumber(data.border_width, 3);
        const count = Math.min(6, Math.max(1, toNumber(data.slide_count, 1)));
        const shutterPosition = this.getShutterPosition();

        const sashes: React.JSX.Element[] = [];
        for (let i = 1; i <= count; i++) {
            sashes.push(this.renderSash(i, shutterPosition));
        }

        return (
            <div
                ref={this.refRoot}
                className={this.getRootClass()}
                onClick={() => {
                    if (!this.state.editMode && data.oid && !this.state.popupOpen) {
                        this.openPopup();
                    }
                }}
            >
                {this.renderLeftInfo()}
                {this.renderRightInfo(shutterPosition)}
                <div
                    className="hq-frame-base"
                    style={{
                        paddingTop: borderWidth,
                        paddingBottom: Math.max(0, borderWidth - 1),
                        paddingLeft: borderWidth + 1,
                        paddingRight: borderWidth + 1,
                        background: data.frameColor ? frameGradient(data.frameColor) : undefined,
                    }}
                >
                    <div className="hq-blinds">{sashes}</div>
                </div>
                {this.renderPopup(shutterPosition)}
            </div>
        );
    }
}
