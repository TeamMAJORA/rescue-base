import { useId, useState } from "react";
import Icon from "./Icon";

// Password field with a show/hide button (log in, sign-up, account settings).
// `invalid` and `hasMessage` wire up a message shown by the parent as `${id}-msg`.
export default function PasswordInput({ id, invalid, hasMessage, toggleClassName = "password-input-toggle", ...inputProps }) {
    const [visible, setVisible] = useState(false);
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
        <span className="password-input">
            <input
                id={inputId}
                type={visible ? "text" : "password"}
                aria-invalid={invalid || undefined}
                aria-describedby={hasMessage ? `${inputId}-msg` : undefined}
                {...inputProps}
            />
            <button
                type="button"
                className={toggleClassName}
                onClick={() => setVisible((current) => !current)}
                aria-label="Show password"
                aria-pressed={visible}
                aria-controls={inputId}
            >
                <Icon name={visible ? "eye-off" : "eye"} />
            </button>
        </span>
    );
}
