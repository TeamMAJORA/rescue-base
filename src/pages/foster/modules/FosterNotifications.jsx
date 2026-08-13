import { useEffect } from "react";

const ICONS = {
    application_update: "📋",
    foster_update: "🐾",
    general: "📢",
};

export default function FosterNotifications({
    open,
    notifications,
    onClose,
    setActivePage,
    refresh,
}) {
    useEffect(() => {
        function close(e) {
            if (e.key === "Escape") {
                onClose();
            }
        }
        window.addEventListener("keydown", close);

        return () =>
            window.removeEventListener("keydown", close);
    }, [onClose]);

    if (!open) return null;

    async function handleNotification(notification) {
        const token = localStorage.getItem("token");

        try {
            if (!notification.read && token) {
                const response = await fetch(
                    `${import.meta.env.VITE_BACKEND_URL}/api/notifications/${notification._id}/read`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!response.ok) {
                    console.error("Failed to mark notification as read.");
                }
            }
        } catch (error) {
            console.error(
                "Mark notification as read error:",
                error
            );
        }

        await refresh?.();

        switch (notification.type) {
            case "application_update":
                setActivePage("application");
                break;

            case "foster_update":
                setActivePage("assignment");
                break;

            default:
                setActivePage("dashboard");
                break;
        }

        onClose();
    }
    
    return (
        <div
            className="foster-notification-overlay"
            onClick={onClose}
        >
            <div
                className="foster-notification-panel"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="notification-header">
                    <h3>Notifications</h3>

                    <button
                        type="button"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {notifications.length === 0 ? (
                    <div className="notification-empty">
                        No notifications.
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <button
                            type="button"
                            key={notification._id}
                            className={`notification-item ${notification.read
                                ? ""
                                : "unread"
                                }`}
                            onClick={() =>
                                handleNotification(notification)
                            }
                        >
                            <div className="notification-icon">
                                {ICONS[notification.type] || "📢"}
                            </div>

                            <div className="notification-content">
                                <strong>
                                    {notification.title}
                                </strong>

                                <p>
                                    {notification.message}
                                </p>

                                <small>
                                    {new Date(
                                        notification.createdAt
                                    ).toLocaleString()}
                                </small>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}