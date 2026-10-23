import { useEffect, useMemo, useState } from "react";
import { isAdmin } from "../../../utils/auth";

// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const CATEGORY_LABELS = {
    general: "General",
    adoption: "Adoption",
    foster: "Foster Care",
    volunteer: "Volunteer",
    donation: "Donation",
    lost_found: "Lost & Found",
    medical: "Medical",
    website: "Website",
    other: "Other",
};

const ROLE_LABELS = {
    admin: "Admin",
    staff: "Staff",
    adopter: "Adopter",
    foster: "Foster",
    volunteer: "Volunteer",
    donor: "Donor",
};

function formatDate(value, withTime = false) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    });
}

function Stars({ rating, size }) {
    return (
        <span className={`fb2-stars${size ? ` ${size}` : ""}`} aria-label={`${rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= Math.round(rating) ? "on" : ""}>
                    ★
                </span>
            ))}
        </span>
    );
}

export default function Feedback() {
    const [feedback, setFeedback] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [rating, setRating] = useState("all");
    const [role, setRole] = useState("all");
    const [sort, setSort] = useState("newest");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [busyId, setBusyId] = useState("");
    const [replyText, setReplyText] = useState("");
    const [replying, setReplying] = useState(false);
    const [notice, setNotice] = useState("");

    const canDelete = isAdmin();

    async function loadFeedback() {
        const token = localStorage.getItem("token");

        if (!token) {
            setError("Authentication token is missing.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Load both lists so the chips can show counts
            const results = await Promise.all(
                ["active", "archived"].map(async (s) => {
                    const response = await fetch(`${BACKEND_URL}/api/feedback?status=${s}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await response.json().catch(() => ({}));

                    if (!response.ok) {
                        throw new Error(data.message || "Failed to load feedback.");
                    }
                    return data.feedback || [];
                })
            );

            setFeedback(results.flat());
        } catch (err) {
            console.error("Load feedback error:", err);
            setError(err.message || "Failed to load feedback.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadFeedback();
    }, []);

    async function updateFeedback(id, action) {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            setBusyId(id);
            const response = await fetch(`${BACKEND_URL}/api/feedback/${id}/${action}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || `Failed to ${action} feedback.`);
            }

            await loadFeedback();
            setSelectedFeedback(null);
        } catch (err) {
            console.error(`Feedback ${action} error:`, err);
            setError(err.message || `Failed to ${action} feedback.`);
        } finally {
            setBusyId("");
        }
    }

    function openFeedback(item) {
        setSelectedFeedback(item);
        setReplyText(item.reply || "");
        setNotice("");
    }

    async function sendReply() {
        const token = localStorage.getItem("token");
        const text = replyText.trim();
        if (!token || !selectedFeedback || !text) return;

        try {
            setReplying(true);
            setError("");
            const response = await fetch(`${BACKEND_URL}/api/feedback/${selectedFeedback._id}/reply`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ reply: text }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to send reply.");
            }

            setNotice(data.message || "Reply sent.");
            setFeedback((current) =>
                current.map((item) => (item._id === selectedFeedback._id ? { ...item, ...data.feedback } : item))
            );
            setSelectedFeedback((current) => (current ? { ...current, ...data.feedback } : current));
        } catch (err) {
            console.error("Feedback reply error:", err);
            setError(err.message || "Failed to send reply.");
        } finally {
            setReplying(false);
        }
    }

    async function deleteFeedback(id) {
        const confirmed = await askConfirm({
            title: "Delete this feedback?",
            message: "This can't be undone.",
            confirmLabel: "Delete",
            danger: true,
        });

        if (!confirmed) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            setBusyId(id);
            const response = await fetch(`${BACKEND_URL}/api/feedback/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || "Failed to delete feedback.");
            }

            await loadFeedback();
            setSelectedFeedback(null);
        } catch (err) {
            console.error("Delete feedback error:", err);
            setError(err.message || "Failed to delete feedback.");
        } finally {
            setBusyId("");
        }
    }

    const counts = useMemo(() => {
        const active = feedback.filter((item) => item.status !== "archived").length;
        const ratings = feedback.map((item) => Number(item.rating)).filter((n) => n > 0);
        const average = ratings.length
            ? ratings.reduce((sum, n) => sum + n, 0) / ratings.length
            : 0;

        return {
            all: feedback.length,
            active,
            archived: feedback.length - active,
            average,
        };
    }, [feedback]);

    const shown = useMemo(() => {
        const term = search.trim().toLowerCase();

        return feedback
            .filter((item) => {
                const itemStatus = item.status === "archived" ? "archived" : "active";
                if (statusFilter !== "all" && itemStatus !== statusFilter) return false;
                if (category !== "all" && item.category !== category) return false;
                if (rating !== "all" && Number(item.rating) !== Number(rating)) return false;
                if (role !== "all" && item.role !== role) return false;
                if (!term) return true;

                return [item.userName, item.userEmail, item.message]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(term));
            })
            .sort((a, b) => {
                if (sort === "highest") return Number(b.rating) - Number(a.rating);
                if (sort === "lowest") return Number(a.rating) - Number(b.rating);

                const diff = new Date(b.createdAt) - new Date(a.createdAt);
                return sort === "oldest" ? -diff : diff;
            });
    }, [feedback, statusFilter, category, rating, role, sort, search]);

    const hasFilters =
        search.trim() !== "" || category !== "all" || rating !== "all" || role !== "all";

    function clearFilters() {
        setSearch("");
        setCategory("all");
        setRating("all");
        setRole("all");
    }

    function renderActions(item) {
        const archived = item.status === "archived";

        return (
            <div className="fb2-actions">
                <button type="button" className="fb2-link" onClick={() => openFeedback(item)}>
                    View
                </button>

                <button
                    type="button"
                    className="fb2-mini"
                    disabled={busyId === item._id}
                    onClick={() => updateFeedback(item._id, archived ? "restore" : "archive")}
                >
                    {archived ? "Restore" : "Archive"}
                </button>

                {canDelete && (
                    <button
                        type="button"
                        className="fb2-icon"
                        title="Delete"
                        aria-label={`Delete feedback from ${item.userName || "user"}`}
                        disabled={busyId === item._id}
                        onClick={() => deleteFeedback(item._id)}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                        </svg>
                    </button>
                )}
            </div>
        );
    }

    return (
        <section className="feedback-management fb2-page">
            <div className="um-strip fb2-strip">
                <div className="um-strip-total">
                    <b>{counts.all}</b>
                    <small>Total feedback</small>
                </div>
                <div>
                    <small>Average rating</small>
                    <b className="fb2-avg">
                        {counts.average ? counts.average.toFixed(1) : "–"}
                        {counts.average > 0 && <Stars rating={counts.average} size="is-small" />}
                    </b>
                </div>
                <div>
                    <small>Active</small>
                    <b>{counts.active}</b>
                </div>
                <div>
                    <small>Archived</small>
                    <b>{counts.archived}</b>
                </div>
            </div>

            {error && (
                <p className="fb2-error" role="alert">
                    {error}
                </p>
            )}

            <section className="fb2-card">
                <div className="fb2-head">
                    <h3>
                        {statusFilter === "active"
                            ? "Active feedback"
                            : statusFilter === "archived"
                                ? "Archived feedback"
                                : "All feedback"}
                    </h3>

                    <div className="fb2-chips" role="tablist" aria-label="Filter feedback">
                        {[
                            ["all", "All", counts.all],
                            ["active", "Active", counts.active],
                            ["archived", "Archived", counts.archived],
                        ].map(([value, label, count]) => (
                            <button
                                type="button"
                                key={value}
                                role="tab"
                                aria-selected={statusFilter === value}
                                className={statusFilter === value ? "on" : ""}
                                onClick={() => setStatusFilter(value)}
                            >
                                {label}
                                <em>{count}</em>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="fb2-tools">
                    <label className="fb2-search">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            type="search"
                            value={search}
                            placeholder="Search name, email or message..."
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>

                    <select className="fb2-select" value={category} aria-label="Category" onChange={(event) => setCategory(event.target.value)}>
                        <option value="all">All categories</option>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>

                    <select className="fb2-select" value={rating} aria-label="Rating" onChange={(event) => setRating(event.target.value)}>
                        <option value="all">All ratings</option>
                        {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                                {n} star{n > 1 ? "s" : ""}
                            </option>
                        ))}
                    </select>

                    <select className="fb2-select" value={role} aria-label="Role" onChange={(event) => setRole(event.target.value)}>
                        <option value="all">All roles</option>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>

                    <select className="fb2-select" value={sort} aria-label="Sort" onChange={(event) => setSort(event.target.value)}>
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="highest">Highest rating</option>
                        <option value="lowest">Lowest rating</option>
                    </select>
                </div>

                {loading ? (
                    <p className="fb2-empty">Loading feedback...</p>
                ) : shown.length === 0 ? (
                    <p className="fb2-empty">
                        {feedback.length === 0 ? "No feedback yet." : "No feedback matches your search or filters."}
                    </p>
                ) : (
                    <div className="fb2-table-wrap">
                        <table className="fb2-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Category</th>
                                    <th>Rating</th>
                                    <th>Feedback</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th className="fb2-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shown.map((item) => {
                                    const archived = item.status === "archived";

                                    return (
                                        <tr key={item._id}>
                                            <td>
                                                <b>{item.userName || "Unknown user"}</b>
                                                <small className="fb2-muted">{item.userEmail}</small>
                                            </td>
                                            <td>
                                                <span className="fb2-role">{ROLE_LABELS[item.role] || item.role}</span>
                                            </td>
                                            <td>{CATEGORY_LABELS[item.category] || item.category}</td>
                                            <td>
                                                <Stars rating={Number(item.rating) || 0} />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="fb2-msg"
                                                    title={item.message}
                                                    onClick={() => openFeedback(item)}
                                                >
                                                    {item.message}
                                                </button>
                                            </td>
                                            <td>
                                                <span className={`fb2-pill ${archived ? "archived" : "active"}`}>
                                                    {archived ? "Archived" : "Active"}
                                                </span>
                                                {item.repliedAt && <small className="fb2-replied">Replied</small>}
                                            </td>
                                            <td className="fb2-nowrap">{formatDate(item.createdAt)}</td>
                                            <td>{renderActions(item)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && feedback.length > 0 && (
                    <p className="fb2-foot">
                        Showing {shown.length} of {feedback.length}
                        {hasFilters && (
                            <button type="button" onClick={clearFilters}>
                                Clear filters
                            </button>
                        )}
                    </p>
                )}
            </section>

            {selectedFeedback && (
                <div className="feedback-modal-overlay" onClick={() => setSelectedFeedback(null)}>
                    <div
                        className="feedback-modal fb2-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Feedback details"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="fb2-modal-head">
                            <div>
                                <h3>{selectedFeedback.userName || "Unknown user"}</h3>
                                <small>{selectedFeedback.userEmail}</small>
                            </div>
                            <button type="button" className="fb2-close" onClick={() => setSelectedFeedback(null)} aria-label="Close">
                                ✕
                            </button>
                        </div>

                        <div className="fb2-modal-meta">
                            <span className="fb2-role">{ROLE_LABELS[selectedFeedback.role] || selectedFeedback.role}</span>
                            <span>{CATEGORY_LABELS[selectedFeedback.category] || selectedFeedback.category}</span>
                            <Stars rating={Number(selectedFeedback.rating) || 0} />
                            <span className={`fb2-pill ${selectedFeedback.status === "archived" ? "archived" : "active"}`}>
                                {selectedFeedback.status === "archived" ? "Archived" : "Active"}
                            </span>
                        </div>

                        <p className="fb2-modal-msg">{selectedFeedback.message}</p>

                        <small className="fb2-muted">Submitted {formatDate(selectedFeedback.createdAt, true)}</small>

                        <div className="fb2-reply">
                            <label htmlFor="fb2-reply-text">
                                {selectedFeedback.repliedAt ? "Your reply" : "Reply"}
                                {selectedFeedback.repliedAt && (
                                    <small>
                                        {" "}· sent {formatDate(selectedFeedback.repliedAt, true)}
                                        {selectedFeedback.repliedByName ? ` by ${selectedFeedback.repliedByName}` : ""}
                                    </small>
                                )}
                            </label>
                            <textarea
                                id="fb2-reply-text"
                                rows={3}
                                maxLength={2000}
                                value={replyText}
                                placeholder={`Write a reply to ${selectedFeedback.userName || "the user"}...`}
                                onChange={(event) => {
                                    setReplyText(event.target.value);
                                    setNotice("");
                                }}
                            />
                            <div className="fb2-reply-foot">
                                <small>Sent to {selectedFeedback.userEmail || "the user"} by email, plus a notification in RescueBase.</small>
                                <button
                                    type="button"
                                    className="fb2-send"
                                    disabled={replying || !replyText.trim() || replyText.trim() === (selectedFeedback.reply || "")}
                                    onClick={sendReply}
                                >
                                    {replying ? "Sending..." : selectedFeedback.repliedAt ? "Send updated reply" : "Send reply"}
                                </button>
                            </div>
                            {notice && <p className="fb2-notice">{notice}</p>}
                        </div>

                        <div className="fb2-modal-actions">{renderActions(selectedFeedback)}</div>
                    </div>
                </div>
            )}
        </section>
    );
}
