import type { RxWidgetInfo } from '@iobroker/types-vis-2';

import HqButtonBase, { type HqButtonBaseRxData, type HqButtonBaseState } from './Components/HqButtonBase';

/**
 * `tplHqButton` - the round On/Off button.
 *
 * Same widget id as the vis-1 template, so vis-2 renders this implementation for existing widgets and the
 * jQuery one keeps serving vis-1.
 */
export default class HqButton extends HqButtonBase<HqButtonBaseRxData, HqButtonBaseState> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplHqButton',
            visSet: 'hqwidgets',
            visSetLabel: 'set_label',
            visName: 'On/Off',
            visWidgetLabel: 'on_off',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id', label: 'oid' },
                        ...HqButtonBase.groupIndicators(),
                        { name: 'readOnly', label: 'readOnly', type: 'checkbox' },
                    ],
                },
                {
                    name: 'value',
                    label: 'group_value',
                    fields: [
                        { name: 'min', label: 'val_false', default: 'false' },
                        { name: 'max', label: 'val_true', default: 'true' },
                        { name: 'pushButton', label: 'pushButton', type: 'checkbox' },
                    ],
                },
                HqButtonBase.groupCenter({ withCaptionOn: true, iconDefault: 'img/bulb_off.png' }),
                HqButtonBase.groupLeftRight(true),
                HqButtonBase.groupStyles('vis-hq-button-base-normal', 'vis-hq-button-base-on'),
                {
                    name: 'ccontrol',
                    label: 'group_ccontrol',
                    fields: [
                        { name: 'urlTrue', label: 'urlTrue' },
                        { name: 'urlFalse', label: 'urlFalse' },
                        { name: 'oidTrue', type: 'id', label: 'oidTrue' },
                        { name: 'oidFalse', type: 'id', label: 'oidFalse' },
                        { name: 'oidTrueValue', label: 'oidTrueValue', hidden: '!data.oidTrue' },
                        { name: 'oidFalseValue', label: 'oidFalseValue', hidden: '!data.oidFalse && !data.oidTrue' },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 64,
                height: 64,
                'border-radius': '64px',
                position: 'absolute',
            },
            visPrev: 'widgets/vis-2-widgets-hqwidgets/img/prev_button.svg',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return HqButton.getWidgetInfo();
    }
}
