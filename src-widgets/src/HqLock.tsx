import React, { type CSSProperties } from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState, VisRxWidgetProps } from '@iobroker/types-vis-2';

import Generic from './Generic';
import { BatteryIcon } from './Components/Indicators';
import { watchOutsideClick } from './Components/outsideClick';
import { CHANGE_EFFECTS, SKINS } from './Components/HqButtonBase';
import { descriptionToText, isTrue, toNumber, toStateValue, withPx } from './utils';
import './styles.css';

const LOCK_IMG = 'widgets/hqwidgets/img';

interface HqLockRxData {
    oid: string;
    'oid-open': string;
    'oid-battery': string;
    noAnimate: boolean;

    closedIcon: string;
    openedIcon: string;

    popupRadius: number;
    buttonRadius: number;
    closeIcon: string;
    closeValue: string;
    closeStyle: string;
    openIcon: string;
    openValue: string;
    openStyle: string;
    openDoorIcon: string;
    openDoorValue: string;
    openDoorStyle: string;
    showTimeout: number;

    descriptionLeftDisabled: boolean;
    descriptionLeft: string;
    infoLeftFontSize: number;
    infoColor: string;
    infoBackground: string;
    infoLeftPaddingLeft: number;
    infoLeftPaddingRight: number;

    styleNormal: string;
    styleActive: string;
    usejQueryStyle: boolean;
    changeEffect: string;
    waveColor: string;
    testActive: boolean;
}

interface HqLockState extends VisRxWidgetState {
    width: number;
    height: number;
    popupOpen: boolean;
    effectCounter: number;
}

/**
 * `tplHqLock` - a door lock.
 *
 * The widget itself is only the lock icon; clicking it opens a round popup with up to three buttons
 * (lock, unlock and - if `oid-open` is configured - open the door), which closes itself after `showTimeout`.
 */
export default class HqLock extends Generic<HqLockRxData, HqLockState> {
    private readonly refRoot: React.RefObject<HTMLDivElement | null> = React.createRef();
    private resizeObserver: ResizeObserver | null = null;
    private hideTimer: ReturnType<typeof setTimeout> | null = null;
    /** Removes the listener that closes the popup on a click elsewhere in the view */
    private stopOutsideWatch: (() => void) | null = null;
    private lastSeenValue: unknown = undefined;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            width: 0,
            height: 0,
            popupOpen: false,
            effectCounter: 0,
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplHqLock',
            visSet: 'hqwidgets',
            visSetLabel: 'set_label',
            visName: 'Lock',
            visWidgetLabel: 'lock',
            // what the widget does, in the tooltip of the palette under the preview
            visHelp: 'help_lock',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id', label: 'oid', filter: { common: { role: 'switch.lock' } } },
                        { name: 'oid-open', type: 'id', label: 'oid-open' },
                        {
                            name: 'oid-battery',
                            type: 'id',
                            label: 'oid-battery',
                            filter: { common: { role: 'indicator.battery' } },
                        },
                        { name: 'noAnimate', label: 'noAnimate', type: 'checkbox' },
                    ],
                },
                {
                    name: 'image',
                    label: 'group_image',
                    fields: [
                        {
                            name: 'closedIcon',
                            label: 'closedIcon',
                            type: 'image',
                            default: `${LOCK_IMG}/lockLocked.png`,
                        },
                        {
                            name: 'openedIcon',
                            label: 'openedIcon',
                            type: 'image',
                            default: `${LOCK_IMG}/lockUnlocked.png`,
                        },
                    ],
                },
                {
                    name: 'popup',
                    label: 'group_popup',
                    fields: [
                        {
                            name: 'popupRadius',
                            label: 'popupRadius',
                            type: 'slider',
                            min: 50,
                            max: 150,
                            step: 1,
                            default: 75,
                        },
                        {
                            name: 'buttonRadius',
                            label: 'buttonRadius',
                            type: 'slider',
                            min: 0,
                            max: 150,
                            step: 1,
                            default: 50,
                        },
                        { name: 'closeIcon', label: 'closeIcon', type: 'image', default: `${LOCK_IMG}/lockLocked.png` },
                        { name: 'closeValue', label: 'closeValue' },
                        {
                            name: 'closeStyle',
                            label: 'closeStyle',
                            type: 'select',
                            noTranslation: true,
                            options: ['', ...SKINS],
                        },
                        { name: 'openIcon', label: 'openIcon', type: 'image', default: `${LOCK_IMG}/lockUnlocked.png` },
                        { name: 'openValue', label: 'openValue' },
                        {
                            name: 'openStyle',
                            label: 'openStyle',
                            type: 'select',
                            noTranslation: true,
                            options: ['', ...SKINS],
                        },
                        {
                            name: 'openDoorIcon',
                            label: 'openDoorIcon',
                            type: 'image',
                            default: `${LOCK_IMG}/openDoor.png`,
                            hidden: '!data["oid-open"]',
                        },
                        { name: 'openDoorValue', label: 'openDoorValue', hidden: '!data["oid-open"]' },
                        {
                            name: 'openDoorStyle',
                            label: 'openDoorStyle',
                            type: 'select',
                            noTranslation: true,
                            options: ['', ...SKINS],
                            hidden: '!data["oid-open"]',
                        },
                        {
                            name: 'showTimeout',
                            label: 'showTimeout',
                            type: 'slider',
                            min: 0,
                            max: 30000,
                            step: 100,
                            default: 5000,
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
                    ],
                },
                {
                    name: 'styles',
                    label: 'group_styles',
                    fields: [
                        {
                            name: 'styleNormal',
                            label: 'styleNormal',
                            type: 'select',
                            noTranslation: true,
                            options: SKINS,
                            default: 'hq-button-no-background',
                        },
                        {
                            name: 'styleActive',
                            label: 'styleActive',
                            type: 'select',
                            noTranslation: true,
                            options: SKINS,
                            default: 'hq-button-no-background',
                        },
                        { name: 'usejQueryStyle', label: 'usejQueryStyle', type: 'checkbox' },
                        {
                            name: 'changeEffect',
                            label: 'changeEffect',
                            type: 'select',
                            noTranslation: true,
                            options: CHANGE_EFFECTS,
                        },
                        {
                            name: 'waveColor',
                            label: 'waveColor',
                            type: 'color',
                            hidden: 'data.changeEffect !== "waves"',
                        },
                        { name: 'testActive', label: 'testActive', type: 'checkbox' },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 30,
                height: 30,
                position: 'absolute',
            },
            visPrev: 'widgets/vis-2-widgets-hqwidgets/img/prev_lock.svg',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return HqLock.getWidgetInfo();
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
        this.closePopup();
    }

    componentDidUpdate(prevProps: VisRxWidgetProps, prevState: typeof this.state): void {
        super.componentDidUpdate(prevProps, prevState);
        this.measure();

        const value = this.state.rxData.oid ? this.state.values[`${this.state.rxData.oid}.val`] : undefined;
        if (this.lastSeenValue === undefined) {
            this.lastSeenValue = value;
        } else if (value !== this.lastSeenValue) {
            this.lastSeenValue = value;
            if (this.state.rxData.changeEffect) {
                this.setState({ effectCounter: this.state.effectCounter + 1 });
            }
        }
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

    private getOpenValue(): string | number | boolean {
        return toStateValue(this.state.rxData.openValue, true);
    }

    private getCloseValue(): string | number | boolean {
        return toStateValue(this.state.rxData.closeValue, false);
    }

    /** The lock counts as closed as long as the state does not carry the "open" value */
    private isClosed(): boolean {
        const data = this.state.rxData;
        if (!data.oid || data.oid === 'nothing_selected') {
            return true;
        }
        const value = this.state.values[`${data.oid}.val`];
        return value != this.getOpenValue();
    }

    private openPopup = (): void => {
        if (this.state.editMode || !this.state.rxData.oid) {
            return;
        }
        this.clearHideTimer();
        this.stopOutsideWatch?.();
        // a click anywhere else in the view closes the popup again
        this.stopOutsideWatch = watchOutsideClick(this.refRoot, () => this.closePopup());
        this.setState({ popupOpen: true });

        const timeout = toNumber(this.state.rxData.showTimeout, 5000);
        if (timeout) {
            this.hideTimer = setTimeout(() => {
                this.hideTimer = null;
                this.closePopup();
            }, timeout);
        }
    };

    private closePopup(): void {
        this.stopOutsideWatch?.();
        this.stopOutsideWatch = null;
        this.clearHideTimer();
        if (this.state.popupOpen) {
            this.setState({ popupOpen: false });
        }
    }

    private writeAndClose(oid: string, value: string | number | boolean): void {
        this.closePopup();
        if (oid) {
            this.props.context.setValue(oid, value);
        }
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

    private renderPopup(): React.JSX.Element | null {
        const data = this.state.rxData;
        if (!data.oid || this.state.editMode) {
            return null;
        }
        const radius = toNumber(data.popupRadius, 75);
        const size = radius * 2;
        const buttonRadius = toNumber(data.buttonRadius, 50);

        return (
            <div
                className={`hq-biglock${this.state.popupOpen ? '' : ' hq-biglock-hidden'}${
                    isTrue(data.noAnimate) ? ' hq-biglock-no-animation' : ''
                }`}
                style={{
                    width: size,
                    height: size,
                    borderRadius: radius,
                    left: (this.state.width - size) / 2,
                    top: (this.state.height - size) / 2,
                }}
                onClick={e => e.stopPropagation()}
            >
                <div
                    className={`hq-biglock-button hq-biglock-close ${data.closeStyle || ''}`}
                    style={{ borderRadius: buttonRadius }}
                    title={Generic.t('close_lock')}
                    onClick={() => this.writeAndClose(data.oid, this.getCloseValue())}
                >
                    {data.closeIcon ? (
                        <img
                            src={data.closeIcon}
                            alt=""
                        />
                    ) : null}
                </div>
                <div
                    className={`hq-biglock-button hq-biglock-open ${data.openStyle || ''}`}
                    style={{ borderRadius: buttonRadius }}
                    title={Generic.t('open_lock')}
                    onClick={() => this.writeAndClose(data.oid, this.getOpenValue())}
                >
                    {data.openIcon ? (
                        <img
                            src={data.openIcon}
                            alt=""
                        />
                    ) : null}
                </div>
                {data['oid-open'] ? (
                    <div
                        className={`hq-biglock-button hq-biglock-openDoor ${data.openDoorStyle || ''}`}
                        style={{ borderRadius: buttonRadius }}
                        title={Generic.t('open_door')}
                        onClick={() => this.writeAndClose(data['oid-open'], toStateValue(data.openDoorValue, true))}
                    >
                        {data.openDoorIcon ? (
                            <img
                                src={data.openDoorIcon}
                                alt=""
                            />
                        ) : null}
                    </div>
                ) : null}
            </div>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        let closed = this.isClosed();
        if (this.state.editMode && isTrue(data.testActive)) {
            closed = !closed;
        }

        const skin = isTrue(data.usejQueryStyle)
            ? closed
                ? 'ui-state-default'
                : 'ui-state-active'
            : (closed ? data.styleNormal : data.styleActive) || 'hq-button-no-background';

        const icon = closed ? data.closedIcon : data.openedIcon || data.closedIcon;
        const battery = data['oid-battery'] ? !!this.state.values[`${data['oid-battery']}.val`] : false;
        const effectClass =
            data.changeEffect && data.changeEffect !== 'waves' && this.state.effectCounter
                ? ` hq-effect-${data.changeEffect}`
                : '';

        return (
            <div
                ref={this.refRoot}
                className={this.getRootClass()}
            >
                {this.renderLeftInfo()}
                <div
                    key={this.state.effectCounter}
                    className={`hq-main ${skin}${effectClass}`}
                    style={{ borderRadius: 'inherit' }}
                    onClick={this.openPopup}
                >
                    {data.changeEffect === 'waves' && this.state.effectCounter ? (
                        <React.Fragment key={this.state.effectCounter}>
                            <div
                                className="hq-wave hq-wave1"
                                style={{
                                    top: -2,
                                    left: -2,
                                    width: this.state.width,
                                    height: this.state.height,
                                    borderRadius: 'inherit',
                                    border: `2px solid ${data.waveColor || 'grey'}`,
                                }}
                            />
                            <div
                                className="hq-wave hq-wave2"
                                style={{
                                    top: -2,
                                    left: -2,
                                    width: this.state.width,
                                    height: this.state.height,
                                    borderRadius: 'inherit',
                                    border: `2px solid ${data.waveColor || 'grey'}`,
                                }}
                            />
                        </React.Fragment>
                    ) : null}
                    {icon ? (
                        <img
                            src={icon}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    ) : null}
                </div>
                {battery ? <BatteryIcon /> : null}
                {this.renderPopup()}
            </div>
        );
    }
}
