import { useEffect } from "react";

const ICONS = {
    application_approved: "🎉",
    application_rejected: "⚠️",
    assignment_created: "🐾",
    assignment_completed: "✅",
    weekly_reminder: "📝",
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
    }, []);

    if (!open) return null;

    function handleNotification(notification) {
        refresh?.(notification._id);

        switch (notification.type) {
            case "application_approved":
            case "application_rejected":
                setActivePage("application");
                break;

            case "assignment_created":
                setActivePage("assignment");
                break;

            case "assignment_completed":
                setActivePage("history");
                break;

            case "weekly_reminder":
                setActivePage("updates");
                break;

            default:
                setActivePage("dashboard");
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
                    <h3>
                        Notifications
                    </h3>
                    <button
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {

                    notifications.length === 0 ? (
                        <div className="notification-empty">

                            No notifications.

                        </div>
                    ) : (

                        notifications.map((notification) => (
                            <button
                                key={notification._id}
                                className={`notification-item ${notification.isRead
                                        ? ""
                                        : "unread"
                                    }`}
                                onClick={() =>
                                    handleNotification(notification)
                                }
                            >

                                <div className="notification-icon">
                                    {
                                        ICONS[
                                        notification.type
                                        ] || "📢"
                                    }
                                </div>

                                <div className="notification-content">
                                    <strong>
                                        {notification.title}
                                    </strong>

                                    <p>
                                        {notification.message}
                                    </p>

                                    <small>
                                        {
                                            new Date(
                                                notification.createdAt
                                            ).toLocaleString()
                                        }
                                    </small>
                                </div>
                            </button>
                        ))
                    )
                }
            </div>
        </div>
    );
}