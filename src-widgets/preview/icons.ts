/*
 * The real widgets point at `img/bulb_off.png` of vis-2 and at the images this package ships in
 * `widgets/hqwidgets/img/`. Neither is reachable from a standalone page, so the preview uses its own inline
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

export const ICONS = {
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
