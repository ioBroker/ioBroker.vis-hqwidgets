import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState } from '@iobroker/types-vis-2';

import Generic from './Generic';
import Odometer, { parseFormat } from './Components/Odometer';
import { isTrue, toNumber } from './utils';
import './styles.css';

interface HqOdometerRxData {
    oid: string;
    style: string;
    format: string;
    factor: number;
    leadingZeros: boolean;
    duration: number;
}

/**
 * `tplHqOdometer` - a mechanical counter.
 *
 * `format` describes the grouping and the decimals, `factor` scales the value before it is shown, and
 * `leadingZeros` pads the integer part to the width of the format.
 */
export default class HqOdometer extends Generic<HqOdometerRxData, VisRxWidgetState> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplHqOdometer',
            visSet: 'hqwidgets',
            visSetLabel: 'set_label',
            visName: 'Odometer',
            visWidgetLabel: 'odometer',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id', label: 'oid', filter: { common: { type: 'number' } } },
                        {
                            name: 'style',
                            label: 'style',
                            type: 'select',
                            noTranslation: true,
                            options: ['car', 'default', 'digital', 'minimal', 'plaza', 'slot-machine', 'train-station'],
                            default: 'car',
                        },
                    ],
                },
                {
                    name: 'extended',
                    label: 'group_extended',
                    fields: [
                        { name: 'format', label: 'format', default: '(ddd),dd', tooltip: 'format_tooltip' },
                        { name: 'factor', label: 'factor', type: 'number', default: 1 },
                        { name: 'leadingZeros', label: 'leadingZeros', type: 'checkbox', default: true },
                        { name: 'duration', label: 'duration', type: 'number', default: 3000 },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 125,
                height: 42,
                'font-size': '24px',
                position: 'absolute',
            },
            visPrev: 'widgets/vis-2-widgets-hqwidgets/img/prev_odometer.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return HqOdometer.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const raw = data.oid ? this.state.values[`${data.oid}.val`] : 0;
        const value = toNumber(raw, 0) * toNumber(data.factor, 1);

        return (
            <div
                className={this.getRootClass()}
                style={{ display: 'flex', alignItems: 'center' }}
            >
                <Odometer
                    value={value}
                    format={parseFormat(data.format)}
                    leadingZeros={isTrue(data.leadingZeros)}
                    theme={data.style || 'car'}
                    duration={toNumber(data.duration, 3000)}
                />
            </div>
        );
    }
}
