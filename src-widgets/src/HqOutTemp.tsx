import type { RxWidgetInfo } from '@iobroker/types-vis-2';

import HqButtonBase, { type HqButtonBaseRxData, type HqButtonBaseState } from './Components/HqButtonBase';
import { groupChart } from './HqInTemp';

/**
 * `tplHqOutTemp` - the outdoor temperature.
 *
 * Read-only: there is no setpoint, the value comes from `oid-actual` and is shown in the middle of the button
 * together with the humidity.
 */
export default class HqOutTemp extends HqButtonBase<HqButtonBaseRxData, HqButtonBaseState> {
    // eslint-disable-next-line class-methods-use-this
    protected isNumber(): boolean {
        return true;
    }

    // eslint-disable-next-line class-methods-use-this
    protected isTemperature(): boolean {
        return true;
    }

    /** This widget has no setpoint state, so nothing drives the arc */
    // eslint-disable-next-line class-methods-use-this
    protected getMainOid(): string {
        return '';
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplHqOutTemp',
            visSet: 'hqwidgets',
            visSetLabel: 'set_label',
            visName: 'Outdoor temperature',
            visWidgetLabel: 'outdoor_temperature',
            // what the widget does, in the tooltip of the palette under the preview
            visHelp: 'help_outdoor_temperature',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        {
                            name: 'oid-actual',
                            type: 'id',
                            label: 'oid-actual',
                            filter: { common: { role: 'value.temperature' } },
                        },
                        {
                            name: 'oid-humidity',
                            type: 'id',
                            label: 'oid-humidity',
                            filter: { common: { role: 'value.humidity' } },
                        },
                        {
                            name: 'oid-battery',
                            type: 'id',
                            label: 'oid-battery',
                            filter: { common: { role: 'indicator.battery' } },
                        },
                    ],
                },
                {
                    name: 'value',
                    label: 'group_value',
                    fields: [
                        { name: 'unit', label: 'unit', default: '°C' },
                        { name: 'digits', label: 'digits', type: 'number', default: 0 },
                        { name: 'is_comma', label: 'is_comma', type: 'checkbox', default: true },
                    ],
                },
                HqButtonBase.groupCenter({
                    withMidTextColor: true,
                    iconDefault: 'img/Heating.png',
                    iconWidthDefault: 45,
                    leftOffsetDefault: 25,
                }),
                HqButtonBase.groupLeftRight(false),
                HqButtonBase.groupStyles('hq-button-base-outtemp', undefined, false),
                groupChart(),
            ],
            visDefaultStyle: {
                width: 64,
                height: 64,
                'border-radius': '64px',
                position: 'absolute',
            },
            visPrev: 'widgets/vis-2-widgets-hqwidgets/img/prev_outtemp.svg',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return HqOutTemp.getWidgetInfo();
    }
}
