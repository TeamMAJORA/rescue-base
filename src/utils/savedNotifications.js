const API = import.meta.env.VITE_BACKEND_URL;

// Which page a saved notification opens, by its type (see the Notification model)
const PAGE_BY_TYPE = {
    application_update: "adoption-applications",
    role_application: "users",
    foster_update: "foster-care",
    medical_update: "foster-care",
    donation: "donations",
    donation_update: "donations",
};

function authHeaders() {
    return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

// Newest 20 saved notifications (read and unread), shaped like the bell's other items
export async function fetchRecentNotifications() {
    const response = await fetch(`${API}/api/notifications`, { headers: authHeaders() });
    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load notifications.");
    }

    return (data.notifications || []).slice(0, 20).map((item) => ({
        id: item._id,
        savedId: item._id,
        title: item.title,
        message: item.message,
        read: item.read,
        type: item.type,
        createdAt: item.createdAt,
        page: PAGE_BY_TYPE[item.type] || null,
    }));
}

export function markNotificationRead(notificationId) {
    return fetch(`${API}/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: authHeaders(),
    });
}

export function markAllNotificationsRead() {
    return fetch(`${API}/api/notifications/read-all`, {
        method: "PATCH",
        headers: authHeaders(),
    });
}