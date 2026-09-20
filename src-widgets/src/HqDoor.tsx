import React, { type CSSProperties } from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState, VisRxWidgetProps } from '@iobroker/types-vis-2';

import Generic from './Generic';
import { BatteryIcon } from './Components/Indicators';
import { descriptionToText, frameGradient, isTrue, toNumber, withPx } from './utils';
import './styles.css';

interface HqDoorRxData {
    oid: string;
    'oid-battery': string;
    'oid-signal': string;
    border_width: number;
    invert: boolean;
    door_type: '' | 'left' | 'right';
    noAnimate: boolean;
    emptyColor: string;
    frameColor: string;
    sheetColor: string;

    descriptionLeftDisabled: boolean;
    descriptionLeft: string;
    infoLeftFontSize: number;
    infoColor: string;
    infoBackground: string;
    infoLeftPaddingLeft: number;
    infoLeftPaddingRight: number;
}

interface HqDoorState extends VisRxWidgetState {
    width: number;
}

/**
 * `tplHqDoor` - a door that swings open when its contact reports "open".
 *
 * `door_type` picks the side the gap appears on; the handle moves with it.
 */
export default class HqDoor extends Generic<HqDoorRxData, HqDoorState> {
    private readonly refRoot: React.RefObject<HTMLDivElement | null> = React.createRef();
    private resizeObserver: ResizeObserver | null = null;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = { ...this.state, width: 0 };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplHqDoor',
            visSet: 'hqwidgets',
            visSetLabel: 'set_label',
            visName: 'Door',
            visWidgetLabel: 'door',
            // what the widget does, in the tooltip of the palette under the preview
            visHelp: 'help_door',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id', label: 'oid', filter: { common: { role: 'state' } } },
                        {
                            name: 'oid-battery',
                            type: 'id',
                            label: 'oid-battery',
                            filter: { common: { role: 'indicator.battery' } },
                        },
                        { name: 'oid-signal', type: 'id', label: 'oid-signal' },
                        {
                            name: 'border_width',
                            label: 'border_width',
                            type: 'slider',
                            min: 0,
                            max: 10,
                            step: 1,
                            default: 3,
                        },
                        { name: 'invert', label: 'invert', type: 'checkbox' },
                        { name: 'door_type', label: 'door_type', type: 'select', options: ['', 'left', 'right'] },
                        { name: 'noAnimate', label: 'noAnimate', type: 'checkbox' },
                        { name: 'emptyColor', label: 'emptyColor', type: 'color' },
                        { name: 'frameColor', label: 'frameColor', type: 'color', tooltip: 'frameColor_tooltip' },
                        { name: 'sheetColor', label: 'sheetColor', type: 'color', tooltip: 'sheetColor_tooltip' },
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
            ],
            visDefaultStyle: {
                width: 50,
                height: 100,
                position: 'absolute',
            },
            visPrev: 'widgets/vis-2-widgets-hqwidgets/img/prev_door.svg',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return HqDoor.getWidgetInfo();
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
    }

    componentDidUpdate(prevProps: VisRxWidgetProps, prevState: typeof this.state): void {
        super.componentDidUpdate(prevProps, prevState);
        this.measure();
    }

    private measure(): void {
        const el = this.refRoot.current;
        if (el && el.clientWidth !== this.state.width) {
            this.setState({ width: el.clientWidth });
        }
    }

    /** `true` when the door stands open. Accepts booleans, numbers and their string spellings. */
    private isOpen(): boolean {
        const data = this.state.rxData;
        if (!data.oid) {
            return false;
        }
        const raw = this.state.values[`${data.oid}.val`];
        let open: boolean;
        if (raw === 'true' || raw === true) {
            open = true;
        } else if (raw === 'false' || raw === false) {
            open = false;
        } else if (typeof raw === 'string') {
            open = parseFloat(raw) > 0;
        } else {
            open = !!raw;
        }
        return isTrue(data.invert) ? !open : open;
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

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const borderWidth = toNumber(data.border_width, 3);
        const open = this.isOpen();
        const gapOnLeft = data.door_type === 'right';

        // Open: the sheet shrinks to 80% and the gap takes the remaining 20%; the handle follows.
        const sheetWidth = open ? '80%' : '100%';
        const gapWidth = open ? '20%' : '0%';
        const handleLeft = gapOnLeft ? (open ? '30%' : '15%') : open ? '60%' : '85%';

        const battery = data['oid-battery'] ? !!this.state.values[`${data['oid-battery']}.val`] : false;
        const signal = data['oid-signal'] ? this.state.values[`${data['oid-signal']}.val`] : undefined;
        const gapStyle: CSSProperties = { width: gapWidth, background: data.emptyColor || '#515151' };
        // Without a colour the stylesheet decides; the leaf and its handle always share the same look
        const leafBackground = data.sheetColor ? frameGradient(data.sheetColor) : undefined;

        return (
            <div
                ref={this.refRoot}
                className={this.getRootClass()}
            >
                {this.renderLeftInfo()}
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
                    <div className={`hq-door${isTrue(data.noAnimate) ? ' hq-door-no-animation' : ''}`}>
                        {gapOnLeft ? (
                            <div
                                className="hq-door-gap"
                                style={gapStyle}
                            />
                        ) : null}
                        <div
                            className="hq-door-sheet"
                            style={{ width: sheetWidth, background: leafBackground }}
                        >
                            <div
                                className="hq-door-handle"
                                style={{ left: handleLeft, background: leafBackground }}
                            />
                        </div>
                        {!gapOnLeft ? (
                            <div
                                className="hq-door-gap"
                                style={gapStyle}
                            />
                        ) : null}
                    </div>
                </div>
                {battery ? <BatteryIcon /> : null}
                {signal !== undefined && signal !== null ? <div className="hq-signal">{signal}</div> : null}
            </div>
        );
    }
}
