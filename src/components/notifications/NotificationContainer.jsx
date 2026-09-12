import Notification from "./Notification";

export default function NotificationContainer({
    notifications,
    removeNotification,
}) {
    return (
        <section className="notification-container">
            { notifications.map((notification) => (
                <Notification
                    key={notification.id}
                    notification={notification}
                    onClose={removeNotification}
                />
            ))}
        </section>
    )
}