// Scrolls to a landing section. Some sections (like "Help without adopting") hide
// themselves when they have nothing to show, so fall back to the given action.
export function goToSection(sectionId, fallback) {
    const section = document.getElementById(sectionId);

    if (section) {
        section.scrollIntoView({ behavior: "smooth" });
        return;
    }

    fallback?.();
}
