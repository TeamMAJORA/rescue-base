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

// From another page (log in, sign-up): open the landing page, then scroll to the section once it's rendered.
export function openLandingSection(sectionId, setPage) {
    setPage("home");
    if (!sectionId) {
        window.scrollTo({ top: 0 });
        return;
    }

    let tries = 0;
    const timer = setInterval(() => {
        const section = document.getElementById(sectionId);
        tries += 1;
        if (section || tries > 40) {
            clearInterval(timer);
            section?.scrollIntoView({ behavior: "smooth" });
        }
    }, 50);
}
