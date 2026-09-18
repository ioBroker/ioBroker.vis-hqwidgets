import React, { type CSSProperties } from 'react';

/**
 * The vertical slider of the shutter popup - the replacement for `$.fn.makeSlider`, which was built on the
 * jQuery-UI slider.
 *
 * It works in "shutter position": 0 at the top means fully open, 100 at the bottom fully closed, so the filled
 * part of the track is always the closed part of the window.
 */
interface VerticalSliderProps {
    /** Closed part in percent, 0...100 */
    position: number;
    /** Called while dragging */
    onChanging?: (position: number) => void;
    /** Called when the pointer is released */
    onChange: (position: number) => void;
    className?: string;
    style?: CSSProperties;
}

interface VerticalSliderState {
    dragPosition: number | null;
}

export default class VerticalSlider extends React.Component<VerticalSliderProps, VerticalSliderState> {
    private readonly refTrack: React.RefObject<HTMLDivElement | null> = React.createRef();
    private pointerId: number | null = null;

    constructor(props: VerticalSliderProps) {
        super(props);
        this.state = { dragPosition: null };
    }

    componentWillUnmount(): void {
        this.release();
    }

    private release(): void {
        if (this.pointerId !== null && this.refTrack.current?.hasPointerCapture(this.pointerId)) {
            try {
                this.refTrack.current.releasePointerCapture(this.pointerId);
            } catch {
                // element already gone
            }
        }
        this.pointerId = null;
    }

    private positionFromEvent(clientY: number): number {
        const track = this.refTrack.current;
        if (!track) {
            return this.props.position;
        }
        const rect = track.getBoundingClientRect();
        if (!rect.height) {
            return this.props.position;
        }
        const ratio = (clientY - rect.top) / rect.height;
        return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
    }

    private onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        this.pointerId = e.pointerId;
        try {
            this.refTrack.current?.setPointerCapture(e.pointerId);
        } catch {
            // without capture the drag still works, it just ends when the pointer leaves the element
        }
        const position = this.positionFromEvent(e.clientY);
        this.setState({ dragPosition: position });
        this.props.onChanging?.(position);
    };

    private onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
        if (this.pointerId === null) {
            return;
        }
        e.preventDefault();
        const position = this.positionFromEvent(e.clientY);
        if (position !== this.state.dragPosition) {
            this.setState({ dragPosition: position });
            this.props.onChanging?.(position);
        }
    };

    private onPointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
        if (this.pointerId === null) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        this.release();
        // The position of the release counts, not the last `pointermove` - moves can be coalesced or dropped,
        // and then the widget would be set to a value the user has already dragged away from.
        const position = this.positionFromEvent(e.clientY);
        this.setState({ dragPosition: null });
        this.props.onChange(position);
    };

    render(): React.JSX.Element {
        const position = this.state.dragPosition !== null ? this.state.dragPosition : this.props.position;
        return (
            <div
                ref={this.refTrack}
                className={`hq-blind-popup-slider${this.props.className ? ` ${this.props.className}` : ''}`}
                style={this.props.style}
                onPointerDown={this.onPointerDown}
                onPointerMove={this.onPointerMove}
                onPointerUp={this.onPointerUp}
                onPointerCancel={this.onPointerUp}
            >
                <div
                    className="hq-blind-popup-slider-fill"
                    style={{ height: `${position}%` }}
                />
                <div
                    className="hq-blind-popup-slider-handle"
                    style={{ top: `${position}%` }}
                />
            </div>
        );
    }
}
