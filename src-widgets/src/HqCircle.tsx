import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState, VisRxWidgetProps } from '@iobroker/types-vis-2';

import Generic from './Generic';
import CircularSlider from './Components/CircularSlider';
import { BatteryIcon, NoDataIcon, WorkingIcon } from './Components/Indicators';
import { formatNumber, isTrue, toNumber } from './utils';
import './styles.css';

interface HqCircleRxData {
    oid: string;
    'oid-working': string;
    'oid-battery': string;
    'oid-signal': string;
    unit: string;
    min: number;
    max: number;
    digits: number;
    step: number;
    is_comma: boolean;
    readOnly: boolean;

    caption: string;
    hideNumber: boolean;

    angleOffset: number;
    angleArc: number;
    displayPrevious: boolean;

    cursor: number;
    thickness: number;
    color: string;
    bgcolor: string;
    linecap: boolean;
    anticlockwise: boolean;
}

interface HqCircleState extends VisRxWidgetState {
    width: number;
    height: number;
}

/**
 * `tplHqCircle` - the free-standing round knob (vis-1 name: "CircleKnob").
 *
 * Unlike the dimmer this one is the widget itself, not an overlay: it always fills the whole widget and the
 * scale can be shortened and rotated with `angleArc` / `angleOffset`.
 */
export default class HqCircle extends Generic<HqCircleRxData, HqCircleState> {
    private readonly refRoot: React.RefObject<HTMLDivElement | null> = React.createRef();
    private resizeObserver: ResizeObserver | null = null;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = { ...this.state, width: 0, height: 0 };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplHqCircle',
            visSet: 'hqwidgets',
            visSetLabel: 'set_label',
            visName: 'CircleKnob',
            visWidgetLabel: 'circle_knob',
            // what the widget does, in the tooltip of the palette under the preview
            visHelp: 'help_circle_knob',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id', label: 'oid' },
                        { name: 'oid-working', type: 'id', label: 'oid-working' },
                        {
                            name: 'oid-battery',
                            type: 'id',
                            label: 'oid-battery',
                            filter: { common: { role: 'indicator.battery' } },
                        },
                        { name: 'oid-signal', type: 'id', label: 'oid-signal' },
                    ],
                },
                {
                    name: 'value',
                    label: 'group_value',
                    fields: [
                        { name: 'unit', label: 'unit' },
                        { name: 'min', label: 'min', type: 'number', default: 0 },
                        { name: 'max', label: 'max', type: 'number', default: 100 },
                        { name: 'digits', label: 'digits', type: 'number', default: 0 },
                        { name: 'step', label: 'step', type: 'number', default: 1 },
                        { name: 'is_comma', label: 'is_comma', type: 'checkbox', default: true },
                        { name: 'readOnly', label: 'readOnly', type: 'checkbox' },
                    ],
                },
                {
                    name: 'center',
                    label: 'group_center',
                    fields: [
                        { name: 'caption', label: 'caption' },
                        { name: 'hideNumber', label: 'hideNumber', type: 'checkbox' },
                    ],
                },
                {
                    name: 'arc',
                    label: 'group_arc',
                    fields: [
                        { name: 'angleOffset', label: 'angleOffset', type: 'slider', min: 0, max: 360, step: 1 },
                        { name: 'angleArc', label: 'angleArc', type: 'slider', min: 0, max: 360, step: 1 },
                        { name: 'displayPrevious', label: 'displayPrevious', type: 'checkbox', default: true },
                    ],
                },
                {
                    name: 'style',
                    label: 'group_style',
                    fields: [
                        { name: 'cursor', label: 'cursor', type: 'slider', min: 0, max: 350, step: 1 },
                        { name: 'thickness', label: 'thickness', type: 'slider', min: 0.05, max: 1, step: 0.05 },
                        { name: 'color', label: 'color', type: 'color' },
                        { name: 'bgcolor', label: 'bgcolor', type: 'color' },
                        { name: 'linecap', label: 'linecap', type: 'checkbox' },
                        { name: 'anticlockwise', label: 'anticlockwise', type: 'checkbox' },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 64,
                height: 64,
                position: 'absolute',
            },
            visPrev: 'widgets/vis-2-widgets-hqwidgets/img/prev_circle.svg',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return HqCircle.getWidgetInfo();
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
        if (!el) {
            return;
        }
        if (el.clientWidth !== this.state.width || el.clientHeight !== this.state.height) {
            this.setState({ width: el.clientWidth, height: el.clientHeight });
        }
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const min = toNumber(data.min, 0);
        const max = toNumber(data.max, 100);
        const raw = data.oid ? this.state.values[`${data.oid}.val`] : min;
        const value = toNumber(raw, min);

        const hasNoData = !!data.oid && (raw === undefined || raw === null);
        const working = data['oid-working']
            ? !!this.state.values[`${data['oid-working']}.val`]
            : !!data.oid && this.state.values[`${data.oid}.ack`] === false;
        const battery = data['oid-battery'] ? !!this.state.values[`${data['oid-battery']}.val`] : false;
        const signal = data['oid-signal'] ? this.state.values[`${data['oid-signal']}.val`] : undefined;
        const digits = data.digits === undefined || data.digits === null ? null : toNumber(data.digits, 0);

        // The knob is square: the shorter side decides
        const size = Math.min(this.state.width, this.state.height) || 0;

        // A shortened scale is centred at the bottom unless the offset says otherwise - as in the vis-1 widget
        let angleOffset = toNumber(data.angleOffset, NaN);
        const angleArc = toNumber(data.angleArc, 360);
        if (isNaN(angleOffset)) {
            angleOffset = angleArc && angleArc !== 360 ? 180 + (360 - angleArc) / 2 : 0;
        }

        return (
            <div
                ref={this.refRoot}
                className={this.getRootClass()}
            >
                {size ? (
                    <CircularSlider
                        style={{ left: (this.state.width - size) / 2, top: (this.state.height - size) / 2, opacity: 1 }}
                        size={size}
                        value={value}
                        min={min}
                        max={max}
                        step={toNumber(data.step, 1)}
                        thickness={toNumber(data.thickness, 0.35)}
                        angleOffset={angleOffset}
                        angleArc={angleArc}
                        anticlockwise={isTrue(data.anticlockwise)}
                        cursor={toNumber(data.cursor, 0)}
                        lineCap={isTrue(data.linecap) ? 'round' : 'butt'}
                        color={data.color || '#87CEEB'}
                        bgColor={data.bgcolor || undefined}
                        displayPrevious={isTrue(data.displayPrevious)}
                        displayValue={!isTrue(data.hideNumber)}
                        fontSize={Math.round(size / 4)}
                        formatValue={(v: number) =>
                            `${formatNumber(v, digits, isTrue(data.is_comma))}${data.unit || ''}`
                        }
                        readOnly={this.state.editMode || isTrue(data.readOnly) || !data.oid}
                        onChange={(v: number) => this.props.context.setValue(data.oid, v)}
                    />
                ) : null}
                {data.caption ? (
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: '60%',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'none',
                        }}
                    >
                        {data.caption}
                    </div>
                ) : null}
                {hasNoData ? <NoDataIcon /> : null}
                {working ? <WorkingIcon /> : null}
                {battery ? <BatteryIcon /> : null}
                {signal !== undefined && signal !== null ? <div className="hq-signal">{signal}</div> : null}
            </div>
        );
    }
}
