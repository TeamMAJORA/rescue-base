// The one way to show dates and times in RescueBase (Philippine format):
//   formatDate(value)                        -> "Nov 16, 2026"
//   formatDate(value, { withYear: false })   -> "Nov 16"
//   formatDate(value, { withWeekday: true }) -> "Mon, Nov 16, 2026"
//   formatDateTime(value)                    -> "Nov 16, 2026, 3:05 PM"
//   formatTime(value)                        -> "3:05 PM"
//   formatMonth(value)                       -> "November 2026"   ({ withYear: false, short: true } -> "Nov")
// Missing or invalid values show EMPTY_DATE. Never build display dates with toISOString(): it is UTC,
// so before 8 AM in the Philippines it shows yesterday.
const LOCALE = "en-PH";
export const EMPTY_DATE = "—";

function toValidDate(value) {
    if (value === null || value === undefined || value === "") return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, { withYear = true, withWeekday = false } = {}) {
    const date = toValidDate(value);
    if (!date) return EMPTY_DATE;
    return date.toLocaleDateString(LOCALE, {
        ...(withWeekday && { weekday: "short" }),
        month: "short",
        day: "numeric",
        ...(withYear && { year: "numeric" }),
    });
}

export function formatDateTime(value) {
    const date = toValidDate(value);
    if (!date) return EMPTY_DATE;
    return date.toLocaleString(LOCALE, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatTime(value) {
    const date = toValidDate(value);
    if (!date) return EMPTY_DATE;
    return date.toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
}

export function formatMonth(value, { withYear = true, short = false } = {}) {
    const date = toValidDate(value);
    if (!date) return EMPTY_DATE;
    return date.toLocaleDateString(LOCALE, { month: short ? "short" : "long", ...(withYear && { year: "numeric" }) });
}

// Local calendar day as "YYYY-MM-DD" (for <input type="date"> values and day keys)
export function toDayValue(value = new Date()) {
    const date = toValidDate(value);
    if (!date) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}
