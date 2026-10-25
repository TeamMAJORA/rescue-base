import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

const TABS = [
    { key: "waiting", label: "Waiting" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
];

// Application status → tab (withdrawn applications are left out)
const STATUS_TAB = {
    pending: "waiting",
    interview_scheduled: "waiting",
    interview_completed: "waiting",
    approved: "approved",
    rejected: "rejected",
};

function getInitials(name) {
    return String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("");
}

function scoreTone(score) {
    if (score === null) return "is-none";
    if (score >= 80) return "is-high";
    if (score >= 60) return "is-mid";
    return "is-low";
}

function shortDate(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Recommendations() {
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("waiting");

    useEffect(() => {
        fetch(`${API}/api/matchmaking/responses`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
            .then((response) => response.json())
            .then((data) => {
                if (!data.success) throw new Error(data.message || "Failed to load matches.");
                setResponses(data.responses || []);
            })
            .catch((loadError) => setError(loadError.message || "Failed to load matches."))
            .finally(() => setLoading(false));
    }, []);

    // Adopters who took the quiz AND applied, with the AI score for the pet they applied for
    const rows = useMemo(() => {
        return responses
            .filter((response) => STATUS_TAB[response.latestApplication?.status])
            .map((response) => {
                const application = response.latestApplication;

                return {
                    id: response._id,
                    adopterName: response.adopterName || "Adopter",
                    petName: application.petName || "Unnamed pet",
                    appliedAt: application.createdAt,
                    tab: STATUS_TAB[application.status],
                    score: response.appliedScore == null ? null : Math.floor(response.appliedScore),
                    scoreNote: response.appliedScoreNote,
                };
            });
    }, [responses]);

    const stats = useMemo(() => {
        const count = (tab) => rows.filter((row) => row.tab === tab).length;
        const scored = rows.filter((row) => row.score !== null);

        return {
            waiting: count("waiting"),
            approved: count("approved"),
            rejected: count("rejected"),
            averageMatch: scored.length
                ? Math.round(scored.reduce((sum, row) => sum + row.score, 0) / scored.length)
                : null,
        };
    }, [rows]);

    const visible = rows.filter((row) =>
        row.tab === activeTab &&
        `${row.adopterName} ${row.petName}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())
    );

    return (
        <section className="admin-recommendation-page">
            <div className="um-strip">
                <div className="um-strip-total">
                    <b>{stats.waiting}</b>
                    <small>Waiting for review</small>
                </div>
                <div>
                    <small>Approved</small>
                    <b>{stats.approved}</b>
                </div>
                <div>
                    <small>Rejected</small>
                    <b>{stats.rejected}</b>
                </div>
                <div>
                    <small>Average match</small>
                    <b>{stats.averageMatch === null ? "—" : `${stats.averageMatch}%`}</b>
                </div>
            </div>

            <section className="admin-recommendation-grid">
                <section className="admin-panel admin-recommendation-list-panel">
                    <h2 className="arec-title">AI matches to review</h2>

                    <input
                        type="search"
                        className="arec-search"
                        placeholder="Search adopter or pet..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        aria-label="Search adopter or pet"
                    />

                    <div className="arec-tabs" role="tablist">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                className={activeTab === tab.key ? "is-active" : ""}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                                {activeTab === tab.key && ` ${stats[tab.key]}`}
                            </button>
                        ))}
                    </div>

                    <div className="arec-list">
                        {loading ? (
                            <p className="arec-empty">Loading matches...</p>
                        ) : error ? (
                            <p className="arec-empty">{error}</p>
                        ) : visible.length === 0 ? (
                            <p className="arec-empty">No applicants here.</p>
                        ) : (
                            visible.map((row) => (
                                <article className="arec-row" key={row.id}>
                                    <span className="arec-avatar">{getInitials(row.adopterName)}</span>

                                    <div className="arec-info">
                                        <b>{row.adopterName}</b>
                                        <small>
                                            {row.petName}
                                            {row.appliedAt && ` · applied ${shortDate(row.appliedAt)}`}
                                        </small>
                                    </div>

                                    <span
                                        className={`arec-score ${scoreTone(row.score)}`}
                                        title={row.score === null ? row.scoreNote : undefined}
                                    >
                                        {row.score === null ? "—" : `${row.score}%`}
                                    </span>
                                </article>
                            ))
                        )}
                    </div>
                </section>
            </section>
        </section>
    );
}