import React from 'react';

/** Colour of the track, in the four variants the vis-1 checkbox offered */
export type SwitchColor = 'orange' | 'blue' | 'green' | 'grey';

const TRACK_GRADIENTS: Record<SwitchColor, string> = {
    orange: 'linear-gradient(to bottom, #fe9810 0%, #e75400 61%, #e75400 91%, #ea8810 100%)',
    blue: 'linear-gradient(to bottom, #558abd 0%, #46729d 61%, #2a4661 91%, #5488ba 100%)',
    green: 'linear-gradient(to bottom, #00fe37 0%, #00e771 61%, #009f00 91%, #12a71f 100%)',
    grey: 'linear-gradient(to bottom, #d4d4d4 0%, #898989 61%, #808080 91%, #696969 100%)',
};

/** Geometry of the big variant; the small one is exactly half of it */
const BIG = { width: 216, height: 68, knobWidth: 115, knobHeight: 52, knobOff: 6, knobOn: 94 };

interface ShineSwitchProps {
    checked: boolean;
    size: 'big' | 'small';
    color: SwitchColor;
    colorOn: SwitchColor;
    readOnly?: boolean;
    onChange: (checked: boolean) => void;
}

/**
 * The sliding switch of `tplHqCheckbox` - the replacement for `$.fn.shineCheckbox`, which built the same look
 * out of nested pseudo elements around a hidden `<input type="checkbox">`.
 */
export default function ShineSwitch(props: ShineSwitchProps): React.JSX.Element {
    const scale = props.size === 'small' ? 0.5 : 1;
    const color = props.checked ? props.colorOn : props.color;

    return (
        <div
            className={`hq-switch${props.readOnly ? ' hq-switch-readonly' : ''}`}
            style={{
                width: BIG.width * scale,
                height: BIG.height * scale,
                borderRadius: (BIG.height / 2) * scale,
                background: TRACK_GRADIENTS[color] || TRACK_GRADIENTS.grey,
            }}
            onClick={props.readOnly ? undefined : () => props.onChange(!props.checked)}
            role="switch"
            aria-checked={props.checked}
        >
            <div
                className="hq-switch-knob"
                style={{
                    width: BIG.knobWidth * scale,
                    height: BIG.knobHeight * scale,
                    left: (props.checked ? BIG.knobOn : BIG.knobOff) * scale,
                }}
            />
        </div>
    );
}
