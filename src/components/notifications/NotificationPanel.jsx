// One notification dropdown for every role (Admin, Staff, Volunteer, Foster, Adopter)
import "../../styles/components/NotificationPanel.css";

// Icon per notification type (reuses the sidebar icons; shown in one brown shade)
const ICON_BY_TYPE = {
    application_update: "/icons/sidebar/clipboard-brown.svg",
    role_application: "/icons/sidebar/role-brown.svg",
    adoption_update: "/icons/heart-brown.svg",
    interview: "/icons/sidebar/clipboard-brown.svg",
    foster_update: "/icons/sidebar/brown paw.svg",
    medical_update: "/icons/sidebar/medical-brown.svg",
    vaccination: "/icons/sidebar/medical-brown.svg",
    donation: "/icons/sidebar/donation-brown.svg",
    donation_update: "/icons/sidebar/donation-brown.svg",
    pet_available: "/icons/heart-brown.svg",
    rescue_update: "/icons/sidebar/LostnFound-brown.svg",
};
const DEFAULT_ICON = "/icons/sidebar/notification-brown.svg";

function timeAgo(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return "";

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return "just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return days === 1 ? "a day ago" : `${days} days ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// items: [{ id, title, message, read, type, createdAt }]
// unreadCount: how many can be marked read (summary reminders don't count)
export default function NotificationPanel({ items, unreadCount, onItemClick, onMarkAllRead, className = "" }) {
    return (
        <div className={`np-panel ${className}`} role="dialog" aria-label="Notifications">
            <div className="np-head">
                <span>Notifications</span>

                {unreadCount > 0 && onMarkAllRead && (
                    <button type="button" className="np-readall" onClick={onMarkAllRead}>
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="np-list">
                {items.length === 0 ? (
                    <p className="np-empty">You're all caught up.</p>
                ) : (
                    items.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`np-item ${item.read ? "" : "is-unread"}`}
                            onClick={() => onItemClick(item)}
                        >
                            <span
                                className="np-icon"
                                style={{ "--icon": `url("${ICON_BY_TYPE[item.type] || DEFAULT_ICON}")` }}
                                aria-hidden="true"
                            />

                            <span className="np-body">
                                <span className="np-text">
                                    <b>{item.title}</b> {item.message}
                                </span>
                                {item.createdAt && <small>{timeAgo(item.createdAt)}</small>}
                            </span>

                            {!item.read && <span className="np-dot" aria-label="Unread" />}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}