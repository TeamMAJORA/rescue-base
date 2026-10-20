import { useEffect, useMemo, useState } from "react";
import { FACTORS, calculateRecommendation } from "../../../../utils/matchScore";

const API = import.meta.env.VITE_BACKEND_URL;

const APPLICATION_LABELS = {
    pending: "Under review",
    interview_scheduled: "Interview set",
    interview_completed: "Interview done",
    approved: "Approved",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
};

// Human-readable answers for the "View answers" window
const ANSWER_GROUPS = [
    {
        title: "Pet preferences",
        rows: [
            ["Pet type", "preferredPetType"],
            ["Size", "preferredSize"],
        ],
    },
    {
        title: "Home & household",
        rows: [
            ["Home type", "homeType"],
            ["Home ownership", "homeOwnership"],
            ["Children at home", "hasChildren"],
            ["Other pets", "hasOtherPets"],
        ],
    },
    {
        title: "Experience & time",
        rows: [
            ["Pet experience", "petExperience"],
            ["Hours available daily", "dailyAvailableHours"],
            ["Exercise", "exerciseFrequency"],
            ["Willing to train", "willingToTrain"],
        ],
    },
];

function getInitials(name) {
    return String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("");
}

function shortDate(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function longDate(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function quizDate(response) {
    return response.completedAt || response.createdAt;
}

export default function MatchingQuizResults() {
    const [responses, setResponses] = useState([]);
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [sort, setSort] = useState({ key: "score", desc: true });

    function toggleSort(key) {
        setSort((current) =>
            current.key === key ? { key, desc: !current.desc } : { key, desc: true }
        );
    }
    const [viewing, setViewing] = useState(null);

    async function loadData() {
        const token = localStorage.getItem("token");

        try {
            setLoading(true);
            setError("");

            const [responseRes, animalRes] = await Promise.all([
                fetch(`${API}/api/matchmaking/responses`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${API}/api/animals?availabilityStatus=available&adoptionStatus=available`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const responseData = await responseRes.json();
            const animalData = await animalRes.json();

            if (!responseRes.ok || !responseData.success) {
                throw new Error(responseData.message || "Failed to load quiz responses.");
            }

            setResponses(Array.isArray(responseData.responses) ? responseData.responses : []);
            setAnimals(Array.isArray(animalData.animals) ? animalData.animals : []);
        } catch (loadError) {
            console.error(loadError);
            setError(loadError.message || "Unable to load quiz responses.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    // Close the answers window with Esc
    useEffect(() => {
        if (!viewing) return undefined;

        function handleKey(event) {
            if (event.key === "Escape") setViewing(null);
        }

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [viewing]);

    // Same scoring as the adopter's Recommendations page, best match first
    const rows = useMemo(() => {
        return responses
            .map((response) => {
                const matches = animals
                    .map((animal) => calculateRecommendation(animal, response))
                    .sort((a, b) => b.score - a.score);

                return { response, matches, top: matches[0] || null };
            })
            .sort((a, b) => {
                const difference =
                    sort.key === "score"
                        ? (a.top?.score ?? -1) - (b.top?.score ?? -1)
                        : new Date(quizDate(a.response)) - new Date(quizDate(b.response));
                return sort.desc ? -difference : difference;
            });
    }, [responses, animals, sort]);

    const appliedCount = rows.filter((row) => row.response.latestApplication).length;
    const averageTop = rows.filter((row) => row.top).length
        ? Math.round(
            rows.filter((row) => row.top).reduce((sum, row) => sum + row.top.score, 0) /
            rows.filter((row) => row.top).length
        )
        : 0;

    return (
        <section className="admin-quiz-page">
            <section className="admin-quiz-stats">
                <article className="admin-panel admin-quiz-stat-card">
                    <span>Adopters who took the quiz</span>
                    <strong>{rows.length}</strong>
                </article>

                <article className="admin-panel admin-quiz-stat-card">
                    <span>Have applied</span>
                    <strong>{appliedCount}</strong>
                </article>

                <article className="admin-panel admin-quiz-stat-card">
                    <span>Average best match</span>
                    <strong>{averageTop}%</strong>
                </article>
            </section>

            <section className="admin-panel admin-quiz-list-panel">
                <div className="aqr-head">
                    <div>
                        <h2>Matching Quiz Results</h2>
                        <p>
                            Each adopter&apos;s latest quiz and the animal they match best.
                            Scores are advisory only; staff decide after the interview.
                        </p>
                    </div>

                    <button type="button" className="aqr-refresh" onClick={loadData} disabled={loading}>
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                {loading ? (
                    <p className="admin-empty">Loading quiz results...</p>
                ) : error ? (
                    <p className="admin-empty">{error}</p>
                ) : rows.length === 0 ? (
                    <p className="admin-empty">No adopter has taken the matchmaking quiz yet.</p>
                ) : (
                    <div className="aqr-table">
                        <div className="aqr-row aqr-labels">
                            <span>Applicant</span>
                            <span>Top match</span>
                            <button
                                type="button"
                                className={`aqr-sort ${sort.key === "score" ? "is-active" : ""}`}
                                onClick={() => toggleSort("score")}
                            >
                                Score {sort.key === "score" ? (sort.desc ? "↓" : "↑") : ""}
                            </button>
                            <span>Latest application</span>
                            <button
                                type="button"
                                className={`aqr-sort ${sort.key === "date" ? "is-active" : ""}`}
                                onClick={() => toggleSort("date")}
                            >
                                Date {sort.key === "date" ? (sort.desc ? "↓" : "↑") : ""}
                            </button>
                            <span />
                        </div>

                        {rows.map(({ response, top }) => {
                            const application = response.latestApplication;

                            return (
                                <div className="aqr-row" key={response._id}>
                                    <div className="aqr-person">
                                        <span className="aqr-avatar">{getInitials(response.adopterName)}</span>
                                        <div>
                                            <b>{response.adopterName || "Adopter"}</b>
                                            <small>{response.adopterEmail || "No email"}</small>
                                        </div>
                                    </div>

                                    <div className="aqr-match" data-label="Top match">
                                        {top ? (
                                            <>
                                                <span className="aqr-thumb">
                                                    {top.pet.image ? (
                                                        <img src={top.pet.image} alt={top.pet.name} />
                                                    ) : (
                                                        <img className="is-placeholder" src="/icons/brown paw.svg" alt="" />
                                                    )}
                                                </span>
                                                <b>{top.pet.name}</b>
                                            </>
                                        ) : (
                                            <small className="aqr-muted">No available animals</small>
                                        )}
                                    </div>

                                    <div className={`aqr-scorecell ${top ? top.tier.key : ""}`} data-label="Score">
                                        {top ? (
                                            <>
                                                <b>{top.score}%</b>
                                                <span className="aqr-bar">
                                                    <i style={{ width: `${top.score}%` }} />
                                                </span>
                                            </>
                                        ) : (
                                            <small className="aqr-muted">—</small>
                                        )}
                                    </div>

                                    <div className="aqr-app" data-label="Latest application">
                                        {application ? (
                                            <>
                                                <span className={`aqr-pill is-${application.status}`}>
                                                    {APPLICATION_LABELS[application.status] || application.status}
                                                </span>
                                                <b>{application.petName}</b>
                                            </>
                                        ) : (
                                            <small className="aqr-muted">No application yet</small>
                                        )}
                                    </div>

                                    <span className="aqr-date" data-label="Date">
                                        {shortDate(quizDate(response))}
                                    </span>

                                    <button
                                        type="button"
                                        className="aqr-view"
                                        onClick={() => setViewing(response)}
                                    >
                                        View answers
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {viewing && (() => {
                const row = rows.find((item) => item.response._id === viewing._id);

                return (
                    <div className="aqr-overlay" onClick={() => setViewing(null)}>
                        <section
                            className="aqr-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="aqr-modal-title"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <header className="aqr-modal-head">
                                <span className="aqr-avatar is-large">{getInitials(viewing.adopterName)}</span>
                                <div>
                                    <small>Quiz answers</small>
                                    <h2 id="aqr-modal-title">{viewing.adopterName || "Adopter"}</h2>
                                    <p>{viewing.adopterEmail} · {longDate(quizDate(viewing))}</p>
                                </div>
                                <button
                                    type="button"
                                    className="aqr-close"
                                    onClick={() => setViewing(null)}
                                    aria-label="Close"
                                >
                                    ×
                                </button>
                            </header>

                            <div className="aqr-modal-body">
                                {ANSWER_GROUPS.map((group) => (
                                    <article className="aqr-group" key={group.title}>
                                        <h3>{group.title}</h3>
                                        <dl>
                                            {group.rows.map(([label, key]) => (
                                                <div key={key}>
                                                    <dt>{label}</dt>
                                                    <dd>{viewing[key] || "—"}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </article>
                                ))}

                                <article className="aqr-group is-wide">
                                    <h3>Behavior preferences (1 = low, 5 = high)</h3>
                                    <div className="aqr-ratings">
                                        {FACTORS.map((factor) => {
                                            const value = Number(viewing[factor.quizKey]) || 0;

                                            return (
                                                <div key={factor.key}>
                                                    <span>{factor.label}</span>
                                                    <span className="aqr-dots" aria-label={`${value} of 5`}>
                                                        {[1, 2, 3, 4, 5].map((dot) => (
                                                            <i key={dot} className={dot <= value ? "is-on" : ""} />
                                                        ))}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </article>

                                {row?.matches.length > 0 && (
                                    <article className="aqr-group is-wide">
                                        <h3>Top matches right now (advisory)</h3>
                                        <ol className="aqr-top">
                                            {row.matches.slice(0, 3).map((match) => (
                                                <li key={match.pet._id}>
                                                    <b>{match.pet.name}</b>
                                                    <small>{match.pet.type} · {match.pet.breed || "Unknown breed"}</small>
                                                    <span className={`aqr-score ${match.tier.key}`}>{match.score}%</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </article>
                                )}
                            </div>
                        </section>
                    </div>
                );
            })()}
        </section>
    );
}