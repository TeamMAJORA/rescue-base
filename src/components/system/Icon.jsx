// The one UI icon set (audit F9): inline SVG, stroke follows the text colour (currentColor), sized to the text (1em).
// Use instead of text glyphs (× ✕ ✓ → ← ↓ ▾). Decorative by default; give the button an aria-label.
const PATHS = {
    close: "M6 6l12 12M18 6L6 18",
    check: "M5 12.5l4.5 4.5L19 7.5",
    "arrow-right": "M5 12h14M13 6l6 6-6 6",
    "arrow-left": "M19 12H5M11 6l-6 6 6 6",
    "arrow-down": "M12 5v14M6 13l6 6 6-6",
    "chevron-down": "M6 9l6 6 6-6",
};

export default function Icon({ name, className = "" }) {
    const path = PATHS[name];
    if (!path) throw new Error(`Icon: unknown name "${name}"`);
    return (
        <svg className={`rb-icon ${className}`.trim()} viewBox="0 0 24 24" width="1em" height="1em" fill="none"
            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d={path} />
        </svg>
    );
}
