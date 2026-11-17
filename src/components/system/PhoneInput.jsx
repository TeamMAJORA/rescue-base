// Philippine mobile number after a fixed +63, stored as the 10 digits ("9171234567").
// Forgiving: "0917 123 4567", "+63 917-123-4567" and "9171234567" all become "9171234567".
// The pattern check shows its message under the field (utils/formValidation.js).
export function cleanPhoneDigits(raw) {
    let digits = String(raw ?? "").replace(/\D/g, "");
    if (digits.startsWith("63")) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = digits.slice(1);
    return digits.slice(0, 10);
}

// "9171234567" -> "+63 917 123 4567" (anything else is shown as it was saved)
export function formatPhone(value) {
    const digits = cleanPhoneDigits(value);
    return digits.length === 10
        ? `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
        : value || "—";
}

export default function PhoneInput({ value, onDigitsChange, className = "", ...inputProps }) {
    return (
        <span className={`phone-input ${className}`.trim()}>
            <span className="phone-input-prefix" aria-hidden="true">+63</span>
            <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                pattern="9[0-9]{9}"
                title="Enter a 10-digit mobile number starting with 9, like 917 123 4567."
                placeholder="9XX XXX XXXX"
                value={value}
                onChange={(event) => onDigitsChange(cleanPhoneDigits(event.target.value))}
                {...inputProps}
            />
        </span>
    );
}
