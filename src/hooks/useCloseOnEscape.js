import { useEffect, useRef } from "react";

// Windows that are open right now, newest last. Escape closes only the newest one,
// so a dialog opened on top of another window does not close both.
const openWindowCloseHandlers = [];

function closeNewestWindowOnEscape(event) {
    if (event.key !== "Escape" || openWindowCloseHandlers.length === 0) return;
    openWindowCloseHandlers[openWindowCloseHandlers.length - 1].current();
}

export default function useCloseOnEscape(isWindowOpen, closeWindow) {
    const closeWindowRef = useRef(closeWindow);

    useEffect(() => {
        closeWindowRef.current = closeWindow;
    });

    useEffect(() => {
        if (!isWindowOpen) return undefined;

        openWindowCloseHandlers.push(closeWindowRef);
        if (openWindowCloseHandlers.length === 1) document.addEventListener("keydown", closeNewestWindowOnEscape);

        return () => {
            openWindowCloseHandlers.splice(openWindowCloseHandlers.indexOf(closeWindowRef), 1);
            if (openWindowCloseHandlers.length === 0) document.removeEventListener("keydown", closeNewestWindowOnEscape);
        };
    }, [isWindowOpen]);
}
