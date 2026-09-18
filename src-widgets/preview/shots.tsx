/*
 * Scenes for the screenshots of the documentation (`docs/img/*.png`).
 *
 * Every `<section data-shot="name">` becomes one image: `screenshots.mjs` opens this page in a headless Chrome and
 * cuts the sections out. All values are fixed, so the images only change when a widget changes.
 *
 * The widgets use their real default images where possible: `widgets/hqwidgets/img/...` comes from this
 * repository, `img/...` (lamp, thermometer) from vis-2 if the dev server knows where it is (`VIS2_IMG`), otherwise
 * the inline icons of the preview stand in.
 *
 * Not part of the widget set - excluded from lint and never built into `widgets/`.
 */
import React, { type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';

// puts the stub of `window.visRxWidget` in place - before the widgets are imported below
import { withDefaults } from './stub';
import { ICONS } from './icons';

const [
    { default: HqButton },
    { default: HqDimmer },
    { default: HqInTemp },
    { default: HqOutTemp },
    { default: HqShutter },
    { default: HqDoor },
    { default: HqLock },
    { default: HqCheckbox },
    { default: HqCircle },
    { default: HqOdometer },
    { SKINS },
] = await Promise.all([
    import('../src/HqButton'),
    import('../src/HqDimmer'),
    import('../src/HqInTemp'),
    import('../src/HqOutTemp'),
    import('../src/HqShutter'),
    import('../src/HqDoor'),
    import('../src/HqLock'),
    import('../src/HqCheckbox'),
    import('../src/HqCircle'),
    import('../src/HqOdometer'),
    import('../src/Components/HqButtonBase'),
]);

/** `true` if the dev server serves the images of vis-2 - for unknown paths it answers with the HTML fallback */
async function hasVisImages(): Promise<boolean> {
    try {
        const response = await fetch('img/bulb_off.png');
        return response.ok && (response.headers.get('content-type') || '').startsWith('image/');
    } catch {
        return false;
    }
}

const IMG = (await hasVisImages())
    ? { bulbOff: 'img/bulb_off.png', bulbOn: 'img/bulb_on.png', heating: 'img/Heating.png' }
    : { bulbOff: ICONS.bulbOff, bulbOn: ICONS.bulbOn, heating: ICONS.heating };

// ------------------------------------------------------------------------------------------------ helpers

type Values = Record<string, any>;

const MINUTE = 60_000;

/** Acknowledged states, `{ 'a.b': 1 }` -> `{ 'a.b.val': 1, 'a.b.ack': true, 'a.b.lc': ... }` */
function states(map: Record<string, any>, lastChange = Date.now() - 17 * MINUTE): Values {
    const values: Values = {};
    for (const [id, val] of Object.entries(map)) {
        values[`${id}.val`] = val;
        values[`${id}.ack`] = true;
        values[`${id}.lc`] = lastChange;
    }
    return values;
}

const CONTEXT = {
    light: { setValue: (): void => {}, socket: {}, themeType: 'light' },
    dark: { setValue: (): void => {}, socket: {}, themeType: 'dark' },
};

const ROUND = { 'border-radius': '64px' };

/** Dark theme of the current section */
const DarkTheme = React.createContext(false);

/** One widget with the attributes the vis editor would store for it */
function W(props: { type: any; data: Record<string, any>; values?: Values; style?: Record<string, any> }): React.JSX.Element {
    const dark = React.useContext(DarkTheme);
    const Type = props.type;
    return (
        <Type
            context={dark ? CONTEXT.dark : CONTEXT.light}
            editMode={false}
            view="view"
            id="w1"
            refParent={{ current: null }}
            values={props.values || {}}
            rxStyle={props.style || {}}
            rxData={withDefaults(Type, props.data)}
        />
    );
}

/** One screenshot */
function Shot(props: { name: string; dark?: boolean; style?: CSSProperties; children: React.ReactNode }): React.JSX.Element {
    return (
        <DarkTheme.Provider value={!!props.dark}>
            <section
                data-shot={props.name}
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    gap: 12,
                    width: 'max-content',
                    padding: 16,
                    boxSizing: 'border-box',
                    background: props.dark ? '#23272e' : '#fafafa',
                    color: props.dark ? '#dfe3e8' : '#333',
                    ...props.style,
                }}
            >
                {props.children}
            </section>
        </DarkTheme.Provider>
    );
}

/**
 * Room for one widget. `pad` (top, right, bottom, left) makes space for what reaches outside of the widget: the
 * description pills, the arc, the popups.
 */
function Item(props: {
    w: number;
    h: number;
    pad?: [number, number, number, number];
    caption?: string;
    round?: boolean;
    fontSize?: number;
    children: React.ReactNode;
}): React.JSX.Element {
    const [top, right, bottom, left] = props.pad || [16, 16, 16, 16];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ padding: `${top}px ${right}px ${bottom}px ${left}px` }}>
                <div
                    style={{
                        width: props.w,
                        height: props.h,
                        position: 'relative',
                        borderRadius: props.round ? props.w : undefined,
                        fontSize: props.fontSize,
                    }}
                >
                    {props.children}
                </div>
            </div>
            {props.caption ? (
                <code style={{ fontSize: 12, opacity: 0.7, marginTop: 4, whiteSpace: 'pre', textAlign: 'center' }}>
                    {props.caption}
                </code>
            ) : null}
        </div>
    );
}

/** Absolutely placed widget, like on a vis view */
function At(props: {
    x: number;
    y: number;
    w: number;
    h: number;
    round?: boolean;
    fontSize?: number;
    children: React.ReactNode;
}): React.JSX.Element {
    return (
        <div
            style={{
                position: 'absolute',
                left: props.x,
                top: props.y,
                width: props.w,
                height: props.h,
                borderRadius: props.round ? props.w : undefined,
                fontSize: props.fontSize,
            }}
        >
            {props.children}
        </div>
    );
}

/** Clicks an element of the widget once after mount - opens the popups of the lock and the shutter */
function ClickOnMount(props: { selector: string; children: React.ReactNode }): React.JSX.Element {
    const ref = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const timer = setTimeout(() => ref.current?.querySelector<HTMLElement>(props.selector)?.click(), 150);
        return () => clearTimeout(timer);
    }, [props.selector]);
    return (
        <div
            ref={ref}
            style={{ width: '100%', height: '100%', position: 'relative' }}
        >
            {props.children}
        </div>
    );
}

// ------------------------------------------------------------------------------------------------ widgets

const LAMP = { iconName: IMG.bulbOff, iconOn: IMG.bulbOn };
const THERMOMETER = { iconName: IMG.heating };

function Button(props: { data?: Record<string, any>; values?: Values; style?: Record<string, any> }): React.JSX.Element {
    return (
        <W
            type={HqButton}
            style={props.style || ROUND}
            values={props.values}
            data={{ oid: 'lamp', ...LAMP, ...props.data }}
        />
    );
}

function Dimmer(props: { value: number; data?: Record<string, any> }): React.JSX.Element {
    return (
        <W
            type={HqDimmer}
            style={ROUND}
            values={states({ dimmer: props.value })}
            data={{ oid: 'dimmer', ...LAMP, ...props.data }}
        />
    );
}

function InTemp(props: { set?: number; data?: Record<string, any> }): React.JSX.Element {
    return (
        <W
            type={HqInTemp}
            style={ROUND}
            values={states({ set: props.set ?? 21.5, actual: 22.3, humidity: 47, valve: 65 })}
            data={{
                oid: 'set',
                'oid-actual': 'actual',
                'oid-humidity': 'humidity',
                'oid-drive': 'valve',
                digits: 1,
                ...THERMOMETER,
                ...props.data,
            }}
        />
    );
}

function OutTemp(props: { actual: number; humidity: number; data?: Record<string, any> }): React.JSX.Element {
    return (
        <W
            type={HqOutTemp}
            style={ROUND}
            values={states({ actual: props.actual, humidity: props.humidity })}
            data={{ 'oid-actual': 'actual', 'oid-humidity': 'humidity', digits: 1, ...THERMOMETER, ...props.data }}
        />
    );
}

/** `handles` are the values of the handle sensors of the sashes: 0 closed, 1 tilted, 2 opened */
function Shutter(props: {
    position: number;
    types: string[];
    handles?: number[];
    data?: Record<string, any>;
}): React.JSX.Element {
    const data: Record<string, any> = {
        oid: 'blind',
        slide_count: String(props.types.length),
        hide_timeout: 600000,
        ...props.data,
    };
    const values: Record<string, any> = { blind: props.position };
    props.types.forEach((type, i) => {
        data[`slide_type${i + 1}`] = type;
        if (props.handles && props.handles[i] !== undefined) {
            data[`oid-slide-handle${i + 1}`] = `handle${i + 1}`;
            values[`handle${i + 1}`] = props.handles[i];
        }
    });
    return (
        <W
            type={HqShutter}
            values={states(values)}
            data={data}
        />
    );
}

function Door(props: { open: boolean; data?: Record<string, any> }): React.JSX.Element {
    return (
        <W
            type={HqDoor}
            values={states({ door: props.open })}
            data={{ oid: 'door', ...props.data }}
        />
    );
}

function Lock(props: { unlocked?: boolean; data?: Record<string, any> }): React.JSX.Element {
    return (
        <W
            type={HqLock}
            values={states({ lock: !!props.unlocked })}
            data={{ oid: 'lock', showTimeout: 600000, ...props.data }}
        />
    );
}

function Checkbox(props: { on: boolean; data?: Record<string, any> }): React.JSX.Element {
    return (
        <W
            type={HqCheckbox}
            values={states({ check: props.on })}
            data={{ oid: 'check', ...props.data }}
        />
    );
}

function Circle(props: { value: number; data?: Record<string, any> }): React.JSX.Element {
    return (
        <W
            type={HqCircle}
            values={states({ knob: props.value })}
            data={{ oid: 'knob', unit: '%', ...props.data }}
        />
    );
}

function Odometer(props: { value: number; data?: Record<string, any> }): React.JSX.Element {
    return (
        <W
            type={HqOdometer}
            values={states({ counter: props.value })}
            data={{ oid: 'counter', ...props.data }}
        />
    );
}

// ------------------------------------------------------------------------------------------------- scenes

const ODOMETER_STYLES = ['car', 'default', 'digital', 'minimal', 'plaza', 'slot-machine', 'train-station'];
const SASH_TYPES = ['', 'left', 'right', 'top', 'bottom'];
const SWITCH_COLORS = ['orange', 'blue', 'green', 'grey'];

function Scenes(): React.JSX.Element {
    return (
        <>
            {/* The popups position themselves inside the window, so these come first */}
            <Shot name="lock">
                <Item
                    w={40}
                    h={40}
                    pad={[60, 60, 60, 60]}
                    caption="false"
                >
                    <Lock />
                </Item>
                <Item
                    w={40}
                    h={40}
                    pad={[60, 60, 60, 60]}
                    caption="true"
                >
                    <Lock unlocked />
                </Item>
                <Item
                    w={40}
                    h={40}
                    pad={[60, 60, 60, 60]}
                    caption="popup"
                >
                    <ClickOnMount selector=".hq-main">
                        <Lock data={{ 'oid-open': 'door-opener' }} />
                    </ClickOnMount>
                </Item>
            </Shot>

            <Shot name="shutter-popup">
                <Item
                    w={150}
                    h={110}
                    pad={[110, 30, 110, 30]}
                >
                    <ClickOnMount selector=".hq-rx">
                        <Shutter
                            position={30}
                            types={['left', 'right']}
                        />
                    </ClickOnMount>
                </Item>
            </Shot>

            <Shot name="overview">
                <div style={{ position: 'relative', width: 750, height: 350 }}>
                    {/* round widgets */}
                    <At
                        x={24}
                        y={30}
                        w={64}
                        h={64}
                        round
                    >
                        <Button values={states({ lamp: false })} />
                    </At>
                    <At
                        x={124}
                        y={30}
                        w={64}
                        h={64}
                        round
                    >
                        <Button values={states({ lamp: true })} />
                    </At>
                    <At
                        x={240}
                        y={30}
                        w={64}
                        h={64}
                        round
                    >
                        <Dimmer
                            value={42}
                            data={{ alwaysShow: true, showValue: false }}
                        />
                    </At>
                    <At
                        x={410}
                        y={30}
                        w={64}
                        h={64}
                        round
                    >
                        <InTemp />
                    </At>
                    <At
                        x={570}
                        y={30}
                        w={64}
                        h={64}
                        round
                    >
                        <OutTemp
                            actual={-3.4}
                            humidity={86}
                        />
                    </At>
                    <At
                        x={662}
                        y={30}
                        w={64}
                        h={64}
                        round
                    >
                        <Button
                            values={states({ lamp: true })}
                            data={{ styleActive: 'hq-button-nice-yellow' }}
                        />
                    </At>
                    {/* window, door, lock, knob, switch */}
                    <At
                        x={24}
                        y={140}
                        w={150}
                        h={110}
                    >
                        <Shutter
                            position={30}
                            types={['left', '', 'right']}
                            handles={[1, 0, 2]}
                        />
                    </At>
                    <At
                        x={204}
                        y={140}
                        w={55}
                        h={110}
                    >
                        <Door open />
                    </At>
                    <At
                        x={290}
                        y={175}
                        w={40}
                        h={40}
                    >
                        <Lock />
                    </At>
                    <At
                        x={360}
                        y={145}
                        w={100}
                        h={100}
                    >
                        <Circle value={20} />
                    </At>
                    <At
                        x={500}
                        y={162}
                        w={216}
                        h={68}
                    >
                        <Checkbox on />
                    </At>
                    {/* counters */}
                    <At
                        x={24}
                        y={286}
                        w={200}
                        h={42}
                        fontSize={24}
                    >
                        <Odometer
                            value={1038.4}
                            data={{ format: '(.ddd),d', style: 'car' }}
                        />
                    </At>
                    <At
                        x={250}
                        y={286}
                        w={200}
                        h={42}
                        fontSize={24}
                    >
                        <Odometer
                            value={73.25}
                            data={{ format: '(ddd),dd', style: 'digital' }}
                        />
                    </At>
                    <At
                        x={554}
                        y={290}
                        w={108}
                        h={34}
                    >
                        <Checkbox
                            on={false}
                            data={{ checkboxSize: 'small' }}
                        />
                    </At>
                </div>
            </Shot>

            {/* ------------------------------------------------------------------ On/Off */}
            <Shot name="button">
                <Item
                    w={64}
                    h={64}
                    round
                    caption="false"
                >
                    <Button values={states({ lamp: false })} />
                </Item>
                <Item
                    w={64}
                    h={64}
                    round
                    caption="true"
                >
                    <Button values={states({ lamp: true })} />
                </Item>
                <Item
                    w={64}
                    h={64}
                    round
                    pad={[16, 150, 16, 100]}
                    caption="descriptionLeft, infoRight, hoursLastAction"
                >
                    <Button
                        values={states({ lamp: true })}
                        data={{
                            descriptionLeft: 'Kitchen',
                            infoRight: 'Ceiling',
                            hoursLastAction: '24',
                            timeAsInterval: true,
                        }}
                    />
                </Item>
                <Item
                    w={140}
                    h={56}
                    caption="caption"
                >
                    <Button
                        values={states({ lamp: true })}
                        style={{ 'border-radius': '10px' }}
                        data={{ caption: 'Fan', btIconWidth: 40 }}
                    />
                </Item>
            </Shot>

            <Shot name="button-indicators">
                <Item
                    w={64}
                    h={64}
                    round
                    caption="oid-working"
                >
                    <Button
                        values={{ ...states({ lamp: true }), 'working.val': true }}
                        data={{ 'oid-working': 'working' }}
                    />
                </Item>
                <Item
                    w={64}
                    h={64}
                    round
                    caption="oid-battery"
                >
                    <Button
                        values={{ ...states({ lamp: false }), 'battery.val': true }}
                        data={{ 'oid-battery': 'battery' }}
                    />
                </Item>
                <Item
                    w={64}
                    h={64}
                    round
                    caption="oid-signal"
                >
                    <Button
                        values={{ ...states({ lamp: false }), 'signal.val': '-67' }}
                        data={{ 'oid-signal': 'signal' }}
                    />
                </Item>
                <Item
                    w={64}
                    h={64}
                    round
                    caption="(no value)"
                >
                    <Button values={{}} />
                </Item>
            </Shot>

            <Shot
                name="button-skins"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 210px)', gap: 4 }}
            >
                {SKINS.map(skin => (
                    <Item
                        key={skin}
                        w={56}
                        h={56}
                        round
                        pad={[10, 10, 4, 10]}
                        caption={skin}
                    >
                        <Button
                            values={states({ lamp: false })}
                            data={{ styleNormal: skin }}
                        />
                    </Item>
                ))}
            </Shot>

            {/* ------------------------------------------------------------------ Dimmer */}
            <Shot name="dimmer">
                <Item
                    w={64}
                    h={64}
                    round
                    pad={[20, 80, 20, 20]}
                    caption="0"
                >
                    <Dimmer value={0} />
                </Item>
                <Item
                    w={64}
                    h={64}
                    round
                    pad={[20, 80, 20, 20]}
                    caption="42"
                >
                    <Dimmer value={42} />
                </Item>
                <Item
                    w={64}
                    h={64}
                    round
                    pad={[20, 80, 20, 20]}
                    caption="42, alwaysShow"
                >
                    <Dimmer
                        value={42}
                        data={{ alwaysShow: true }}
                    />
                </Item>
            </Shot>

            {/* ------------------------------------------------------------------ Inner temperature */}
            <Shot name="intemp">
                <Item
                    w={64}
                    h={64}
                    round
                    pad={[20, 90, 20, 90]}
                >
                    <InTemp data={{ descriptionLeft: 'Bath' }} />
                </Item>
                <Item
                    w={64}
                    h={64}
                    round
                    pad={[20, 90, 20, 20]}
                    caption="alwaysShow"
                >
                    <InTemp data={{ alwaysShow: true }} />
                </Item>
            </Shot>

            <Shot name="intemp-colors">
                {[8, 13, 18, 23, 28].map(temp => (
                    <Item
                        key={temp}
                        w={64}
                        h={64}
                        round
                        pad={[20, 70, 20, 20]}
                    >
                        <InTemp
                            set={temp}
                            data={{ alwaysShow: true, digits: 0, 'oid-actual': '', 'oid-humidity': '', 'oid-drive': '' }}
                        />
                    </Item>
                ))}
            </Shot>

            {/* ------------------------------------------------------------------ Outdoor temperature */}
            <Shot name="outtemp">
                <Item
                    w={64}
                    h={64}
                    round
                    pad={[20, 20, 20, 100]}
                >
                    <OutTemp
                        actual={22.3}
                        humidity={47}
                        data={{ descriptionLeft: 'Garden' }}
                    />
                </Item>
                <Item
                    w={64}
                    h={64}
                    round
                    pad={[20, 20, 20, 20]}
                >
                    <OutTemp
                        actual={-4.5}
                        humidity={88}
                    />
                </Item>
            </Shot>

            {/* ------------------------------------------------------------------ Window and shutter */}
            <Shot name="shutter">
                <Item
                    w={70}
                    h={110}
                    pad={[16, 16, 16, 16]}
                >
                    <Shutter
                        position={0}
                        types={['left']}
                        handles={[0]}
                    />
                </Item>
                <Item
                    w={150}
                    h={110}
                    pad={[16, 70, 16, 16]}
                >
                    <Shutter
                        position={30}
                        types={['left', 'right']}
                        handles={[1, 2]}
                        data={{ show_value: true }}
                    />
                </Item>
                <Item
                    w={200}
                    h={110}
                    pad={[16, 16, 16, 110]}
                >
                    <Shutter
                        position={75}
                        types={['left', '', 'right']}
                        handles={[0, 0, 0]}
                        data={{ descriptionLeft: 'Living room' }}
                    />
                </Item>
            </Shot>

            <Shot
                name="shutter-sashes"
                style={{
                    display: 'grid',
                    gridTemplateColumns: '180px repeat(3, 110px)',
                    alignItems: 'center',
                    justifyItems: 'center',
                    gap: 8,
                }}
            >
                <span />
                {['0', '1', '2'].map(handle => (
                    <code
                        key={handle}
                        style={{ fontSize: 12, opacity: 0.7 }}
                    >
                        {`handle = ${handle}`}
                    </code>
                ))}
                {SASH_TYPES.map(type => (
                    <React.Fragment key={type || 'fixed'}>
                        <code style={{ fontSize: 12, opacity: 0.7, justifySelf: 'start' }}>
                            {`slide_type = "${type}"`}
                        </code>
                        {[0, 1, 2].map(handle => (
                            <Item
                                key={handle}
                                w={70}
                                h={90}
                                pad={[4, 4, 4, 4]}
                            >
                                <Shutter
                                    position={0}
                                    types={[type]}
                                    handles={[handle]}
                                />
                            </Item>
                        ))}
                    </React.Fragment>
                ))}
            </Shot>

            <Shot name="shutter-colors">
                {['', '#f4f4f4', '#8a5a33', '#3b4047'].map(color => (
                    <Item
                        key={color || 'default'}
                        w={120}
                        h={100}
                        caption={color || '(default)'}
                    >
                        <Shutter
                            position={20}
                            types={['left', 'right']}
                            handles={[0, 0]}
                            data={{ frameColor: color }}
                        />
                    </Item>
                ))}
            </Shot>

            {/* ------------------------------------------------------------------ Door */}
            <Shot name="door">
                <Item
                    w={50}
                    h={100}
                    caption="false"
                >
                    <Door open={false} />
                </Item>
                <Item
                    w={50}
                    h={100}
                    caption="true"
                >
                    <Door open />
                </Item>
                <Item
                    w={50}
                    h={100}
                    caption={'true\ndoor_type = right'}
                >
                    <Door
                        open
                        data={{ door_type: 'right' }}
                    />
                </Item>
                <Item
                    w={50}
                    h={100}
                    caption={'frameColor\nsheetColor'}
                >
                    <Door
                        open
                        data={{ frameColor: '#6d4c33', sheetColor: '#b07a4c', emptyColor: '#2e3a46' }}
                    />
                </Item>
                <Item
                    w={50}
                    h={100}
                    pad={[16, 16, 16, 100]}
                    caption="descriptionLeft"
                >
                    <Door
                        open={false}
                        data={{ descriptionLeft: 'Entrance' }}
                    />
                </Item>
            </Shot>

            {/* ------------------------------------------------------------------ Checkbox */}
            <Shot name="checkbox">
                <Item
                    w={216}
                    h={68}
                    caption="false"
                >
                    <Checkbox on={false} />
                </Item>
                <Item
                    w={216}
                    h={68}
                    caption="true"
                >
                    <Checkbox on />
                </Item>
                <Item
                    w={108}
                    h={34}
                    caption={'small\nfalse'}
                >
                    <Checkbox
                        on={false}
                        data={{ checkboxSize: 'small' }}
                    />
                </Item>
                <Item
                    w={108}
                    h={34}
                    caption={'small\ntrue'}
                >
                    <Checkbox
                        on
                        data={{ checkboxSize: 'small' }}
                    />
                </Item>
            </Shot>

            <Shot
                name="checkbox-colors"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)' }}
            >
                {SWITCH_COLORS.map(color => (
                    <Item
                        key={color}
                        w={216}
                        h={68}
                        caption={color}
                    >
                        <Checkbox
                            on
                            data={{ checkboxColorOn: color }}
                        />
                    </Item>
                ))}
            </Shot>

            {/* ------------------------------------------------------------------ Circle knob */}
            <Shot name="circle">
                <Item
                    w={100}
                    h={100}
                    caption="(default)"
                >
                    <Circle value={20} />
                </Item>
                <Item
                    w={100}
                    h={100}
                    caption={'angleArc = 270\nlinecap, thickness = 0.2'}
                >
                    <Circle
                        value={65}
                        data={{ angleArc: 270, linecap: true, thickness: 0.2 }}
                    />
                </Item>
                <Item
                    w={100}
                    h={100}
                    caption="cursor = 30"
                >
                    <Circle
                        value={40}
                        data={{ cursor: 30 }}
                    />
                </Item>
                <Item
                    w={100}
                    h={100}
                    caption={'anticlockwise\ncolor, bgcolor'}
                >
                    <Circle
                        value={30}
                        data={{ anticlockwise: true, color: '#ff9800', bgcolor: '#ffe7c2' }}
                    />
                </Item>
                <Item
                    w={100}
                    h={100}
                    caption={'angleArc = 180\nangleOffset = 270'}
                >
                    <Circle
                        value={75}
                        data={{ angleArc: 180, angleOffset: 270, thickness: 0.25, color: '#4caf50' }}
                    />
                </Item>
            </Shot>

            {/* ------------------------------------------------------------------ Odometer */}
            <Shot
                name="odometer"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: 8, justifyItems: 'center' }}
            >
                {ODOMETER_STYLES.map(style => (
                    <Item
                        key={style}
                        w={210}
                        h={42}
                        fontSize={24}
                        pad={[12, 16, 4, 16]}
                        caption={style}
                    >
                        <Odometer
                            value={12345.67}
                            data={{ style, format: '(.ddd),dd' }}
                        />
                    </Item>
                ))}
            </Shot>

            {/* ------------------------------------------------------------------ dark theme */}
            <Shot
                name="dark-theme"
                dark
            >
                <Item
                    w={64}
                    h={64}
                    round
                    pad={[24, 130, 24, 100]}
                >
                    <Button
                        values={states({ lamp: true })}
                        data={{
                            descriptionLeft: 'Kitchen',
                            infoRight: 'Ceiling',
                            hoursLastAction: '24',
                            timeAsInterval: true,
                        }}
                    />
                </Item>
                <Item
                    w={64}
                    h={64}
                    round
                    pad={[24, 90, 24, 24]}
                >
                    <InTemp data={{ alwaysShow: true }} />
                </Item>
                <Item
                    w={150}
                    h={110}
                    pad={[24, 70, 24, 24]}
                >
                    <Shutter
                        position={30}
                        types={['left', 'right']}
                        handles={[1, 0]}
                        data={{ show_value: true }}
                    />
                </Item>
                <Item
                    w={100}
                    h={100}
                    pad={[24, 24, 24, 24]}
                >
                    <Circle value={20} />
                </Item>
            </Shot>
        </>
    );
}

function App(): React.JSX.Element {
    React.useEffect(() => {
        // Ready once every image is there and the popups had time to open
        const pending = Array.from(document.images)
            .filter(img => !img.complete)
            .map(
                img =>
                    new Promise(resolve => {
                        img.addEventListener('load', resolve, { once: true });
                        img.addEventListener('error', resolve, { once: true });
                    }),
            );
        void Promise.all(pending).then(() =>
            setTimeout(() => {
                (window as any).__shotsReady = true;
            }, 1500),
        );
    }, []);

    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                gap: 24,
                padding: 24,
                width: 1800,
            }}
        >
            <Scenes />
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<App />);
