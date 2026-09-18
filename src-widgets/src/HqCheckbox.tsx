import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState } from '@iobroker/types-vis-2';

import Generic from './Generic';
import ShineSwitch, { type SwitchColor } from './Components/ShineSwitch';
import { isTrue, toStateValue } from './utils';
import './styles.css';

interface HqCheckboxRxData {
    oid: string;
    val_false: string;
    val_true: string;
    staticValue: string;
    checkboxSize: 'big' | 'small';
    checkboxColor: SwitchColor;
    checkboxColorOn: SwitchColor;
    readOnly: boolean;
}

/**
 * `tplHqCheckbox` - the sliding on/off switch.
 *
 * `val_true` / `val_false` are the values written to the state; without an object id the widget only shows
 * `staticValue`.
 */
export default class HqCheckbox extends Generic<HqCheckboxRxData, VisRxWidgetState> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplHqCheckbox',
            visSet: 'hqwidgets',
            visSetLabel: 'set_label',
            visName: 'Checkbox',
            visWidgetLabel: 'checkbox',
            visAttrs: [
                {
                    name: 'common',
                    fields: [
                        { name: 'oid', type: 'id', label: 'oid' },
                        { name: 'val_false', label: 'val_false', default: 'false' },
                        { name: 'val_true', label: 'val_true', default: 'true' },
                        {
                            name: 'staticValue',
                            label: 'staticValue',
                            tooltip: 'staticValue_tooltip',
                            hidden: '!!data.oid',
                        },
                        { name: 'readOnly', label: 'readOnly', type: 'checkbox' },
                    ],
                },
                {
                    name: 'style',
                    label: 'group_style',
                    fields: [
                        {
                            name: 'checkboxSize',
                            label: 'checkboxSize',
                            type: 'select',
                            options: ['big', 'small'],
                            default: 'big',
                        },
                        {
                            name: 'checkboxColor',
                            label: 'checkboxColor',
                            type: 'select',
                            options: ['orange', 'blue', 'green', 'grey'],
                            default: 'grey',
                        },
                        {
                            name: 'checkboxColorOn',
                            label: 'checkboxColorOn',
                            type: 'select',
                            options: ['orange', 'blue', 'green', 'grey'],
                            default: 'orange',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: 216,
                height: 68,
                position: 'absolute',
            },
            visPrev: 'widgets/vis-2-widgets-hqwidgets/img/prev_checkbox.svg',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return HqCheckbox.getWidgetInfo();
    }

    private getTrueValue(): string | number | boolean {
        return toStateValue(this.state.rxData.val_true, true);
    }

    private getFalseValue(): string | number | boolean {
        return toStateValue(this.state.rxData.val_false, false);
    }

    /**
     * Whether the switch stands on "true".
     *
     * The vis-1 widget compared loosely against `val_true`, with one extra rule: if `val_true` is the boolean
     * `true`, any positive number counts as on.
     */
    private isChecked(): boolean {
        const data = this.state.rxData;
        const raw = data.oid ? this.state.values[`${data.oid}.val`] : data.staticValue;
        const max = this.getTrueValue();

        let value: unknown = raw;
        if (value === 'true') {
            value = true;
        } else if (value === 'false') {
            value = false;
        } else if (value !== '' && value !== null && value !== undefined && !isNaN(parseFloat(value as string))) {
            value = parseFloat(value as string);
        }
        if (max === true && typeof value === 'number') {
            return value > 0;
        }
        return value == max;
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const data = this.state.rxData;
        const readOnly = this.state.editMode || isTrue(data.readOnly) || !data.oid;

        /*
         * The switch has a fixed size (216x68, small 108x34). The vis-1 widget resized the widget div itself
         * when "small" was picked; a vis-2 widget must not rewrite the style of the user, so it is centred in
         * whatever box the widget has instead.
         */
        return (
            <div
                className={this.getRootClass()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <ShineSwitch
                    checked={this.isChecked()}
                    size={data.checkboxSize === 'small' ? 'small' : 'big'}
                    color={data.checkboxColor || 'grey'}
                    colorOn={data.checkboxColorOn || data.checkboxColor || 'orange'}
                    readOnly={readOnly}
                    onChange={checked =>
                        this.props.context.setValue(data.oid, checked ? this.getTrueValue() : this.getFalseValue())
                    }
                />
            </div>
        );
    }
}
