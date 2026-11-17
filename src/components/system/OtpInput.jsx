import { forwardRef, useImperativeHandle, useRef } from "react";

// Six one-digit boxes shown as "123 - 456". Typing moves forward, Backspace moves back,
// and pasting or autofill ("482 913", "482-913") fills every box. Calls onComplete with the full code.
const LENGTH = 6;

const OtpInput = forwardRef(function OtpInput({ value, onChange, onComplete, disabled, invalid, describedBy }, ref) {
    const boxes = useRef([]);
    const digits = Array.from({ length: LENGTH }, (_, index) => value[index] || "");

    useImperativeHandle(ref, () => ({ focus: () => boxes.current[Math.min(value.length, LENGTH - 1)]?.focus() }));

    function update(nextDigits, focusIndex) {
        const nextValue = nextDigits.join("").slice(0, LENGTH);
        onChange(nextValue);
        if (focusIndex !== undefined) boxes.current[Math.min(focusIndex, LENGTH - 1)]?.focus();
        if (nextValue.length === LENGTH && !nextDigits.includes("")) onComplete(nextValue);
    }

    // Spreads several digits from `start` (paste, autofill, fast typing)
    function fillFrom(start, text) {
        const incoming = text.replace(/\D/g, "").split("");
        if (!incoming.length) return;
        const next = [...digits];
        incoming.slice(0, LENGTH - start).forEach((digit, offset) => {
            next[start + offset] = digit;
        });
        update(next, start + incoming.length);
    }

    function handleChange(index, event) {
        const typed = event.target.value;
        if (typed.replace(/\D/g, "").length > 1) {
            fillFrom(index, typed);
            return;
        }
        const digit = typed.replace(/\D/g, "").slice(-1);
        if (!digit) return;
        const next = [...digits];
        next[index] = digit;
        update(next, index + 1);
    }

    function handleKeyDown(index, event) {
        if (event.key === "Backspace") {
            event.preventDefault();
            const next = [...digits];
            if (next[index]) {
                next[index] = "";
                update(next, index);
            } else if (index > 0) {
                next[index - 1] = "";
                update(next, index - 1);
            }
        } else if (event.key === "ArrowLeft" && index > 0) {
            boxes.current[index - 1]?.focus();
        } else if (event.key === "ArrowRight" && index < LENGTH - 1) {
            boxes.current[index + 1]?.focus();
        }
    }

    function handlePaste(index, event) {
        event.preventDefault();
        fillFrom(index, event.clipboardData.getData("text"));
    }

    return (
        <div className={`otp-input${invalid ? " is-invalid" : ""}`} role="group" aria-label="6-digit code">
            {digits.map((digit, index) => (
                <span key={index} className="otp-slot">
                    {index === LENGTH / 2 && <span className="otp-dash" aria-hidden="true">-</span>}
                    <input
                        ref={(element) => { boxes.current[index] = element; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={index === 0 ? LENGTH : 1}
                        value={digit}
                        disabled={disabled}
                        aria-label={`Digit ${index + 1} of ${LENGTH}`}
                        aria-invalid={invalid || undefined}
                        aria-describedby={describedBy}
                        onChange={(event) => handleChange(index, event)}
                        onKeyDown={(event) => handleKeyDown(index, event)}
                        onPaste={(event) => handlePaste(index, event)}
                        onFocus={(event) => event.target.select()}
                    />
                </span>
            ))}
        </div>
    );
});

export default OtpInput;
