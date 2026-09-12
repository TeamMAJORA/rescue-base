export function getCurrentUser() {
    return JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );
}

export function getCurrentRole() {
    return String(
        getCurrentUser().role || ""
    )
        .trim()
        .toLowerCase();
}

export function isAdmin() {
    return getCurrentRole() === "admin";
}

export function isStaff() {
    return getCurrentRole() === "staff";
}

export function isVolunteer() {
    return getCurrentRole() === "volunteer";
}

export function isFoster() {
    return getCurrentRole() === "foster";
}

export function isAdopter() {
    return getCurrentRole() === "adopter";
}