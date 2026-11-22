const API = import.meta.env.VITE_BACKEND_URL;

// A full tag code, e.g. RB-1795226226521-JO3N64
export const TAG_CODE_PATTERN = /^RB-\d+-[A-Z0-9]+$/;

// A scanned tag holds the pet-page link (<website>/pet/<tagCode>); a typed one may be the code itself
export function tagCodeFrom(text) {
    const value = String(text || "").trim();
    const petPath = value.match(/\/pet\/([^/?#\s]+)/i);
    return (petPath ? decodeURIComponent(petPath[1]) : value).toUpperCase();
}

// Public lookup (no login needed): resolves to the tagged animal, or null when no animal has that tag
export async function lookupAnimalByTag(tagCode) {
    const response = await fetch(`${API}/api/qr-tags/lookup/${encodeURIComponent(tagCode)}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
    });
    if (response.status === 404) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Could not look up that tag.");
    return data.animal;
}
