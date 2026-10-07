export function formatAge(age) {
    const years = Number(age);
    if (!years || years < 0) return "Unknown";

    if (years < 1) {
        const months = Math.max(1, Math.round(years * 12));
        return `${months} ${months === 1 ? "month" : "months"}`;
    }

    const rounded = Math.round(years * 10) / 10;
    return `${rounded} ${rounded === 1 ? "year" : "years"}`;
}