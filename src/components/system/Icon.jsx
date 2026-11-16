// The one UI icon set (audit F9): inline SVG, stroke follows the text colour (currentColor), sized to the text (1em).
// Use instead of text glyphs (× ✕ ✓ → ← ↓ ▾). Decorative by default; give the button an aria-label.
const PATHS = {
    close: "M6 6l12 12M18 6L6 18",
    check: "M5 12.5l4.5 4.5L19 7.5",
    "arrow-right": "M5 12h14M13 6l6 6-6 6",
    "arrow-left": "M19 12H5M11 6l-6 6 6 6",
    "arrow-down": "M12 5v14M6 13l6 6 6-6",
    "chevron-down": "M6 9l6 6 6-6",
    heart: "M12 20.5s-7.5-4.6-7.5-10.1A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z",
    pin: "M12 21s-6.5-6.1-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.9-6.5 11-6.5 11zM12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z",
    home: "M4 11l8-7 8 7M6.5 9.5V20h11V9.5",
};

export default function Icon({ name, className = "", filled = false }) {
    const path = PATHS[name];
    if (!path) throw new Error(`Icon: unknown name "${name}"`);
    return (
        <svg className={`rb-icon ${className}`.trim()} viewBox="0 0 24 24" width="1em" height="1em" fill={filled ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d={path} />
        </svg>
    );
}
