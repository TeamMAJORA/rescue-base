// The one way to show money in RescueBase: "₱1,500", or "₱1,500.50" when there are centavos.
export function formatPeso(amount) {
    const value = Number(amount) || 0;
    const digits = Number.isInteger(value) ? 0 : 2;
    return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
