import type { RxWidgetInfo, RxWidgetInfoGroup } from '@iobroker/types-vis-2';

import HqButtonBase, { type HqButtonBaseRxData, type HqButtonBaseState } from './Components/HqButtonBase';

/** The chart dialog both temperature widgets can open */
export function groupChart(): RxWidgetInfoGroup {
    return {
        name: 'chart',
        label: 'group_chart',
        fields: [
            { name: 'url', label: 'url' },
            { name: 'dialog_title', label: 'dialog_title', hidden: '!data.url' },
            { name: 'dialog_width', label: 'dialog_width', type: 'number', default: 600, hidden: '!data.url' },
            { name: 'dialog_height', label: 'dialog_height', type: 'number', default: 400, hidden: '!data.url' },
            { name: 'dialog_modal', label: 'dialog_modal', type: 'checkbox', hidden: '!data.url' },
            {
                name: 'dialog_timeout',
                label: 'dialog_timeout',
                type: 'number',
                min: 0,
                max: 3600000,
                step: 100,
                hidden: '!data.url',
            },
            { name: 'dialog_open', label: 'dialog_open', type: 'checkbox', hidden: '!data.url' },
        ],
    };
}

/**
 * `tplHqInTemp` - the setpoint of a thermostat.
 *
 * The arc sets `oid`, the middle shows the measured temperature (`oid-actual`) and the humidity, the right pill
 * additionally the valve position (`oid-drive`).
 */
export default class HqInTemp extends HqButtonBase<HqButtonBaseRxData, HqButtonBaseState> {
    // eslint-disable-next-line class-methods-use-this
    protected isNumber(): boolean {
        return true;
    }

    // eslint-disable-next-line class-methods-use-this
    protected isTemperature(): boolean {
        return true;
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplHqInTemp',
            visSet: 'hqwidgets',
            visSetLabel: 'set_label',
            visName: 'Inner temperature',
            visWidgetLabel: 'inner_temperature',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id', label: 'oid', filter: { common: { role: 'level.temperature' } } },
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
                            name: 'oid-drive',
                            type: 'id',
                            label: 'oid-drive',
                            filter: { common: { role: 'value.valve' } },
                        },
                        { name: 'valveBinary', label: 'valveBinary', type: 'checkbox', hidden: '!data["oid-drive"]' },
                        {
                            name: 'valve1',
                            label: 'valve1',
                            type: 'checkbox',
                            hidden: '!data["oid-drive"] || data.valveBinary === true || data.valveBinary === "true"',
                        },
                        {
                            name: 'oid-battery',
                            type: 'id',
                            label: 'oid-battery',
                            filter: { common: { role: 'indicator.battery' } },
                        },
                        { name: 'readOnly', label: 'readOnly', type: 'checkbox' },
                    ],
                },
                {
                    name: 'value',
                    label: 'group_value',
                    fields: [
                        { name: 'unit', label: 'unit', default: '°C' },
                        { name: 'min', label: 'min', type: 'number', default: 6 },
                        { name: 'max', label: 'max', type: 'number', default: 30 },
                        { name: 'digits', label: 'digits', type: 'number', default: 0 },
                        { name: 'step', label: 'step', type: 'number', default: 1 },
                        { name: 'is_comma', label: 'is_comma', type: 'checkbox', default: true },
                    ],
                },
                HqButtonBase.groupCenter({
                    withCircle: true,
                    withMidTextColor: true,
                    iconDefault: 'img/Heating.png',
                    iconWidthDefault: 45,
                    leftOffsetDefault: 25,
                }),
                HqButtonBase.groupLeftRight(false),
                HqButtonBase.groupStyles('hq-button-base-intemp', undefined, false),
                groupChart(),
            ],
            visDefaultStyle: {
                width: 64,
                height: 64,
                'border-radius': '64px',
                position: 'absolute',
            },
            visPrev: 'widgets/vis-2-widgets-hqwidgets/img/prev_intemp.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return HqInTemp.getWidgetInfo();
    }
}
