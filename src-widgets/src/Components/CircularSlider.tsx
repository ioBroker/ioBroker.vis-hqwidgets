import React, { type CSSProperties } from 'react';

/**
 * The round value control of the hqWidgets - the replacement for `jquery.knob` and the `$.fn.scala` wrapper
 * around it. Plain SVG plus pointer events, no canvas and no jQuery.
 *
 * Geometry follows the original: angle 0 is at the top and grows clockwise, `angleOffset` rotates the whole
 * scale and `angleArc` shortens it (360 = full circle).
 */

export interface CircularSliderProps {
    value: number;
    min: number;
    max: number;
    step: number;
    /** Outer size of the control in px */
    size: number;
    /** Ring width as a fraction of the radius, like in jquery.knob (default 0.35) */
    thickness?: number;
    /** Rotation of the scale in degrees */
    angleOffset?: number;
    /** Length of the scale in degrees */
    angleArc?: number;
    /** Draw the scale counterclockwise */
    anticlockwise?: boolean;
    /** Only draw a short segment at the current value instead of the whole bar. Length as in jquery.knob. */
    cursor?: number;
    color?: string;
    bgColor?: string;
    /** Colour of the value text. Defaults to `color`. */
    textColor?: string;
    fontSize?: number;
    /** Show the numeric value in the middle */
    displayValue?: boolean;
    /** Show the last acknowledged value as a second, dimmer bar while dragging */
    displayPrevious?: boolean;
    /** Value of the last acknowledged state - only used with `displayPrevious` */
    previousValue?: number;
    readOnly?: boolean;
    /** Renders the value as text, including unit and decimal separator */
    formatValue?: (value: number) => string;
    /** Per-value colour, used by the temperature widgets */
    colorize?: (value: number, isPrevious: boolean) => string;
    /** Rounded or flat ends of the bar */
    lineCap?: 'butt' | 'round';
    /** Called once when the user releases the control */
    onChange?: (value: number) => void;
    /** Called continuously while dragging */
    onChanging?: (value: number) => void;
    /** Called instead of onChange when the user only tapped the control (press shorter than 300 ms) */
    onClick?: () => void;
    /** Pointer entered/left - used to show and hide the control */
    onShow?: () => void;
    onHide?: () => void;
    className?: string;
    style?: CSSProperties;
}

const DEG2RAD = Math.PI / 180;

/** Point on the circle. Angle 0 is at the top and grows clockwise. */
function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
    const rad = angleDeg * DEG2RAD;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

/** SVG path of an arc. A sweep of exactly 360° is clamped, because a single `A` command cannot close a circle. */
function arcPath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): string {
    let sweep = sweepDeg;
    if (sweep > 359.999) {
        sweep = 359.999;
    } else if (sweep < -359.999) {
        sweep = -359.999;
    }
    const start = polar(cx, cy, r, startDeg);
    const end = polar(cx, cy, r, startDeg + sweep);
    const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
    const sweepFlag = sweep >= 0 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
}

interface CircularSliderState {
    /** Value shown while the user drags. `null` while the control follows the state. */
    dragValue: number | null;
}

export default class CircularSlider extends React.Component<CircularSliderProps, CircularSliderState> {
    private readonly refSvg: React.RefObject<SVGSVGElement | null> = React.createRef();
    private pointerId: number | null = null;
    private pressStarted = 0;
    private moved = false;

    constructor(props: CircularSliderProps) {
        super(props);
        this.state = { dragValue: null };
    }

    componentWillUnmount(): void {
        this.releasePointer();
    }

    private releasePointer(): void {
        if (this.pointerId !== null && this.refSvg.current?.hasPointerCapture(this.pointerId)) {
            try {
                this.refSvg.current.releasePointerCapture(this.pointerId);
            } catch {
                // the element may already be gone
            }
        }
        this.pointerId = null;
    }

    private get angleOffset(): number {
        return this.props.angleOffset || 0;
    }

    private get angleArc(): number {
        const arc = this.props.angleArc;
        return arc === undefined || arc === null || !arc ? 360 : arc;
    }

    /** Direction the scale runs in: +1 clockwise, -1 counterclockwise */
    private get direction(): number {
        return this.props.anticlockwise ? -1 : 1;
    }

    /** Value -> length of the bar in degrees (always positive, the direction is applied when drawing) */
    private valueToSweep(value: number): number {
        const { min, max } = this.props;
        if (max === min) {
            return 0;
        }
        const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
        return ratio * this.angleArc;
    }

    /** Pointer position -> value, snapped to `step` */
    private positionToValue(clientX: number, clientY: number): number {
        const svg = this.refSvg.current;
        if (!svg) {
            return this.props.value;
        }
        const rect = svg.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // atan2 with the axes swapped gives the angle from the top, growing clockwise
        let angle = Math.atan2(clientX - cx, cy - clientY) / DEG2RAD;
        angle = (angle * this.direction - this.angleOffset) % 360;
        if (angle < 0) {
            angle += 360;
        }

        const arc = this.angleArc;
        if (angle > arc) {
            // outside of a shortened scale: snap to whichever end is closer
            return angle - arc < (360 - arc) / 2 ? this.props.max : this.props.min;
        }

        const { min, max, step } = this.props;
        const raw = min + (angle / arc) * (max - min);
        const stepped = step > 0 ? Math.round(raw / step) * step : raw;
        return Math.min(max, Math.max(min, stepped));
    }

    private onPointerDown = (e: React.PointerEvent<SVGSVGElement>): void => {
        if (this.props.readOnly) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        this.pressStarted = Date.now();
        this.moved = false;
        this.pointerId = e.pointerId;
        try {
            this.refSvg.current?.setPointerCapture(e.pointerId);
        } catch {
            // without capture the drag still works, it just ends when the pointer leaves the element
        }

        const value = this.positionToValue(e.clientX, e.clientY);
        this.setState({ dragValue: value });
    };

    private onPointerMove = (e: React.PointerEvent<SVGSVGElement>): void => {
        if (this.pointerId === null || this.props.readOnly) {
            return;
        }
        e.preventDefault();
        const value = this.positionToValue(e.clientX, e.clientY);
        if (value !== this.state.dragValue) {
            this.moved = true;
            this.setState({ dragValue: value });
            this.props.onChanging?.(value);
        }
    };

    private onPointerUp = (e: React.PointerEvent<SVGSVGElement>): void => {
        if (this.pointerId === null) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        this.releasePointer();

        // The position of the release counts, not the last `pointermove` - moves can be coalesced or dropped,
        // and then the widget would be set to a value the user has already dragged away from.
        const value = this.positionToValue(e.clientX, e.clientY);
        this.setState({ dragValue: null });

        // A short press without movement is a click - the original distinguished them by a 300 ms timer
        if (!this.moved && Date.now() - this.pressStarted < 300) {
            this.props.onClick?.();
            return;
        }
        if (!this.props.readOnly) {
            this.props.onChange?.(value);
        }
    };

    private onPointerCancel = (): void => {
        this.releasePointer();
        this.setState({ dragValue: null });
    };

    render(): React.JSX.Element {
        const {
            size,
            color = '#FFCC00',
            bgColor = 'var(--hq-arc-track, #EEEEEE)',
            thickness = 0.35,
            cursor,
            displayValue,
            displayPrevious,
            formatValue,
            colorize,
            readOnly,
            fontSize,
            textColor,
            lineCap,
            className,
            style,
        } = this.props;

        const value = this.state.dragValue !== null ? this.state.dragValue : this.props.value;
        const previousValue = this.props.previousValue !== undefined ? this.props.previousValue : this.props.value;

        const strokeWidth = Math.max(1, (size / 2) * Math.min(1, Math.max(0.02, thickness)));
        const radius = (size - strokeWidth) / 2;
        const center = size / 2;

        const startDeg = this.angleOffset;
        const dir = this.direction;

        // The cursor length of jquery.knob is given in 1/100 radians on each side of the value
        const cursorExtDeg = cursor ? (cursor / 100 / DEG2RAD) * 2 : 0;

        const buildBar = (barValue: number): string => {
            const sweep = this.valueToSweep(barValue);
            if (cursorExtDeg) {
                return arcPath(center, center, radius, startDeg + dir * sweep - cursorExtDeg / 2, dir * cursorExtDeg);
            }
            return arcPath(center, center, radius, startDeg, dir * sweep);
        };

        const isDragging = this.state.dragValue !== null;
        const valueColor = colorize ? colorize(value, false) : color;
        const previousColor = colorize ? colorize(previousValue, true) : color;

        return (
            <svg
                ref={this.refSvg}
                className={`hq-arc${readOnly ? ' hq-arc-readonly' : ''}${className ? ` ${className}` : ''}`}
                style={style}
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                onPointerDown={this.onPointerDown}
                onPointerMove={this.onPointerMove}
                onPointerUp={this.onPointerUp}
                onPointerCancel={this.onPointerCancel}
            >
                {bgColor !== 'none' ? (
                    <path
                        d={arcPath(center, center, radius, startDeg, dir * this.angleArc)}
                        fill="none"
                        stroke={bgColor}
                        strokeWidth={strokeWidth}
                    />
                ) : null}
                {displayPrevious && isDragging ? (
                    <path
                        d={buildBar(previousValue)}
                        fill="none"
                        stroke={previousColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap={lineCap || 'butt'}
                        opacity={0.5}
                    />
                ) : null}
                <path
                    d={buildBar(value)}
                    fill="none"
                    stroke={valueColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap={lineCap || 'butt'}
                />
                {displayValue ? (
                    <text
                        className="hq-arc-value"
                        x={center}
                        y={center}
                        fill={textColor || color}
                        fontSize={fontSize || Math.round(size / 5)}
                    >
                        {formatValue ? formatValue(value) : value}
                    </text>
                ) : null}
            </svg>
        );
    }
}
