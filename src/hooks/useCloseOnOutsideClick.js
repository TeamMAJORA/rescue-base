import { useEffect, useRef } from "react";

// Closes a small pop-up panel (calendar, time wheel) on a click outside its box or on Escape
export default function useCloseOnOutsideClick(isOpen, boxRef, close) {
    const closeRef = useRef(close);

    useEffect(() => {
        closeRef.current = close;
    });

    useEffect(() => {
        if (!isOpen) return undefined;

        function closeOnOutsideClick(event) {
            if (boxRef.current && !boxRef.current.contains(event.target)) closeRef.current();
        }
        function closeOnEscape(event) {
            if (event.key === "Escape") closeRef.current();
        }

        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [isOpen, boxRef]);
}
