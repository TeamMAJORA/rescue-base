// Lets another dashboard (e.g. Foster) open a page on the Adopter dashboard.
const ADOPTER_START_PAGE_KEY = "rescuebase_adopter_start_page";

export function openOnAdopterDashboard(adopterPageKey) {
    try {
        sessionStorage.setItem(ADOPTER_START_PAGE_KEY, adopterPageKey);
    } catch {
        // storage blocked: the adopter dashboard opens on its overview
    }
}

export function readAdopterStartPage(fallbackPage) {
    try {
        return sessionStorage.getItem(ADOPTER_START_PAGE_KEY) || fallbackPage;
    } catch {
        return fallbackPage;
    }
}

export function clearAdopterStartPage() {
    try {
        sessionStorage.removeItem(ADOPTER_START_PAGE_KEY);
    } catch {
        // nothing to clear
    }
}
