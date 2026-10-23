import { useCallback, useEffect, useMemo, useState } from "react";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const PAGE_SIZE = 50;

// Tag colors per activity type (unknown types get the neutral tag)
const TYPE_CLASS = {
    Account: "is-account",
    Animal: "is-animal",
    Medical: "is-medical",
    Adoption: "is-adoption",
    Foster: "is-foster",
    Rescue: "is-rescue",
    "Lost & Found": "is-lostfound",
    GIS: "is-gis",
    Donation: "is-donation",
    Supplies: "is-donation",
    Report: "is-report",
    Feedback: "is-report",
    User: "is-account",
    Settings: "is-account",
};

function normalizeArray(value) {
    return Array.isArray(value)
        ? value.filter((item) => item !== null && typeof item === "object" && !Array.isArray(item))
        : [];
}

async function fetchJson(url) {
    const token = localStorage.getItem("token");
    const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
        throw new Error(data.message || `Request failed (${response.status}).`);
    }
    return data;
}

function userLabel(user) {
    return user?.name || user?.username || user?.email || "Unknown user";
}

function roleLabel(role) {
    const text = String(role || "").trim();
    return text ? text[0].toUpperCase() + text.slice(1) : "";
}

function dayKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayHeading(date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const full = date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

    if (dayKey(date) === dayKey(today)) return `Today · ${full}`;
    if (dayKey(date) === dayKey(yesterday)) return `Yesterday · ${full}`;
    return date.toLocaleDateString("en-PH", { weekday: "long" }) + ` · ${full}`;
}

export default function ActivityLog() {
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [types, setTypes] = useState([]);
    const [stats, setStats] = useState({ total: 0, today: 0, week: 0, activeUsersWeek: 0 });
    const [matching, setMatching] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    const [userFilter, setUserFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    // Wait until typing stops before searching
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const validDateRange = !startDate || !endDate || startDate <= endDate;

    const fetchUsers = useCallback(async () => {
        try {
            const data = await fetchJson(`${API}/api/users`);
            setUsers(normalizeArray(data.users));
        } catch {
            // Non-admins can't list users; they only see their own activity
            setUsers([]);
        }
    }, []);

    const fetchLogs = useCallback(
        async (skip = 0) => {
            if (!validDateRange) return;

            try {
                if (skip === 0) setLoading(true);
                else setLoadingMore(true);
                setError("");

                const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(skip) });
                if (userFilter) params.set("userId", userFilter);
                if (typeFilter) params.set("type", typeFilter);
                if (startDate) params.set("startDate", startDate);
                if (endDate) params.set("endDate", endDate);
                if (search) params.set("search", search);

                const data = await fetchJson(`${API}/api/activity-logs?${params.toString()}`);
                const page = normalizeArray(data.logs);

                setLogs((current) => (skip === 0 ? page : [...current, ...page]));
                setMatching(Number(data.total) || page.length);
                setHasMore(Boolean(data.hasMore));
                if (data.stats) setStats((current) => ({ ...current, ...data.stats }));
                if (Array.isArray(data.types)) setTypes(data.types);
            } catch (err) {
                console.error("Fetch activity logs error:", err);
                if (skip === 0) setLogs([]);
                setError(err.message || "Failed to fetch activity logs.");
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [userFilter, typeFilter, startDate, endDate, search, validDateRange]
    );

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchLogs(0);
    }, [fetchLogs]);

    const hasFilters = Boolean(userFilter || typeFilter || startDate || endDate || searchInput);

    function clearFilters() {
        setUserFilter("");
        setTypeFilter("");
        setStartDate("");
        setEndDate("");
        setSearchInput("");
        setSearch("");
    }

    function refresh() {
        fetchLogs(0);
        fetchUsers();
    }

    // Rows with a heading row whenever the day changes
    const rows = useMemo(() => {
        const out = [];
        let lastDay = "";

        logs.forEach((log, index) => {
            const date = log.activityDate ? new Date(log.activityDate) : null;
            const valid = date && !Number.isNaN(date.getTime());
            const key = valid ? dayKey(date) : "unknown";

            if (key !== lastDay) {
                out.push({ heading: valid ? dayHeading(date) : "Date not available", key: `day-${key}-${index}` });
                lastDay = key;
            }

            out.push({ log, date: valid ? date : null, key: log._id || `log-${index}` });
        });

        return out;
    }, [logs]);

    return (
        <section className="al2-page">
            <div className="um-strip al2-strip">
                <div className="um-strip-total">
                    <b>{stats.total}</b>
                    <small>Activities logged</small>
                </div>
                <div>
                    <small>Today</small>
                    <b>{stats.today}</b>
                </div>
                <div>
                    <small>Last 7 days</small>
                    <b>{stats.week}</b>
                </div>
                <div>
                    <small>Active users (7 days)</small>
                    <b>{stats.activeUsersWeek}</b>
                </div>
            </div>

            <section className="al2-card">
                <div className="al2-head">
                    <h3>System activity</h3>
                    <button type="button" className="al2-refresh" onClick={refresh} disabled={loading}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                            <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" />
                        </svg>
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                <div className="al2-tools">
                    <label className="al2-search">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            type="search"
                            value={searchInput}
                            placeholder="Search activity..."
                            onChange={(event) => setSearchInput(event.target.value)}
                        />
                    </label>

                    {users.length > 0 && (
                        <select className="al2-select" value={userFilter} aria-label="User" onChange={(event) => setUserFilter(event.target.value)}>
                            <option value="">All users</option>
                            {users.map((user) => (
                                <option key={user._id} value={user._id}>
                                    {userLabel(user)}
                                    {user.role ? ` (${roleLabel(user.role)})` : ""}
                                </option>
                            ))}
                        </select>
                    )}

                    <select className="al2-select" value={typeFilter} aria-label="Type" onChange={(event) => setTypeFilter(event.target.value)}>
                        <option value="">All types</option>
                        {types.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>

                    <div className={`al2-dates${validDateRange ? "" : " is-invalid"}`}>
                        <input
                            type="date"
                            value={startDate}
                            max={endDate || undefined}
                            aria-label="From date"
                            onChange={(event) => setStartDate(event.target.value)}
                        />
                        <span aria-hidden="true">–</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            aria-label="To date"
                            onChange={(event) => setEndDate(event.target.value)}
                        />
                    </div>

                    {hasFilters && (
                        <button type="button" className="al2-clear" onClick={clearFilters}>
                            Clear
                        </button>
                    )}
                </div>

                {!validDateRange && <p className="al2-error">The start date can't be after the end date.</p>}
                {error && (
                    <p className="al2-error" role="alert">
                        {error}
                    </p>
                )}

                {loading ? (
                    <p className="al2-empty">Loading activity...</p>
                ) : logs.length === 0 ? (
                    <p className="al2-empty">
                        {hasFilters ? "No activity matches your filters." : "No activity yet. Actions like adding animals or approving adoptions will show up here."}
                    </p>
                ) : (
                    <div className="al2-table-wrap">
                        <table className="al2-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>User</th>
                                    <th>Activity</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) =>
                                    row.heading ? (
                                        <tr className="al2-day" key={row.key}>
                                            <td colSpan={4}>{row.heading}</td>
                                        </tr>
                                    ) : (
                                        <tr key={row.key}>
                                            <td className="al2-time">
                                                {row.date
                                                    ? row.date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
                                                    : "—"}
                                            </td>
                                            <td>
                                                <b>{userLabel(row.log.user)}</b>
                                                <small>{roleLabel(row.log.user?.role) || row.log.user?.email || ""}</small>
                                            </td>
                                            <td className="al2-activity">{row.log.activity || "Activity not specified"}</td>
                                            <td>
                                                <span className={`al2-type ${TYPE_CLASS[row.log.activityType] || ""}`}>
                                                    {row.log.activityType || "Other"}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && logs.length > 0 && (
                    <div className="al2-foot">
                        <span>
                            Showing {logs.length} of {matching}
                        </span>
                        {hasMore && (
                            <button type="button" className="al2-more" onClick={() => fetchLogs(logs.length)} disabled={loadingMore}>
                                {loadingMore ? "Loading..." : "Load more"}
                            </button>
                        )}
                    </div>
                )}
            </section>
        </section>
    );
}
