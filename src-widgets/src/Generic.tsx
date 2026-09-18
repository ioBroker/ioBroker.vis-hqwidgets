import type { VisRxWidgetState } from '@iobroker/types-vis-2';
import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';

/**
 * Base class of every hqWidget.
 *
 * `window.visRxWidget` is provided by the vis-2 runtime, so the widget set is built against the react/MUI copies
 * of the host instead of shipping its own.
 */
export default class Generic<
    RxData extends Record<string, any>,
    State extends Partial<VisRxWidgetState> = VisRxWidgetState,
> extends (window.visRxWidget as typeof VisRxWidget)<RxData, State> {
    /** Value of the state configured under `stateName`, e.g. `getPropertyValue('oid-battery')` */
    getPropertyValue = (stateName: string): any => this.state.values[`${(this.state.rxData as any)[stateName]}.val`];

    /** Full state object (val/ack/lc/...) of the state configured under `stateName` */
    getProperty = (stateName: string, attr: 'val' | 'ack' | 'lc' | 'ts' | 'q'): any =>
        this.state.values[`${(this.state.rxData as any)[stateName]}.${attr}` as `${string}.val`];

    static getI18nPrefix(): string {
        return 'vis_hqwidgets_';
    }

    /**
     * Class of the widget root. In the dark theme of vis-2 it carries `hq-rx-dark`, which switches the CSS
     * variables of `styles.css` - everything that lies on the view (the description pills, the track of the
     * arc, the signal text) follows the theme, the surfaces of the widgets themselves do not.
     */
    getRootClass(): string {
        return this.props.context.themeType === 'dark' ? 'hq-rx hq-rx-dark' : 'hq-rx';
    }
}
