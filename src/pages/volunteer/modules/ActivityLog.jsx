import { useEffect, useState } from "react";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const PAGE_SIZE = 50;

// The volunteer's own activity (the server only returns their entries)
export default function ActivityLog() {
    const [logs, setLogs] = useState(null);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState("");
    const [loadingMore, setLoadingMore] = useState(false);

    function fetchPage(skip) {
        const token = localStorage.getItem("token");
        return fetch(`${API}/api/activity-logs?limit=${PAGE_SIZE}&skip=${skip}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
            .then(({ ok, data }) => {
                if (!ok || data.success === false) throw new Error(data.message || "Could not load your activity.");
                return data;
            });
    }

    useEffect(() => {
        fetchPage(0)
            .then((data) => {
                setLogs(data.logs || []);
                setTotal(Number(data.total) || 0);
            })
            .catch((err) => {
                setLogs([]);
                setError(err.message);
            });
    }, []);

    async function loadMore() {
        try {
            setLoadingMore(true);
            const data = await fetchPage(logs.length);
            setLogs((current) => [...current, ...(data.logs || [])]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingMore(false);
        }
    }

    // Day headings between entries
    const rows = [];
    let lastDay = "";
    (logs || []).forEach((log) => {
        const date = new Date(log.activityDate || log.createdAt);
        const day = date.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
        if (day !== lastDay) {
            rows.push({ key: `day-${day}`, heading: day });
            lastDay = day;
        }
        rows.push({ key: log._id, log, date });
    });

    return (
        <section className="al2-card">
            <div className="al2-head">
                <h3>My activity</h3>
            </div>

            {error && <p className="al2-error" role="alert">{error}</p>}

            {logs === null ? (
                <p className="al2-empty">Loading activity...</p>
            ) : logs.length === 0 ? (
                <p className="al2-empty">No activity yet. Accepting rescues and pinning reports will show up here.</p>
            ) : (
                <div className="al2-table-wrap">
                    <table className="al2-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Activity</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) =>
                                row.heading ? (
                                    <tr className="al2-day" key={row.key}>
                                        <td colSpan={3}>{row.heading}</td>
                                    </tr>
                                ) : (
                                    <tr key={row.key}>
                                        <td className="al2-time">
                                            {row.date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
                                        </td>
                                        <td className="al2-activity">{row.log.activity || "Activity"}</td>
                                        <td>
                                            <span className="al2-type">{row.log.activityType || "Other"}</span>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {logs !== null && logs.length > 0 && (
                <div className="al2-foot">
                    <span>
                        Showing {logs.length} of {total}
                    </span>
                    {logs.length < total && (
                        <button type="button" className="al2-more" onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? "Loading..." : "Load more"}
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}
