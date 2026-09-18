import type React from 'react';

/**
 * Closes a popup when the user clicks anywhere else in the view.
 *
 * Listens in the capture phase on the window, so it also fires when the click lands on another widget that
 * stops the event itself. Returns the disposer - call it when the popup closes and on unmount.
 *
 * @param ref - the widget root; a pointer down inside it does not count as "outside"
 * @param onOutside - called on the first pointer down outside of the widget
 */
export function watchOutsideClick(ref: React.RefObject<HTMLElement | null>, onOutside: () => void): () => void {
    const handler = (e: PointerEvent): void => {
        const element = ref.current;
        if (element && e.target instanceof Node && !element.contains(e.target)) {
            onOutside();
        }
    };

    window.addEventListener('pointerdown', handler, true);
    return () => window.removeEventListener('pointerdown', handler, true);
}
