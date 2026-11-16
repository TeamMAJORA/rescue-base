import { useEffect } from "react";

// A rule the browser can't express on its own ("use a different number", "passwords must match",
// "next due after date given"). `message` empty = valid; otherwise it shows under the field on submit or blur.
export function useCustomValidity(fieldRef, message) {
    useEffect(() => {
        fieldRef.current?.setCustomValidity(message || "");
    }, [fieldRef, message]);
}
