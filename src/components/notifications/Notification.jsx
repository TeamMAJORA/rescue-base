export default function Notification({
    notification,
    onClose,
}) {
    return (
        <article
            className={`notification ${notification.type}`}
        >
            <div className="notification-content">
                <strong>
                    {notification.title}
                </strong>
                <p>
                    {notification.message}
                </p>
            </div>

            <button
                type="button"
                className="notification-close"
                onClick={() => onClose(notification.id)}
            >
                X
            </button>
        </article>
    )
}