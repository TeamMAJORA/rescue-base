import { useEffect } from "react";
import { markAllNotificationsRead } from "../../../utils/savedNotifications";
import NotificationPanel from "../../../components/notifications/NotificationPanel";

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

    async function handleMarkAllRead() {
        await markAllNotificationsRead().catch((error) =>
            console.error("Mark all notifications read error:", error)
        );

        await refresh?.();
    }

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
        <div className="foster-notification-overlay" onClick={onClose}>
            <div onClick={(event) => event.stopPropagation()}>
                <NotificationPanel
                    className="is-static"
                    items={notifications.map((notification) => ({ ...notification, id: notification._id }))}
                    unreadCount={notifications.filter((notification) => !notification.read).length}
                    onItemClick={handleNotification}
                    onMarkAllRead={handleMarkAllRead}
                />
            </div>
        </div>
    );
}