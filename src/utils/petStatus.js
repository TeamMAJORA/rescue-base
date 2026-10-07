export function formatPetStatus(status) {
    return String(status || "not_available").replaceAll("_", " ");
}