import {
    useEffect,
    useState,
} from "react";

const API = import.meta.env.VITE_BACKEND_URL;

function ActivityLog() {
    const [logs, setLogs] = useState([]);

    const [users, setUsers] = useState([]);

    const [loading, setLoading] =
        useState(true);

    const [userFilter, setUserFilter] =
        useState("");

    const [startDate, setStartDate] =
        useState("");

    const [endDate, setEndDate] =
        useState("");

    async function fetchUsers() {
        try {
            const token =
                localStorage.getItem("token");

            const response = await fetch(
                `${API}/api/users`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            const data =
                await response.json();

            if (
                response.ok &&
                data.success
            ) {
                setUsers(
                    data.users || []
                );
            }
        } catch (error) {
            console.error(
                "Fetch activity log users error:",
                error
            );
        }
    }

    async function fetchLogs() {
        try {
            setLoading(true);

            const token =
                localStorage.getItem("token");

            const params =
                new URLSearchParams();

            if (userFilter) {
                params.set(
                    "userId",
                    userFilter
                );
            }

            if (startDate) {
                params.set(
                    "startDate",
                    startDate
                );
            }

            if (endDate) {
                params.set(
                    "endDate",
                    endDate
                );
            }

            const query =
                params.toString();

            const response = await fetch(
                `${API}/api/activity-logs${
                    query
                        ? `?${query}`
                        : ""
                }`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                console.error(
                    data.message ||
                    "Failed to fetch activity logs."
                );

                setLogs([]);

                return;
            }

            setLogs(
                data.logs || []
            );
        } catch (error) {
            console.error(
                "Fetch activity logs error:",
                error
            );

            setLogs([]);
        } finally {
            setLoading(false);
        }
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "Date not available";
        }

        const date =
            new Date(dateValue);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Date not available";
        }

        return date.toLocaleString(
            "en-PH",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
            }
        );
    }

    function getUserName(log) {
        if (!log.user) {
            return "Unknown User";
        }

        return (
            log.user.username ||
            log.user.name ||
            log.user.email ||
            "Unknown User"
        );
    }

    function handleClearFilters() {
        setUserFilter("");
        setStartDate("");
        setEndDate("");
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [
        userFilter,
        startDate,
        endDate,
    ]);

    return (
        <section className="admin-activity-log-page">
            <section className="admin-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>
                            Activity Logs
                        </h2>

                        <p>
                            Monitor system
                            activities performed
                            by users.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchLogs}
                    >
                        Refresh
                    </button>
                </div>

                <div className="admin-activity-filters">
                    <label>
                        User

                        <select
                            value={userFilter}
                            onChange={(event) =>
                                setUserFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="">
                                All Users
                            </option>

                            {users.map(
                                (user) => (
                                    <option
                                        key={
                                            user._id
                                        }
                                        value={
                                            user._id
                                        }
                                    >
                                        {user.username ||
                                            user.name ||
                                            user.email}
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label>
                        Start Date

                        <input
                            type="date"
                            value={startDate}
                            onChange={(event) =>
                                setStartDate(
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label>
                        End Date

                        <input
                            type="date"
                            value={endDate}
                            onChange={(event) =>
                                setEndDate(
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <button
                        type="button"
                        onClick={
                            handleClearFilters
                        }
                    >
                        Clear Filters
                    </button>
                </div>
            </section>

            <section className="admin-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>
                            System Activity
                        </h2>

                        <p>
                            {logs.length}{" "}
                            activity record
                            {logs.length === 1
                                ? ""
                                : "s"}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <p className="admin-empty">
                        Loading activity logs...
                    </p>
                ) : logs.length === 0 ? (
                    <p className="admin-empty">
                        No activity logs found.
                    </p>
                ) : (
                    <div className="admin-activity-list">
                        {logs.map(
                            (log) => (
                                <article
                                    key={
                                        log._id
                                    }
                                    className="admin-activity-row"
                                >
                                    <div>
                                        <h3>
                                            {
                                                log.activity
                                            }
                                        </h3>

                                        <p>
                                            <strong>
                                                User:
                                            </strong>{" "}
                                            {
                                                getUserName(
                                                    log
                                                )
                                            }
                                        </p>

                                        {log.user
                                            ?.email && (
                                            <p>
                                                <strong>
                                                    Email:
                                                </strong>{" "}
                                                {
                                                    log
                                                        .user
                                                        .email
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <span>
                                            {
                                                log.activityType
                                            }
                                        </span>

                                        <small>
                                            {
                                                formatDate(
                                                    log.activityDate
                                                )
                                            }
                                        </small>
                                    </div>
                                </article>
                            )
                        )}
                    </div>
                )}
            </section>
        </section>
    );
}

export default ActivityLog;