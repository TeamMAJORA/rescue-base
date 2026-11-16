import { useEffect, useRef } from "react";

// Replaces <input type="number">: same props (min, max, step, value, onChange…), but
// - forgiving: "1,500", "₱1,500.50", "4.5 kg" or "10.31, 123.89" are reduced to the number ("1500", "1500.50", "4.5", "10.31")
// - no scroll-wheel changes, no "e", and the right phone keypad (numbers, with a dot when decimals are allowed)
// - min/max/whole-number rules still apply and show under the field (utils/formValidation.js)
export function cleanNumberText(raw, { allowNegative = false } = {}) {
    const text = String(raw ?? "");
    if (allowNegative && text.trim() === "-") return "-";
    const match = [...text.matchAll(/-?(?:\d[\d,]*)?(?:\.\d*)?/g)].map((found) => found[0]).find((found) => /\d|\./.test(found));
    if (!match) return "";
    const cleaned = match.replace(/,/g, "");
    return allowNegative ? cleaned : cleaned.replace("-", "");
}

function rangeMessage(value, { min, max, wholeNumber }) {
    if (value === "" || value === "-") return "";
    const number = Number(value);
    if (Number.isNaN(number)) return "Enter a number.";
    if (min !== undefined && min !== "" && number < Number(min)) return `Enter ${min} or more.`;
    if (max !== undefined && max !== "" && number > Number(max)) return `Enter ${max} or less.`;
    if (wholeNumber && !Number.isInteger(number)) return "Enter a whole number.";
    return "";
}

export default function NumberInput({ min, max, step, value, onChange, ...rest }) {
    const inputRef = useRef(null);
    const wholeNumber = step === undefined || String(step) === "1";
    const allowNegative = min !== undefined && Number(min) < 0;

    useEffect(() => {
        inputRef.current?.setCustomValidity(rangeMessage(String(value ?? ""), { min, max, wholeNumber }));
    }, [value, min, max, wholeNumber]);

    function handleChange(event) {
        event.target.value = cleanNumberText(event.target.value, { allowNegative });
        onChange?.(event);
    }

    return (
        <input
            ref={inputRef}
            type="text"
            inputMode={wholeNumber && !allowNegative ? "numeric" : "decimal"}
            autoComplete="off"
            value={value ?? ""}
            onChange={handleChange}
            {...rest}
        />
    );
}
