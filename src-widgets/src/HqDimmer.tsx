import type { RxWidgetInfo } from '@iobroker/types-vis-2';

import HqButtonBase, { type HqButtonBaseRxData, type HqButtonBaseState } from './Components/HqButtonBase';

/**
 * `tplHqDimmer` - the round button with a value arc around it.
 *
 * The arc appears while the pointer is over the widget (or always, with `alwaysShow`); a short tap toggles
 * between minimum and maximum, dragging sets the value.
 */
export default class HqDimmer extends HqButtonBase<HqButtonBaseRxData, HqButtonBaseState> {
    // eslint-disable-next-line class-methods-use-this
    protected isNumber(): boolean {
        return true;
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplHqDimmer',
            visSet: 'hqwidgets',
            visSetLabel: 'set_label',
            visName: 'Dimmer',
            visWidgetLabel: 'dimmer',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id', label: 'oid', filter: { common: { role: 'level.dimmer' } } },
                        ...HqButtonBase.groupIndicators(),
                        { name: 'readOnly', label: 'readOnly', type: 'checkbox' },
                    ],
                },
                {
                    name: 'value',
                    label: 'group_value',
                    fields: [
                        { name: 'unit', label: 'unit', default: '%' },
                        { name: 'min', label: 'min', type: 'number', default: 0 },
                        { name: 'max', label: 'max', type: 'number', default: 100 },
                        { name: 'digits', label: 'digits', type: 'number', default: 0 },
                        { name: 'step', label: 'step', type: 'number', default: 1 },
                        { name: 'is_comma', label: 'is_comma', type: 'checkbox', default: true },
                        { name: 'set_by_click', label: 'set_by_click', type: 'number' },
                    ],
                },
                HqButtonBase.groupCenter({ withCircle: true, iconDefault: 'img/bulb_off.png' }),
                HqButtonBase.groupLeftRight(false),
                HqButtonBase.groupStyles('vis-hq-button-base-normal', 'vis-hq-button-base-on'),
            ],
            visDefaultStyle: {
                width: 64,
                height: 64,
                'border-radius': '64px',
                position: 'absolute',
            },
            visPrev: 'widgets/vis-2-widgets-hqwidgets/img/prev_dimmer.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return HqDimmer.getWidgetInfo();
    }
}
