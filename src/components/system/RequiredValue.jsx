// Lets a custom control (date picker, star rating, choice buttons) take part in the form's required check:
// a hidden input holding the chosen value. When it's empty on submit, `message` shows under the control
// and focus moves to the control's first button or input (utils/formValidation.js).
export default function RequiredValue({ value, message }) {
    return (
        <input
            className="rb-required-value"
            value={value ?? ""}
            onChange={() => {}}
            required
            data-required-message={message}
            tabIndex={-1}
            aria-hidden="true"
            onFocus={(event) => event.target.parentElement?.querySelector("button:not(:disabled), input:not(.rb-required-value):not(:disabled)")?.focus()}
        />
    );
}
