import { useEffect, useMemo, useState } from "react";
import { FACTORS } from "../../../../utils/matchScore";

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

const STATUS_LABELS = {
    pending: "Under review",
    interview_scheduled: "Interview set",
    interview_completed: "Interview done",
    approved: "Approved",
    rejected: "Rejected",
};

const LEVELS = ["", "very low", "low", "moderate", "high", "very high"];

// Quiz answers shown in the adopter card
const PROFILE_FIELDS = [
    ["Home", (quiz) => [quiz.homeType, quiz.homeOwnership].filter(Boolean).join(", ")],
    ["Experience", (quiz) => quiz.petExperience],
    ["Lifestyle", (quiz) => quiz.exerciseFrequency],
    ["Children at home", (quiz) => quiz.hasChildren],
    ["Hours available", (quiz) => quiz.dailyAvailableHours && `${quiz.dailyAvailableHours} hrs`],
    ["Other pets", (quiz) => quiz.hasOtherPets],
    ["Willing to train", (quiz) => quiz.willingToTrain],
    ["Prefers", (quiz) => [quiz.preferredPetType, quiz.preferredSize].filter(Boolean).join(", ")],
];

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

// "Why this match works": 2 best-matching factors (green) + weakest factor and conflicts (orange)
function buildReasons(factors, conflicts, petName) {
    if (!factors) return [];

    const scored = FACTORS
        .map((factor) => ({ ...factor, ...factors[factor.key] }))
        .filter((factor) => factor.similarity !== null && factor.similarity !== undefined)
        .sort((a, b) => b.similarity - a.similarity);

    const describe = (factor) =>
        factor.type === "tolerance"
            ? `Can handle ${LEVELS[factor.adopterValue]}; ${petName} is ${LEVELS[factor.animalValue]}.`
            : `Wants ${LEVELS[factor.adopterValue]}; ${petName} is ${LEVELS[factor.animalValue]}.`;

    const good = scored
        .filter((factor) => factor.similarity >= 0.75)
        .slice(0, 2)
        .map((factor) => ({ tone: "is-good", title: factor.label, text: describe(factor) }));

    const weakest = scored.filter((factor) => factor.similarity < 0.75).slice(-1);

    const checks = [
        ...conflicts.map((text) => ({ tone: "is-check", title: "Check", text })),
        ...weakest.map((factor) => ({ tone: "is-check", title: `Check: ${factor.label}`, text: describe(factor) })),
    ];

    return [...good, ...checks].slice(0, 4);
}

export default function Recommendations() {
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("waiting");
    const [selectedId, setSelectedId] = useState(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [actionError, setActionError] = useState("");

    function loadData() {
        setLoading(true);

        return fetch(`${API}/api/matchmaking/responses`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
            .then((response) => response.json())
            .then((data) => {
                if (!data.success) throw new Error(data.message || "Failed to load matches.");
                setResponses(data.responses || []);
                setError("");
            })
            .catch((loadError) => setError(loadError.message || "Failed to load matches."))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadData();
    }, []);

    // Adopters who took the quiz AND applied, with the AI score for the pet they applied for
    const rows = useMemo(() => {
        return responses
            .filter((response) => STATUS_TAB[response.latestApplication?.status])
            .map((response) => {
                const application = response.latestApplication;

                return {
                    id: response._id,
                    response,
                    application,
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

    // Fall back to the first card when nothing (or a hidden card) is selected
    const selected = visible.find((row) => row.id === selectedId) || visible[0] || null;

    function selectRow(id) {
        setSelectedId(id);
        setRejecting(false);
        setRejectReason("");
        setActionError("");
    }

    async function updateStatus(status, reviewNotes = "") {
        try {
            setSaving(true);
            setActionError("");

            const response = await fetch(`${API}/api/adoptions/${selected.application._id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ status, reviewNotes }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to update the application.");
            }

            setRejecting(false);
            setRejectReason("");
            await loadData();
        } catch (updateError) {
            setActionError(updateError.message || "Failed to update the application.");
        } finally {
            setSaving(false);
        }
    }

    const pet = selected?.response.appliedAnimal;
    const reasons = selected
        ? buildReasons(selected.response.appliedFactors, selected.response.appliedConflicts || [], selected.petName)
        : [];
    const otherMatches = selected
        ? (selected.response.aiMatches || [])
            .filter((match) =>
                match.score !== null &&
                String(match.animalId) !== String(selected.application.animalId)
            )
            .slice(0, 3)
        : [];
    const canApprove = selected?.application.status === "interview_completed";
    const isOpen = selected?.tab === "waiting";

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
                        {loading && rows.length === 0 ? (
                            <p className="arec-empty">Loading matches...</p>
                        ) : error ? (
                            <p className="arec-empty">{error}</p>
                        ) : visible.length === 0 ? (
                            <p className="arec-empty">No applicants here.</p>
                        ) : (
                            visible.map((row) => (
                                <button
                                    type="button"
                                    className={`arec-row ${row.id === selected?.id ? "is-selected" : ""}`}
                                    key={row.id}
                                    onClick={() => selectRow(row.id)}
                                    aria-pressed={row.id === selected?.id}
                                >
                                    <span className="arec-avatar">{getInitials(row.adopterName)}</span>

                                    <span className="arec-info">
                                        <b>{row.adopterName}</b>
                                        <small>
                                            {row.petName}
                                            {row.appliedAt && ` · applied ${shortDate(row.appliedAt)}`}
                                        </small>
                                    </span>

                                    <span
                                        className={`arec-score ${scoreTone(row.score)}`}
                                        title={row.score === null ? row.scoreNote : undefined}
                                    >
                                        {row.score === null ? "—" : `${row.score}%`}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </section>

                {selected && (
                    <section className="arec-detail">
                        {/* Adopter + quiz answers */}
                        <article className="admin-panel arec-adopter">
                            <header>
                                <span className="arec-avatar is-large">{getInitials(selected.adopterName)}</span>
                                <div>
                                    <h3>{selected.adopterName}</h3>
                                    <small>{selected.response.adopterEmail}</small>
                                </div>
                                <span className="arec-app-tag">
                                    {STATUS_LABELS[selected.application.status]} · Applied {shortDate(selected.appliedAt)}
                                </span>
                            </header>

                            <dl className="arec-profile">
                                {PROFILE_FIELDS.map(([label, read]) => (
                                    <div key={label}>
                                        <dt>{label}</dt>
                                        <dd>{read(selected.response) || "—"}</dd>
                                    </div>
                                ))}
                            </dl>
                        </article>

                        {/* Pet they applied for + score */}
                        <article className="arec-pet">
                            <span className="arec-pet-photo">
                                {pet?.image ? (
                                    <img src={pet.image} alt={selected.petName} />
                                ) : (
                                    <img className="is-placeholder" src="/icons/brown paw.svg" alt="" />
                                )}
                            </span>

                            <div className="arec-pet-info">
                                <small>Applied for</small>
                                <h3>{selected.petName}</h3>
                                <p>
                                    {[pet?.breed, pet?.age, pet?.gender].filter(Boolean).join(" · ") || "No pet details"}
                                </p>
                                {pet?.adoptionStatus && (
                                    <span className={`arec-pet-status ${pet.adoptionStatus === "available" ? "is-available" : ""}`}>
                                        {pet.adoptionStatus}
                                    </span>
                                )}
                            </div>

                            <div className="arec-pet-score">
                                <strong>{selected.score === null ? "—" : `${selected.score}%`}</strong>
                                <small>{selected.score === null ? selected.scoreNote : "AI match score"}</small>
                            </div>
                        </article>

                        {/* Reasons + other matches */}
                        <article className="admin-panel arec-why">
                            <h3>Why this match works</h3>

                            {reasons.length > 0 ? (
                                <div className="arec-reasons">
                                    {reasons.map((reason) => (
                                        <div className={`arec-reason ${reason.tone}`} key={reason.title + reason.text}>
                                            <b>{reason.title}</b>
                                            <p>{reason.text}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="arec-empty">No behavior ratings to compare yet.</p>
                            )}

                            <p className="arec-note">
                                Score from the matchmaking model. Reasons compare the adopter&apos;s quiz
                                answers with the pet&apos;s behavior ratings. Advisory only.
                            </p>

                            {otherMatches.length > 0 && (
                                <div className="arec-others">
                                    {otherMatches.map((match) => (
                                        <div key={match.animalId}>
                                            <span>{match.name} · {match.type}</span>
                                            <b>{Math.floor(match.score)}%</b>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </article>

                        {/* Actions (only while the application is still open) */}
                        {isOpen && (
                            <div className="arec-actions">
                                {actionError && <p className="arec-action-error">{actionError}</p>}

                                {rejecting ? (
                                    <>
                                        <textarea
                                            className="arec-reject-reason"
                                            placeholder="Reason for rejecting (required)"
                                            value={rejectReason}
                                            onChange={(event) => setRejectReason(event.target.value)}
                                            aria-label="Rejection reason"
                                        />
                                        <div className="arec-action-buttons">
                                            <button type="button" className="arec-btn" onClick={() => setRejecting(false)} disabled={saving}>
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="arec-btn is-danger"
                                                onClick={() => updateStatus("rejected", rejectReason.trim())}
                                                disabled={saving || !rejectReason.trim()}
                                            >
                                                {saving ? "Rejecting..." : "Confirm reject"}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="arec-action-buttons">
                                        <button type="button" className="arec-btn is-danger" onClick={() => setRejecting(true)} disabled={saving}>
                                            Reject match
                                        </button>
                                        <button
                                            type="button"
                                            className="arec-btn is-primary"
                                            onClick={() => updateStatus("approved")}
                                            disabled={saving || !canApprove}
                                            title={canApprove ? undefined : "Complete the interview first (Adoption Applications)"}
                                        >
                                            {saving ? "Saving..." : "Approve match"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                )}
            </section>
        </section>
    );
}
