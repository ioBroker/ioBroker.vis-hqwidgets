/*
 * Development page for the hqWidgets.
 *
 * It renders the widgets against a stub of the vis-2 `VisRxWidget` base class, so the whole set can be looked at
 * and clicked without a running ioBroker. The state values are editable on the left, every widget reacts to them
 * live, and clicking a widget writes back into the same values.
 *
 * Not part of the widget set - excluded from lint and never built into `widgets/`.
 * Start with `npm run preview` in the root.
 */
import React, { useMemo, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';

// ---------------------------------------------------------------------------------------------- fake states

type Values = Record<string, any>;

const INITIAL_VALUES: Values = {
    'test.0.switch.val': false,
    'test.0.switch.ack': true,
    'test.0.switch.lc': Date.now() - 1000 * 60 * 17,
    'test.0.dimmer.val': 42,
    'test.0.dimmer.ack': true,
    'test.0.dimmer.lc': Date.now() - 1000 * 30,
    'test.0.setTemp.val': 21.5,
    'test.0.setTemp.ack': true,
    'test.0.actTemp.val': 22.3,
    'test.0.actTemp.ack': true,
    'test.0.humidity.val': 47,
    'test.0.valve.val': 65,
    'test.0.blind.val': 30,
    'test.0.blind.ack': true,
    'test.0.sensor1.val': 0,
    'test.0.handle1.val': 0,
    'test.0.sensor2.val': 0,
    'test.0.handle2.val': 0,
    'test.0.door.val': false,
    'test.0.lock.val': false,
    'test.0.check.val': true,
    'test.0.knob.val': 20,
    'test.0.counter.val': 1038,
    'test.0.battery.val': false,
    'test.0.working.val': false,
};

/*
 * The real widgets point at `img/bulb_off.png` of vis-2 and at the images this package ships in
 * `widgets/hqwidgets/img/`. Neither is reachable from this standalone page, so the preview uses its own inline
 * icons - they only have to show that the icon slot works.
 */
const svg = (body: string): string =>
    `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${body}</svg>`)}`;

/*
 * The lamp: a slim globe narrowing into the neck, the screw base below it, and the rays of the lit lamp around
 * the globe. Both states share the same outline, so the bulb does not change its size when it switches.
 */
const BULB =
    '<path d="M19.5 29C19.5 26 15 24 15 18.5a9 9 0 0 1 18 0C33 24 28.5 26 28.5 29Z"/>' +
    '<rect x="19.5" y="30.5" width="9" height="6" rx="1.5"/>' +
    '<rect x="21.5" y="37.5" width="5" height="2.5" rx="1.2"/>';
/** Reflection inside the globe and the thread of the base - lines only */
const BULB_LINES = '<path d="M19 18.5a5 5 0 0 1 5-5M19.5 33.5h9" fill="none"/>';
/** Seven rays around the globe; the two lower ones are shorter */
const BULB_RAYS =
    '<path d="M24 5.5v-4M33.2 9.3l2.8-2.8M14.8 9.3l-2.8-2.8M37 18.5h4M11 18.5H7M33.2 27.7l2.1 2.1M14.8 27.7l-2.1 2.1" fill="none"/>';

const ICONS = {
    bulbOff: svg(
        `<g fill="#f5f5f5" stroke="#888" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${BULB}${BULB_LINES}</g>`,
    ),
    bulbOn: svg(
        `<g fill="#fff8d0" stroke="#c79a00" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${BULB}${BULB_LINES}</g>` +
            `<g stroke="#c79a00" stroke-width="2.2" stroke-linecap="round">${BULB_RAYS}</g>`,
    ),
    // A real thermometer: a wide tube that ends in the bulb, with the mercury column inside
    heating: svg(
        '<path d="M19 29V10a5 5 0 0 1 10 0v19a9 9 0 1 1-10 0Z" fill="rgba(255,255,255,0.35)" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' +
            '<rect x="22" y="15" width="4" height="18" rx="2" fill="#fff"/>' +
            '<circle cx="24" cy="36.5" r="5.5" fill="#fff"/>',
    ),
    lockClosed: svg(
        '<g fill="#c8a24a" stroke="#8a6d20" stroke-width="2"><path d="M16 22v-6a8 8 0 0 1 16 0v6" fill="none"/><rect x="12" y="22" width="24" height="20" rx="3"/></g>',
    ),
    lockOpen: svg(
        '<g fill="#c8a24a" stroke="#8a6d20" stroke-width="2"><path d="M16 22v-6a8 8 0 0 1 16 0" fill="none"/><rect x="12" y="22" width="24" height="20" rx="3"/></g>',
    ),
    door: svg(
        '<g fill="#7fb2e5" stroke="#3b6ea5" stroke-width="2"><rect x="12" y="8" width="24" height="34" rx="2"/><circle cx="30" cy="26" r="2.5" fill="#3b6ea5"/></g>',
    ),
};

// ---------------------------------------------------------------------------------- stub of the vis-2 runtime

const RUNTIME_WORDS: Record<string, string> = {
    'just now': 'just now',
    'for %s min.': 'for %s min.',
    forHours: 'for %s hrs. and %s min.',
    for1Hour: 'for %s hr. and %s min.',
    'for2-4Hours': 'for %s hrs. and %s min.',
    yesterday: 'yesterday',
    'for %s hours': 'for %s hours',
    opened: 'opened',
    closed: 'closed',
    open: 'Open',
    close: 'Close',
    open_lock: 'Unlock',
    close_lock: 'Lock',
    open_door: 'Open door',
    'Low battery on sash sensor': 'Low battery on sash sensor',
    'Low battery on handle sensor': 'Low battery on handle sensor',
};

class VisRxWidgetStub extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
        this.state = {
            rxData: props.rxData || {},
            rxStyle: props.rxStyle || {},
            values: props.values || {},
            editMode: !!props.editMode,
            visible: true,
        };
    }

    /** The values live in the page, not in the widget - this is what feeds them in on every change */
    static getDerivedStateFromProps(props: any, state: any): any {
        if (
            props.values !== state.values ||
            props.rxData !== state.rxData ||
            props.rxStyle !== state.rxStyle ||
            !!props.editMode !== state.editMode
        ) {
            return {
                values: props.values,
                rxData: props.rxData,
                rxStyle: props.rxStyle || {},
                editMode: !!props.editMode,
            };
        }
        return null;
    }

    static getI18nPrefix(): string {
        return '';
    }

    static t(key: string, ...args: string[]): string {
        let word = RUNTIME_WORDS[key] || key;
        for (const arg of args) {
            word = word.replace('%s', arg);
        }
        return word;
    }

    componentDidMount(): void {}

    componentWillUnmount(): void {}

    componentDidUpdate(_prevProps: any, _prevState: any): void {}

    renderWidgetBody(_props: any): any {
        return null;
    }

    render(): React.ReactNode {
        return (this as any).renderWidgetBody({ widget: {}, style: {}, className: '', overlayClassNames: [] });
    }
}

(window as any).visRxWidget = VisRxWidgetStub;

const ERROR_STYLE =
    'margin:24px;padding:16px;background:#fde7e9;color:#8b1a1a;border-radius:8px;white-space:pre-wrap;font:13px/1.5 monospace';

/** Shows a message in the page instead of leaving a white screen behind */
function fail(what: string, error: unknown): never {
    const details = error instanceof Error ? [error.message, error.stack || ''].join('\n\n') : String(error);
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = '';
        const pre = document.createElement('pre');
        pre.style.cssText = ERROR_STYLE;
        pre.textContent = [what, details].join('\n\n');
        root.appendChild(pre);
    }
    console.error(what, error);
    throw error;
}

// The widgets extend `window.visRxWidget`, so they may only be imported after the stub above is in place
const widgets = await Promise.all([
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
]).catch(e => fail('The widgets could not be loaded.', e));

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
] = widgets;

/** Fills in the defaults of `getWidgetInfo()`, the way the vis editor does when a widget is created */
function withDefaults(Widget: any, data: Record<string, any>): Record<string, any> {
    const info = Widget.getWidgetInfo();
    const result: Record<string, any> = {};
    for (const group of info.visAttrs) {
        for (const field of group.fields) {
            if (field.default !== undefined) {
                result[field.name] = field.default;
            }
        }
    }
    return { ...result, ...data };
}

// ------------------------------------------------------------------------------------------------- controls

const panel: CSSProperties = {
    background: 'var(--panel)',
    border: '1px solid var(--line)',
    borderRadius: 8,
    padding: 12,
};

function Row(props: { label: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <label style={{ display: 'grid', gridTemplateColumns: '110px 1fr 44px', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>{props.label}</span>
            {props.children}
        </label>
    );
}

function Slider(props: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
}): React.JSX.Element {
    return (
        <Row label={props.label}>
            <input
                type="range"
                min={props.min}
                max={props.max}
                step={props.step || 1}
                value={props.value}
                onChange={e => props.onChange(parseFloat(e.target.value))}
            />
            <span style={{ fontSize: 12, textAlign: 'right' }}>{props.value}</span>
        </Row>
    );
}

function Toggle(props: { label: string; value: boolean; onChange: (value: boolean) => void }): React.JSX.Element {
    return (
        <Row label={props.label}>
            <input
                type="checkbox"
                style={{ justifySelf: 'start' }}
                checked={!!props.value}
                onChange={e => props.onChange(e.target.checked)}
            />
            <span />
        </Row>
    );
}

function Choice(props: {
    label: string;
    value: any;
    options: { value: any; label: string }[];
    onChange: (value: any) => void;
}): React.JSX.Element {
    return (
        <Row label={props.label}>
            <select
                value={String(props.value)}
                onChange={e => props.onChange(props.options.find(o => String(o.value) === e.target.value)?.value)}
            >
                {props.options.map(o => (
                    <option
                        key={String(o.value)}
                        value={String(o.value)}
                    >
                        {o.label}
                    </option>
                ))}
            </select>
            <span />
        </Row>
    );
}

/**
 * The popup of the lock only exists after a click. This opens it once on mount, so the three buttons can be
 * looked at without interacting - `showTimeout` is set high enough that it stays open.
 */
function LockWithOpenPopup(props: { children: React.ReactNode }): React.JSX.Element {
    const ref = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const timer = setTimeout(() => ref.current?.querySelector<HTMLElement>('.hq-main')?.click(), 150);
        return () => clearTimeout(timer);
    }, []);
    return (
        <div
            ref={ref}
            style={{ width: 40, height: 40, position: 'relative' }}
        >
            {props.children}
        </div>
    );
}

function Colour(props: { label: string; value: string; onChange: (value: string) => void }): React.JSX.Element {
    return (
        <Row label={props.label}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                    type="color"
                    value={props.value || '#8e8e90'}
                    onChange={e => props.onChange(e.target.value)}
                />
                <button
                    type="button"
                    onClick={() => props.onChange('')}
                    style={{ fontSize: 11 }}
                >
                    default
                </button>
            </span>
            <span />
        </Row>
    );
}

/** One widget with its id underneath */
function Card(props: {
    title: string;
    tpl: string;
    width: number;
    height: number;
    round?: boolean;
    children: React.ReactNode;
}): React.JSX.Element {
    return (
        <div style={{ ...panel, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{props.title}</div>
            <div
                style={{
                    // room for the description pills and the arc, which reach outside of the widget
                    padding: '20px 70px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 140,
                }}
            >
                <div
                    style={{
                        width: props.width,
                        height: props.height,
                        position: 'relative',
                        borderRadius: props.round ? props.width : undefined,
                    }}
                >
                    {props.children}
                </div>
            </div>
            <code style={{ fontSize: 11, opacity: 0.55 }}>{props.tpl}</code>
        </div>
    );
}

// ------------------------------------------------------------------------------------------------------ app

const HANDLE_OPTIONS = [
    { value: 0, label: '0 - closed' },
    { value: 1, label: '1 - tilted' },
    { value: 2, label: '2 - opened' },
];

const SASH_TYPES = ['', 'left', 'right', 'top', 'bottom'];
const DOOR_TYPES = ['', 'left', 'right'];

function App(): React.JSX.Element {
    const [values, setValues] = useState<Values>(INITIAL_VALUES);
    const [dark, setDark] = useState(false);
    const [editMode, setEditMode] = useState(false);
    // off by default, like the widget itself - the arc only appears while the pointer is over the widget
    const [alwaysShowArc, setAlwaysShowArc] = useState(false);
    const [sashCount, setSashCount] = useState('2');
    const [windowFrameColor, setWindowFrameColor] = useState('');
    const [doorFrameColor, setDoorFrameColor] = useState('');
    const [doorSheetColor, setDoorSheetColor] = useState('');

    const set = (id: string, value: any): void =>
        setValues(old => ({
            ...old,
            [`${id}.val`]: value,
            [`${id}.ack`]: old[`${id}.ack`] === undefined ? undefined : true,
            [`${id}.lc`]: Date.now(),
        }));

    // what the widgets call - like vis-2 it writes with ack=false, which makes the "working" marker appear
    const context = useMemo(
        () => ({
            setValue: (id: string, value: any): void =>
                setValues(old => ({
                    ...old,
                    [`${id}.val`]: value,
                    [`${id}.ack`]: false,
                    [`${id}.lc`]: Date.now(),
                })),
            socket: {},
            // vis-2 passes the theme through the context - that is what `getRootClass()` reads
            themeType: dark ? 'dark' : 'light',
        }),
        [dark],
    );

    const common = { context, values, editMode, view: 'view', id: 'w1', refParent: { current: null } };
    const round = { 'border-radius': '64px' };

    const val = (id: string): any => values[`${id}.val`];

    return (
        <div
            style={
                {
                    '--panel': dark ? '#2b3038' : '#ffffff',
                    '--line': dark ? '#3d434d' : '#e0e0e0',
                    background: dark ? '#22262e' : '#f0f0f0',
                    color: dark ? '#dfe3e8' : '#222',
                    minHeight: '100vh',
                    display: 'grid',
                    gridTemplateColumns: '300px 1fr',
                    gap: 20,
                    padding: 20,
                    boxSizing: 'border-box',
                    fontFamily: 'system-ui, sans-serif',
                } as CSSProperties
            }
        >
            {/* ------------------------------------------------------------------ controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignSelf: 'start', position: 'sticky', top: 20 }}>
                <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <b style={{ fontSize: 13 }}>Page</b>
                    <Toggle
                        label="Dark theme"
                        value={dark}
                        onChange={setDark}
                    />
                    <Toggle
                        label="Edit mode"
                        value={editMode}
                        onChange={setEditMode}
                    />
                    <Toggle
                        label="Arc always on"
                        value={alwaysShowArc}
                        onChange={setAlwaysShowArc}
                    />
                </div>

                <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <b style={{ fontSize: 13 }}>States</b>
                    <Toggle
                        label="switch"
                        value={val('test.0.switch')}
                        onChange={v => set('test.0.switch', v)}
                    />
                    <Slider
                        label="dimmer"
                        min={0}
                        max={100}
                        value={val('test.0.dimmer')}
                        onChange={v => set('test.0.dimmer', v)}
                    />
                    <Slider
                        label="setTemp"
                        min={6}
                        max={30}
                        step={0.5}
                        value={val('test.0.setTemp')}
                        onChange={v => set('test.0.setTemp', v)}
                    />
                    <Slider
                        label="actTemp"
                        min={-20}
                        max={40}
                        step={0.1}
                        value={val('test.0.actTemp')}
                        onChange={v => set('test.0.actTemp', v)}
                    />
                    <Slider
                        label="humidity"
                        min={0}
                        max={100}
                        value={val('test.0.humidity')}
                        onChange={v => set('test.0.humidity', v)}
                    />
                    <Slider
                        label="valve"
                        min={0}
                        max={100}
                        value={val('test.0.valve')}
                        onChange={v => set('test.0.valve', v)}
                    />
                    <Slider
                        label="knob"
                        min={0}
                        max={100}
                        value={val('test.0.knob')}
                        onChange={v => set('test.0.knob', v)}
                    />
                    <Slider
                        label="counter"
                        min={0}
                        max={9999}
                        value={val('test.0.counter')}
                        onChange={v => set('test.0.counter', v)}
                    />
                    <Toggle
                        label="door"
                        value={val('test.0.door')}
                        onChange={v => set('test.0.door', v)}
                    />
                    <Toggle
                        label="lock"
                        value={val('test.0.lock')}
                        onChange={v => set('test.0.lock', v)}
                    />
                    <Toggle
                        label="check"
                        value={val('test.0.check')}
                        onChange={v => set('test.0.check', v)}
                    />
                    <Toggle
                        label="battery low"
                        value={val('test.0.battery')}
                        onChange={v => set('test.0.battery', v)}
                    />
                    <Toggle
                        label="working"
                        value={val('test.0.working')}
                        onChange={v => set('test.0.working', v)}
                    />
                </div>

                <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <b style={{ fontSize: 13 }}>Window</b>
                    <Slider
                        label="blind"
                        min={0}
                        max={100}
                        value={val('test.0.blind')}
                        onChange={v => set('test.0.blind', v)}
                    />
                    <Choice
                        label="sashes"
                        value={sashCount}
                        options={['1', '2', '3', '4'].map(v => ({ value: v, label: v }))}
                        onChange={setSashCount}
                    />
                    <Choice
                        label="handle 1"
                        value={val('test.0.handle1')}
                        options={HANDLE_OPTIONS}
                        onChange={v => set('test.0.handle1', v)}
                    />
                    <Choice
                        label="handle 2"
                        value={val('test.0.handle2')}
                        options={HANDLE_OPTIONS}
                        onChange={v => set('test.0.handle2', v)}
                    />
                </div>

                <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <b style={{ fontSize: 13 }}>Colours</b>
                    <Colour
                        label="window frame"
                        value={windowFrameColor}
                        onChange={setWindowFrameColor}
                    />
                    <Colour
                        label="door frame"
                        value={doorFrameColor}
                        onChange={setDoorFrameColor}
                    />
                    <Colour
                        label="door leaf"
                        value={doorSheetColor}
                        onChange={setDoorSheetColor}
                    />
                </div>
            </div>

            {/* ------------------------------------------------------------------ widgets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: 16,
                    }}
                >
                    <Card
                        title="On/Off"
                        tpl="tplHqButton"
                        width={64}
                        height={64}
                        round
                    >
                        <HqButton
                            {...common}
                            rxStyle={round}
                            rxData={withDefaults(HqButton, {
                                oid: 'test.0.switch',
                                'oid-battery': 'test.0.battery',
                                'oid-working': 'test.0.working',
                                iconName: ICONS.bulbOff,
                                iconOn: ICONS.bulbOn,
                                descriptionLeft: 'Kitchen',
                                hoursLastAction: '24',
                                timeAsInterval: true,
                            })}
                        />
                    </Card>

                    <Card
                        title="On/Off - push button"
                        tpl="tplHqButton"
                        width={64}
                        height={64}
                        round
                    >
                        <HqButton
                            {...common}
                            rxStyle={round}
                            rxData={withDefaults(HqButton, {
                                oid: 'test.0.switch',
                                pushButton: true,
                                iconName: ICONS.bulbOff,
                                iconOn: ICONS.bulbOn,
                                styleNormal: 'hq-button-push-green',
                                styleActive: 'hq-button-push-red',
                            })}
                        />
                    </Card>

                    <Card
                        title="Dimmer"
                        tpl="tplHqDimmer"
                        width={64}
                        height={64}
                        round
                    >
                        <HqDimmer
                            {...common}
                            rxStyle={round}
                            rxData={withDefaults(HqDimmer, {
                                oid: 'test.0.dimmer',
                                iconName: ICONS.bulbOff,
                                iconOn: ICONS.bulbOn,
                                alwaysShow: alwaysShowArc,
                            })}
                        />
                    </Card>

                    <Card
                        title="Inner temperature"
                        tpl="tplHqInTemp"
                        width={64}
                        height={64}
                        round
                    >
                        <HqInTemp
                            {...common}
                            rxStyle={round}
                            rxData={withDefaults(HqInTemp, {
                                oid: 'test.0.setTemp',
                                'oid-actual': 'test.0.actTemp',
                                'oid-humidity': 'test.0.humidity',
                                'oid-drive': 'test.0.valve',
                                iconName: ICONS.heating,
                                digits: 1,
                                alwaysShow: alwaysShowArc,
                            })}
                        />
                    </Card>

                    <Card
                        title="Outdoor temperature"
                        tpl="tplHqOutTemp"
                        width={64}
                        height={64}
                        round
                    >
                        <HqOutTemp
                            {...common}
                            rxStyle={round}
                            rxData={withDefaults(HqOutTemp, {
                                'oid-actual': 'test.0.actTemp',
                                'oid-humidity': 'test.0.humidity',
                                iconName: ICONS.heating,
                                digits: 1,
                            })}
                        />
                    </Card>

                    <Card
                        title="Circle knob"
                        tpl="tplHqCircle"
                        width={90}
                        height={90}
                    >
                        <HqCircle
                            {...common}
                            rxData={withDefaults(HqCircle, { oid: 'test.0.knob', unit: '%' })}
                        />
                    </Card>

                    <Card
                        title="Door"
                        tpl="tplHqDoor"
                        width={50}
                        height={100}
                    >
                        <HqDoor
                            {...common}
                            rxData={withDefaults(HqDoor, {
                                oid: 'test.0.door',
                                frameColor: doorFrameColor,
                                sheetColor: doorSheetColor,
                            })}
                        />
                    </Card>

                    <Card
                        title="Lock"
                        tpl="tplHqLock"
                        width={40}
                        height={40}
                    >
                        <HqLock
                            {...common}
                            rxData={withDefaults(HqLock, {
                                oid: 'test.0.lock',
                                closedIcon: ICONS.lockClosed,
                                openedIcon: ICONS.lockOpen,
                                closeIcon: ICONS.lockClosed,
                                openIcon: ICONS.lockOpen,
                                openDoorIcon: ICONS.door,
                                // long enough to look at the popup
                                showTimeout: 600000,
                            })}
                        />
                    </Card>

                    <Card
                        title="Checkbox - big"
                        tpl="tplHqCheckbox"
                        width={216}
                        height={68}
                    >
                        <HqCheckbox
                            {...common}
                            rxData={withDefaults(HqCheckbox, { oid: 'test.0.check' })}
                        />
                    </Card>

                    <Card
                        title="Checkbox - small"
                        tpl="tplHqCheckbox"
                        width={108}
                        height={34}
                    >
                        <HqCheckbox
                            {...common}
                            rxData={withDefaults(HqCheckbox, {
                                oid: 'test.0.check',
                                checkboxSize: 'small',
                            })}
                        />
                    </Card>

                    <Card
                        title="Odometer"
                        tpl="tplHqOdometer"
                        width={160}
                        height={42}
                    >
                        <div style={{ fontSize: 24 }}>
                            <HqOdometer
                                {...common}
                                rxData={withDefaults(HqOdometer, { oid: 'test.0.counter' })}
                            />
                        </div>
                    </Card>

                    <Card
                        title="Window and shutter"
                        tpl="tplHqShutter"
                        width={150}
                        height={110}
                    >
                        <HqShutter
                            {...common}
                            rxData={withDefaults(HqShutter, {
                                oid: 'test.0.blind',
                                slide_count: sashCount,
                                slide_type1: 'left',
                                slide_type2: 'right',
                                slide_type3: 'top',
                                slide_type4: 'bottom',
                                'oid-slide-handle1': 'test.0.handle1',
                                'oid-slide-handle2': 'test.0.handle2',
                                show_value: true,
                                frameColor: windowFrameColor,
                                // long enough to look at the popup
                                hide_timeout: 600000,
                            })}
                        />
                    </Card>
                </div>

                {/* ------------------------------------------------------------------ temperature ramp */}
                <div style={{ ...panel }}>
                    <b style={{ fontSize: 13 }}>Temperature colours</b>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, marginBottom: 12 }}>
                        The arc of the inner temperature over the whole range 6...30 °C - blue when cold, red
                        when warm.
                    </div>
                    <div style={{ display: 'flex', gap: 96, flexWrap: 'wrap' }}>
                        {[6, 12, 18, 24, 30].map(temp => (
                            <div
                                key={temp}
                                style={{ textAlign: 'center' }}
                            >
                                <div style={{ width: 64, height: 64, position: 'relative', borderRadius: 64 }}>
                                    <HqInTemp
                                        {...common}
                                        values={{ ...values, 'ramp.temp.val': temp, 'ramp.temp.ack': true }}
                                        rxStyle={round}
                                        rxData={withDefaults(HqInTemp, {
                                            oid: 'ramp.temp',
                                            iconName: ICONS.heating,
                                            alwaysShow: true,
                                            showValue: true,
                                        })}
                                    />
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 22 }}>{temp} °C</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ------------------------------------------------------------------ lock states */}
                <div style={{ ...panel }}>
                    <b style={{ fontSize: 13 }}>Lock states</b>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, marginBottom: 12 }}>
                        Locked, unlocked and the popup with its three buttons: lock, unlock and open the door.
                    </div>
                    <div style={{ display: 'flex', gap: 40, alignItems: 'center', minHeight: 190 }}>
                        {[
                            { label: 'locked', value: false, popup: false },
                            { label: 'unlocked', value: true, popup: false },
                            { label: 'popup', value: false, popup: true },
                        ].map(state => {
                            const lock = (
                                <HqLock
                                    {...common}
                                    values={{ ...values, 'matrix.lock.val': state.value }}
                                    rxData={withDefaults(HqLock, {
                                        oid: 'matrix.lock',
                                        'oid-open': 'matrix.doorOpen',
                                        closedIcon: ICONS.lockClosed,
                                        openedIcon: ICONS.lockOpen,
                                        closeIcon: ICONS.lockClosed,
                                        openIcon: ICONS.lockOpen,
                                        openDoorIcon: ICONS.door,
                                        showTimeout: 600000,
                                    })}
                                />
                            );
                            return (
                                <div
                                    key={state.label}
                                    style={{ width: 170, textAlign: 'center' }}
                                >
                                    <div
                                        style={{
                                            height: 160,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {state.popup ? (
                                            <LockWithOpenPopup>{lock}</LockWithOpenPopup>
                                        ) : (
                                            <div style={{ width: 40, height: 40, position: 'relative' }}>{lock}</div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 11, opacity: 0.7 }}>{state.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ------------------------------------------------------------------ door states */}
                <div style={{ ...panel }}>
                    <b style={{ fontSize: 13 }}>Door states</b>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, marginBottom: 12 }}>
                        Every door type, closed and opened. The gap and the handle change sides with the type.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(2, 1fr)', gap: 12 }}>
                        {DOOR_TYPES.map(type => (
                            <React.Fragment key={type || 'none'}>
                                <div style={{ fontSize: 12, alignSelf: 'center' }}>{type || "(empty = left)"}</div>
                                {[false, true].map(open => (
                                    <div key={String(open)}>
                                        <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>
                                            {open ? 'opened' : 'closed'}
                                        </div>
                                        <div style={{ width: 50, height: 100, position: 'relative' }}>
                                            <HqDoor
                                                {...common}
                                                values={{ ...values, 'matrix.door.val': open }}
                                                rxData={withDefaults(HqDoor, {
                                                    oid: 'matrix.door',
                                                    door_type: type,
                                                    frameColor: doorFrameColor,
                                                    sheetColor: doorSheetColor,
                                                })}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* ------------------------------------------------------------------ sash matrix */}
                <div style={{ ...panel }}>
                    <b style={{ fontSize: 13 }}>Sash states</b>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, marginBottom: 12 }}>
                        Every sash type against every handle value. The handle is silver when closed or opened and
                        yellow when tilted.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                        {SASH_TYPES.map(type => (
                            <React.Fragment key={type || 'none'}>
                                <div style={{ fontSize: 12, alignSelf: 'center' }}>{type || '(fixed)'}</div>
                                {HANDLE_OPTIONS.map(option => (
                                    <div key={option.value}>
                                        <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>
                                            {option.label}
                                        </div>
                                        <div style={{ width: 80, height: 90, position: 'relative' }}>
                                            <HqShutter
                                                {...common}
                                                values={{
                                                    ...values,
                                                    'matrix.handle.val': option.value,
                                                }}
                                                rxData={withDefaults(HqShutter, {
                                                    oid: 'test.0.blind',
                                                    slide_count: '1',
                                                    frameColor: windowFrameColor,
                                                    slide_type1: type,
                                                    'oid-slide-handle1': 'matrix.handle',
                                                    hide_timeout: 600000,
                                                })}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <div />
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** A widget that throws while rendering must not take the whole page with it */
class Boundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): { error: Error } {
        return { error };
    }

    render(): React.ReactNode {
        if (this.state.error) {
            return (
                <pre
                    style={{
                        margin: 24,
                        padding: 16,
                        background: '#fde7e9',
                        color: '#8b1a1a',
                        borderRadius: 8,
                        whiteSpace: 'pre-wrap',
                        font: '13px/1.5 monospace',
                    }}
                >
                    {[this.state.error.message, this.state.error.stack || ''].join('\n\n')}
                </pre>
            );
        }
        return this.props.children;
    }
}

createRoot(document.getElementById('root')!).render(
    <Boundary>
        <App />
    </Boundary>,
);
