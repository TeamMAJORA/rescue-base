import { useEffect, useState } from "react";

// "⋯" button that opens a small menu of row actions (Edit, Delete…).
// items: [{ label, onSelect, isDanger }]; renders nothing when items is empty.
export default function RowActionsMenu({ ariaLabel, items, disabled = false }) {
    const [menuPosition, setMenuPosition] = useState(null);
    const isMenuOpen = menuPosition !== null;

    useEffect(() => {
        if (!isMenuOpen) return undefined;

        const closeMenu = () => setMenuPosition(null);
        const closeMenuOnEscape = (event) => {
            if (event.key === "Escape") closeMenu();
        };
        document.addEventListener("click", closeMenu);
        document.addEventListener("keydown", closeMenuOnEscape);
        window.addEventListener("scroll", closeMenu, true);
        window.addEventListener("resize", closeMenu);
        return () => {
            document.removeEventListener("click", closeMenu);
            document.removeEventListener("keydown", closeMenuOnEscape);
            window.removeEventListener("scroll", closeMenu, true);
            window.removeEventListener("resize", closeMenu);
        };
    }, [isMenuOpen]);

    if (items.length === 0) return null;

    return (
        <span className="row-actions-menu-wrap">
            <button
                type="button"
                className="row-actions-menu-btn"
                aria-label={ariaLabel}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                disabled={disabled}
                onClick={(event) => {
                    event.stopPropagation();
                    if (isMenuOpen) {
                        setMenuPosition(null);
                        return;
                    }
                    const buttonRect = event.currentTarget.getBoundingClientRect();
                    setMenuPosition({ top: buttonRect.bottom + 4, right: window.innerWidth - buttonRect.right });
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                </svg>
            </button>
            {isMenuOpen && (
                <span className="row-actions-menu" role="menu" style={menuPosition} onClick={(event) => event.stopPropagation()}>
                    {items.map((menuItem) => (
                        <button
                            key={menuItem.label}
                            type="button"
                            role="menuitem"
                            className={menuItem.isDanger ? "is-danger" : undefined}
                            onClick={() => {
                                setMenuPosition(null);
                                menuItem.onSelect();
                            }}
                        >
                            {menuItem.label}
                        </button>
                    ))}
                </span>
            )}
        </span>
    );
}
