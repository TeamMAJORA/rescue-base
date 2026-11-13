import { useEffect, useState } from "react";
import "../../styles/components/SidebarUserCard.css";

// Name card at the bottom of every sidebar.
// Tapping the card opens account settings; logout is its own button and asks first.
export default function SidebarUserCard({ cardClassName, onOpenAccount, onConfirmLogout, children }) {
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

    useEffect(() => {
        if (!isLogoutDialogOpen) return undefined;

        function closeOnEscape(event) {
            if (event.key === "Escape") setIsLogoutDialogOpen(false);
        }

        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [isLogoutDialogOpen]);

    return (
        <div className="sidebar-user">
            <button
                type="button"
                className={`${cardClassName} sidebar-user-card`}
                title="Account settings"
                onClick={onOpenAccount}
            >
                {children}
            </button>

            <button
                type="button"
                className="sidebar-user-logout"
                aria-label="Log out"
                title="Log out"
                onClick={() => setIsLogoutDialogOpen(true)}
            >
                <img src="/icons/logout-brown.svg" alt="" aria-hidden="true" />
            </button>

            {isLogoutDialogOpen && (
                <div className="sidebar-logout-overlay" onClick={() => setIsLogoutDialogOpen(false)}>
                    <div
                        className="sidebar-logout-dialog"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="sidebar-logout-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 id="sidebar-logout-title">Log out?</h3>
                        <p>You'll need to sign in again to use RescueBase.</p>
                        <div className="sidebar-logout-actions">
                            <button type="button" className="sidebar-logout-cancel" autoFocus onClick={() => setIsLogoutDialogOpen(false)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="sidebar-logout-confirm"
                                onClick={() => {
                                    setIsLogoutDialogOpen(false);
                                    onConfirmLogout();
                                }}
                            >
                                Log out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
