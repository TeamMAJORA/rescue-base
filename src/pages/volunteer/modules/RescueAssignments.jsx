import { useCallback, useEffect, useState } from "react";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

// Styled pop-ups from the dashboard (fall back to the browser boxes)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

const STATUS_TABS = [
    { key: "pending", label: "New" },
    { key: "accepted", label: "Accepted" },
    { key: "active", label: "In progress" },
    { key: "completed", label: "Completed" },
    { key: "declined", label: "Declined" },
];

const STATUS_PILL = {
    pending: { label: "New", className: "is-pending" },
    accepted: { label: "Accepted", className: "is-accepted" },
    active: { label: "In progress", className: "is-active" },
    completed: { label: "Completed", className: "is-done" },
    declined: { label: "Declined", className: "is-off" },
    cancelled: { label: "Cancelled", className: "is-off" },
};

const TYPE_LABEL = {
    rescue: "Rescue",
    transport: "Transport",
    emergency: "Emergency",
    follow_up: "Follow-up",
    other: "Other",
};

function authHeaders(withJson = false) {
    const token = localStorage.getItem("token");
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(withJson ? { "Content-Type": "application/json" } : {}),
    };
}

function formatWhen(assignment) {
    const date = assignment.scheduledDate ? new Date(assignment.scheduledDate) : null;
    const day = date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
        : "No date";
    return assignment.scheduledTime ? `${day} · ${assignment.scheduledTime}` : day;
}

// The volunteer's own rescue jobs + the actions on them (shared by the dashboard and My Rescues)
function useMyRescues() {
    const [assignments, setAssignments] = useState(null);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(() => {
        return fetch(`${API}/api/rescue-assignments/my`, { headers: authHeaders() })
            .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
            .then(({ ok, data }) => {
                if (!ok || data.success === false) throw new Error(data.message || "Could not load your rescues.");
                setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
                setError("");
            })
            .catch((err) => {
                setAssignments([]);
                setError(err.message || "Could not load your rescues.");
            });
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function act(assignment, action) {
        let body = {};

        if (action === "decline") {
            const reason = window.prompt(`Why can't you take "${assignment.title}"? (optional)`, "");
            if (reason === null) return;
            body = { reason };
        }

        if (action === "complete") {
            const completionNotes = window.prompt(`How did "${assignment.title}" go? (e.g. brought to shelter)`, "");
            if (completionNotes === null) return;
            body = { completionNotes };
        }

        if (action === "accept") {
            const confirmed = await askConfirm({
                title: `Accept "${assignment.title}"?`,
                message: `${assignment.location} · ${formatWhen(assignment)}`,
                confirmLabel: "Accept",
            });
            if (!confirmed) return;
        }

        try {
            setBusyId(assignment._id);
            setNotice("");
            const response = await fetch(`${API}/api/rescue-assignments/${assignment._id}/${action}`, {
                method: "PATCH",
                headers: authHeaders(true),
                body: JSON.stringify(body),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data.success === false) throw new Error(data.message || "Could not update the rescue.");

            const done = { accept: "Rescue accepted.", decline: "Rescue declined.", start: "Rescue started.", complete: "Rescue completed. Thank you!" };
            setNotice(done[action]);
            await load();
        } catch (err) {
            setNotice(err.message || "Could not update the rescue.");
        } finally {
            setBusyId("");
        }
    }

    return { assignments, error, busyId, notice, act, reload: load };
}

function RescueActions({ assignment, busy, onAct }) {
    if (assignment.status === "pending") {
        return (
            <div className="vr-actions">
                <button type="button" className="vr-btn is-danger" disabled={busy} onClick={() => onAct(assignment, "decline")}>
                    Decline
                </button>
                <button type="button" className="vr-btn is-primary" disabled={busy} onClick={() => onAct(assignment, "accept")}>
                    Accept
                </button>
            </div>
        );
    }

    if (assignment.status === "accepted") {
        return (
            <div className="vr-actions">
                <button type="button" className="vr-btn is-dark" disabled={busy} onClick={() => onAct(assignment, "start")}>
                    Start
                </button>
            </div>
        );
    }

    if (assignment.status === "active") {
        return (
            <div className="vr-actions">
                <button type="button" className="vr-btn is-primary" disabled={busy} onClick={() => onAct(assignment, "complete")}>
                    Complete
                </button>
            </div>
        );
    }

    return null;
}

function RescueRow({ assignment, busy, onAct }) {
    const pill = STATUS_PILL[assignment.status] || STATUS_PILL.pending;
    const urgent = assignment.priority === "urgent" || assignment.priority === "high";
    const notes =
        assignment.status === "completed"
            ? assignment.completionNotes
            : assignment.status === "declined"
                ? assignment.volunteerNotes
                : assignment.description;

    return (
        <article className="vr-row">
            <span className="vr-photo">
                {assignment.animalImage ? (
                    <img src={assignment.animalImage} alt="" />
                ) : (
                    <img src="/icons/strayMap-brown.svg" alt="" className="is-placeholder" />
                )}
            </span>

            <div className="vr-main">
                <b>
                    {assignment.title}
                    <span className={`vr-pill ${pill.className}`}>{pill.label}</span>
                    {urgent && assignment.status !== "completed" && (
                        <span className="vr-pill is-urgent">{assignment.priority === "urgent" ? "Urgent" : "High"}</span>
                    )}
                </b>
                <small>
                    {assignment.location} · {formatWhen(assignment)} · {TYPE_LABEL[assignment.assignmentType] || "Rescue"}
                    {assignment.adminName ? ` · Assigned by ${assignment.adminName}` : ""}
                </small>
                {notes && <small className="vr-notes">“{notes}”</small>}
            </div>

            <RescueActions assignment={assignment} busy={busy} onAct={onAct} />
        </article>
    );
}

// Sidebar page: all of the volunteer's rescue jobs, by status
export default function RescueAssignments() {
    const { assignments, error, busyId, notice, act, reload } = useMyRescues();
    const [tab, setTab] = useState("pending");

    const list = assignments || [];
    const shown = list.filter((assignment) =>
        tab === "declined" ? ["declined", "cancelled"].includes(assignment.status) : assignment.status === tab
    );

    return (
        <section className="db2-card vr-page">
            <h3>
                My Rescues
                <button type="button" className="db2-link" onClick={reload}>
                    Refresh
                </button>
            </h3>
            <p className="db2-sub">Rescue jobs the shelter assigned to you.</p>

            <div className="vr-tabs">
                {STATUS_TABS.map((item) => {
                    const count = list.filter((assignment) =>
                        item.key === "declined"
                            ? ["declined", "cancelled"].includes(assignment.status)
                            : assignment.status === item.key
                    ).length;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            className={tab === item.key ? "is-active" : ""}
                            onClick={() => setTab(item.key)}
                        >
                            {item.label} ({count})
                        </button>
                    );
                })}
            </div>

            {notice && <p className="vr-notice">{notice}</p>}
            {error && <p className="db2-error">{error}</p>}

            {assignments === null ? (
                <p className="db2-empty">Loading your rescues...</p>
            ) : shown.length === 0 ? (
                <p className="db2-empty">Nothing here right now.</p>
            ) : (
                <div className="vr-list">
                    {shown.map((assignment) => (
                        <RescueRow key={assignment._id} assignment={assignment} busy={busyId === assignment._id} onAct={act} />
                    ))}
                </div>
            )}
        </section>
    );
}

// Volunteer dashboard: only the volunteer's own jobs and activity
export function VolunteerOverview({ onNavigate, onOpenAdopterPage }) {
    const { assignments, error, busyId, notice, act } = useMyRescues();
    const [activity, setActivity] = useState(null);

    useEffect(() => {
        fetch(`${API}/api/activity-logs?limit=5`, { headers: authHeaders() })
            .then((response) => response.json())
            .then((data) => setActivity(Array.isArray(data.logs) ? data.logs : []))
            .catch(() => setActivity([]));
    }, []);

    const user = (() => {
        try {
            return JSON.parse(localStorage.getItem("rescuebase_user") || "{}");
        } catch {
            return {};
        }
    })();
    const firstName = String(user.name || user.username || "Volunteer").split(" ")[0];
    const list = assignments || [];
    const count = (status) => list.filter((assignment) => assignment.status === status).length;
    const upcoming = list.filter((assignment) => ["pending", "accepted", "active"].includes(assignment.status)).slice(0, 4);
    const go = (page) => onNavigate && onNavigate(page);

    return (
        <div className="db2-page">
            <div className="db2-top">
                <h1>Hello, {firstName}</h1>
            </div>

            {error && <p className="db2-error">{error}</p>}
            {notice && <p className="vr-notice">{notice}</p>}

            <div className="db2-stats">
                <div className="db2-stat is-hero">
                    <small>Waiting for you</small>
                    <b>{assignments === null ? "—" : count("pending")}</b>
                    <em>New rescue jobs to accept</em>
                </div>
                <div className="db2-stat">
                    <small>Accepted</small>
                    <b>{assignments === null ? "—" : count("accepted")}</b>
                    <em>Ready to start</em>
                </div>
                <div className="db2-stat">
                    <small>In progress</small>
                    <b>{assignments === null ? "—" : count("active")}</b>
                    <em>Started, not finished</em>
                </div>
                <div className="db2-stat">
                    <small>Completed</small>
                    <b>{assignments === null ? "—" : count("completed")}</b>
                    <em>Rescues you finished</em>
                </div>
            </div>

            <div className="db2-grid is-7-5">
                <section className="db2-card">
                    <h3>
                        Next rescues
                        <button type="button" className="db2-link" onClick={() => go("rescues")}>
                            My Rescues →
                        </button>
                    </h3>
                    <p className="db2-sub">Jobs assigned to you, soonest first.</p>

                    {assignments === null ? (
                        <p className="db2-empty">Loading...</p>
                    ) : upcoming.length === 0 ? (
                        <p className="db2-empty">No open rescue jobs. New ones will show up here.</p>
                    ) : (
                        <div className="vr-list">
                            {upcoming.map((assignment) => (
                                <RescueRow key={assignment._id} assignment={assignment} busy={busyId === assignment._id} onAct={act} />
                            ))}
                        </div>
                    )}
                </section>

                <div className="db2-col">
                    <section className="db2-card">
                        <h3>Quick actions</h3>
                        <div className="vr-quick">
                            <button type="button" className="vr-btn is-primary" onClick={() => go("gis")}>
                                Pin a stray report
                            </button>
                            <button type="button" className="vr-btn" onClick={() => onOpenAdopterPage?.("lost-found")}>
                                Lost &amp; Found
                            </button>
                            <button type="button" className="vr-btn" onClick={() => onOpenAdopterPage?.("donation")}>
                                Donate
                            </button>
                        </div>
                    </section>

                    <section className="db2-card">
                        <h3>
                            My recent activity
                            <button type="button" className="db2-link" onClick={() => go("activity-log")}>
                                View all
                            </button>
                        </h3>
                        {activity === null ? (
                            <p className="db2-empty">Loading...</p>
                        ) : activity.length === 0 ? (
                            <p className="db2-empty">No activity yet.</p>
                        ) : (
                            <ul className="vr-activity">
                                {activity.map((log) => (
                                    <li key={log._id}>
                                        {log.activity}
                                        <small>
                                            {new Date(log.activityDate || log.createdAt).toLocaleString("en-PH", {
                                                month: "short",
                                                day: "numeric",
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })}
                                        </small>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
