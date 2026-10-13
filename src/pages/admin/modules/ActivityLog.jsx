
import { useCallback, useEffect, useState } from "react";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

function normalizeArray(value) {
    return Array.isArray(value)
        ? value.filter(
              (item) =>
                  item !== null &&
                  typeof item === "object" &&
                  !Array.isArray(item)
          )
        : [];
}

function getToken() {
    return localStorage.getItem("token");
}

async function fetchJson(url) {
    const token = getToken();

    const response = await fetch(url, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
        throw new Error(
            data.message || `Request failed (${response.status}).`
        );
    }

    return data;
}

function formatDate(dateValue) {
    if (!dateValue) return "Date not available";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
    });
}

function getUserName(log) {
    const user = log?.user;

    if (user && typeof user === "object") {
        return (
            user.username ||
            user.name ||
            user.email ||
            "Unknown User"
        );
    }

    return "Unknown User";
}

function getUserLabel(user) {
    return (
        user?.username ||
        user?.name ||
        user?.email ||
        "Unnamed User"
    );
}

function ActivityLog() {
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(true);

    const [userFilter, setUserFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [error, setError] = useState("");
    const [usersError, setUsersError] = useState("");

    const fetchUsers = useCallback(async () => {
        try {
            setUsersLoading(true);
            setUsersError("");

            const data = await fetchJson(`${API}/api/users`);

            setUsers(normalizeArray(data.users));
        } catch (err) {
            console.error("Fetch activity log users error:", err);
            setUsers([]);
            setUsersError(
                err.message || "Failed to load users."
            );
        } finally {
            setUsersLoading(false);
        }
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const params = new URLSearchParams();

            if (userFilter) {
                params.set("userId", userFilter);
            }

            if (startDate) {
                params.set("startDate", startDate);
            }

            if (endDate) {
                params.set("endDate", endDate);
            }

            const query = params.toString();
            const url = `${API}/api/activity-logs${
                query ? `?${query}` : ""
            }`;

            const data = await fetchJson(url);

            setLogs(normalizeArray(data.logs));
        } catch (err) {
            console.error("Fetch activity logs error:", err);
            setLogs([]);
            setError(
                err.message || "Failed to fetch activity logs."
            );
        } finally {
            setLoading(false);
        }
    }, [userFilter, startDate, endDate]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    function handleClearFilters() {
        setUserFilter("");
        setStartDate("");
        setEndDate("");
    }

    function handleRefresh() {
        fetchLogs();
        fetchUsers();
    }

    const validDateRange =
        !startDate || !endDate || startDate <= endDate;

    return (
        <section className="admin-activity-log-page">
            <section className="admin-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Activity Logs</h2>
                        <p>
                            Monitor system activities performed by users.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading || usersLoading}
                    >
                        {loading || usersLoading
                            ? "Refreshing..."
                            : "Refresh"}
                    </button>
                </div>

                <div className="admin-activity-filters">
                    <label>
                        User

                        <select
                            value={userFilter}
                            onChange={(event) =>
                                setUserFilter(event.target.value)
                            }
                            disabled={usersLoading}
                        >
                            <option value="">
                                All Users
                            </option>

                            {users.map((user, index) => {
                                const id = user._id;

                                if (!id) return null;

                                return (
                                    <option
                                        key={id || index}
                                        value={id}
                                    >
                                        {getUserLabel(user)}
                                    </option>
                                );
                            })}
                        </select>
                    </label>

                    <label>
                        Start Date

                        <input
                            type="date"
                            value={startDate}
                            max={endDate || undefined}
                            onChange={(event) =>
                                setStartDate(event.target.value)
                            }
                        />
                    </label>

                    <label>
                        End Date

                        <input
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            onChange={(event) =>
                                setEndDate(event.target.value)
                            }
                        />
                    </label>

                    <button
                        type="button"
                        onClick={handleClearFilters}
                        disabled={
                            !userFilter && !startDate && !endDate
                        }
                    >
                        Clear Filters
                    </button>
                </div>

                {!validDateRange && (
                    <p className="admin-reports-error" role="alert">
                        The start date cannot be later than the end date.
                    </p>
                )}

                {usersError && (
                    <p className="admin-reports-error" role="alert">
                        {usersError}
                    </p>
                )}
            </section>

            <section className="admin-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>System Activity</h2>

                        <p>
                            {logs.length} activity record
                            {logs.length === 1 ? "" : "s"}
                        </p>
                    </div>
                </div>

                {error && (
                    <p className="admin-reports-error" role="alert">
                        {error}
                    </p>
                )}

                {loading ? (
                    <p className="admin-empty">
                        Loading activity logs...
                    </p>
                ) : !validDateRange ? (
                    <p className="admin-empty">
                        Adjust the date range to view activity logs.
                    </p>
                ) : logs.length === 0 ? (
                    <p className="admin-empty">
                        No activity logs found.
                    </p>
                ) : (
                    <div className="admin-activity-list">
                        {logs.map((log, index) => {
                            const id = log._id || `activity-${index}`;

                            return (
                                <article
                                    key={id}
                                    className="admin-activity-row"
                                >
                                    <div>
                                        <h3>
                                            {log.activity ||
                                                "Activity not specified"}
                                        </h3>

                                        <p>
                                            <strong>User:</strong>{" "}
                                            {getUserName(log)}
                                        </p>

                                        {log.user?.email && (
                                            <p>
                                                <strong>Email:</strong>{" "}
                                                {log.user.email}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <span>
                                            {log.activityType ||
                                                "Uncategorized"}
                                        </span>

                                        <small>
                                            {formatDate(
                                                log.activityDate
                                            )}
                                        </small>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </section>
    );
}

export default ActivityLog;