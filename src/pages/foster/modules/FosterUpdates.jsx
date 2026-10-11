import { useEffect, useState } from "react";

// Behavior Evaluation — foster rates the pet, admin reviews and accepts

const API = import.meta.env.VITE_BACKEND_URL;

const SCORE_LABELS = { 1: "Very low", 2: "Low", 3: "Moderate", 4: "High", 5: "Very high" };

// tone: "good" = higher is better, "care" = higher needs care, "neutral" = neither
const TRAIT_GROUPS = [
    {
        title: "Temperament",
        traits: [
            { key: "energyLevel", label: "Energy Level", question: "How much energy does {name} show day to day?", low: "Very calm", high: "Very energetic", tone: "neutral" },
            { key: "activityLevel", label: "Activity Level", question: "How much play and exercise does {name} need?", low: "Mostly resting", high: "Always moving", tone: "neutral" },
            { key: "anxietyLevel", label: "Anxiety Level", question: "How easily does {name} get scared or stressed?", low: "Relaxed", high: "Very anxious", tone: "care" },
            { key: "aggressionLevel", label: "Aggression Level", question: "Does {name} growl, snap, or guard things?", low: "Gentle", high: "Reactive", tone: "care" },
        ],
    },
    {
        title: "Social & Learning",
        traits: [
            { key: "friendliness", label: "Friendliness", question: "How warm is {name} toward people?", low: "Reserved", high: "Very friendly", tone: "good" },
            { key: "humanSociability", label: "Human Sociability", question: "How comfortable is {name} with strangers and kids?", low: "Shy", high: "Loves people", tone: "good" },
            { key: "animalSociability", label: "Animal Sociability", question: "How does {name} get along with other animals?", low: "Prefers alone", high: "Loves company", tone: "good" },
            { key: "trainability", label: "Trainability", question: "How quickly does {name} learn routines?", low: "Stubborn", high: "Eager learner", tone: "good" },
        ],
    },
];

const TRAITS = TRAIT_GROUPS.flatMap((g) => g.traits);

const initialEvaluation = {
    energyLevel: null,
    friendliness: null,
    humanSociability: null,
    animalSociability: null,
    trainability: null,
    anxietyLevel: null,
    aggressionLevel: null,
    activityLevel: null,
    notes: "",
};

function isRated(value) {
    const n = Number(value);
    return value !== null && value !== "" && value !== undefined && n >= 1 && n <= 5;
}

function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TraitScale({ trait, value, name, disabled, onChange }) {
    const score = Number(value);
    const rated = isRated(value);

    return (
        <div className={`ao-trait ${trait.tone}${rated ? "" : " empty"}`}>
            <div className="ao-trait-top">
                <b>{trait.label}</b>
                <span className="ao-trait-value">
                    {rated ? `${SCORE_LABELS[score]} (${score}/5)` : "Not rated yet"}
                </span>
            </div>
            <p className="ao-trait-question">{trait.question.replace("{name}", name || "the pet")}</p>

            <div className="ao-trait-scale" role="radiogroup" aria-label={trait.label}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={score === n}
                        aria-label={`${n} – ${SCORE_LABELS[n]}`}
                        className={rated && n === score ? "current" : rated && n < score ? "on" : ""}
                        disabled={disabled}
                        onClick={() => onChange(trait.key, n)}
                    >
                        {n}
                    </button>
                ))}
            </div>

            <div className="ao-trait-ends">
                <span>{trait.low}</span>
                <span>{trait.high}</span>
            </div>
        </div>
    );
}


// Shown when the foster has no active assignment, so the page layout still appears
const EMPTY_ASSIGNMENT = {
    _id: "",
    petName: "your foster pet",
    updates: [],
    medicalRequests: [],
    behaviorEvaluation: null,
};

export default function FosterUpdates({ assignment: assignedPet, refreshAssignment }) {
    const hasAssignment = Boolean(assignedPet);
    const assignment = assignedPet || EMPTY_ASSIGNMENT;
    const NO_ASSIGNMENT_TEXT = "Once the shelter assigns you a pet, you can rate their behavior here.";

    const token = localStorage.getItem("token");

    const [evaluation, setEvaluation] = useState(initialEvaluation);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("success");

    useEffect(() => {
        setMessage("");
        const saved = assignment?.behaviorEvaluation;

        if (saved) {
            const next = { notes: saved.notes || "" };
            TRAITS.forEach((t) => {
                next[t.key] = saved[t.key] ?? null;
            });
            setEvaluation(next);
        } else {
            setEvaluation(initialEvaluation);
        }
    }, [assignment]);


    const status = assignment.behaviorEvaluation?.status || "not_submitted";
    const locked = !hasAssignment || status === "pending" || status === "accepted";
    const ratedCount = TRAITS.filter((t) => isRated(evaluation[t.key])).length;
    const allRated = ratedCount === TRAITS.length;
    const name = assignment.petName;

    function rate(key, value) {
        setEvaluation((current) => ({ ...current, [key]: value }));
        if (messageType === "error") setMessage("");
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!allRated) {
            setMessage(`Please rate all ${TRAITS.length} traits (${ratedCount} rated so far).`);
            setMessageType("error");
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            const body = { notes: evaluation.notes.trim() };
            TRAITS.forEach((t) => {
                body[t.key] = Number(evaluation[t.key]);
            });

            const response = await fetch(
                `${API}/api/foster/assignments/${assignment._id}/behavior-evaluation`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Unable to submit the evaluation.");
            }

            setMessage("Evaluation sent. The shelter will review it soon.");
            setMessageType("success");
            await refreshAssignment?.();
        } catch (error) {
            setMessage(error.message || "Server error.");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    }

    // Steps: 1 Fill in ratings → 2 Submit for review → 3 Admin accepts
    const step1 = locked || allRated ? "done" : "current";
    const step2 = locked ? "done" : allRated ? "current" : "";
    const step3 = status === "accepted" ? "done" : status === "pending" ? "current" : "";

    const banners = {
        pending: {
            tone: "orange",
            title: "Waiting for admin review",
            text: `The shelter is checking your ratings for ${name}. You can't edit them while they're being reviewed.`,
        },
        accepted: {
            tone: "green",
            title: "Accepted by the shelter",
            text: `Thank you! Your evaluation of ${name} was accepted${assignment.behaviorEvaluation?.reviewedAt ? ` on ${formatDate(assignment.behaviorEvaluation.reviewedAt)}` : ""}.`,
        },
        revision: {
            tone: "red",
            title: "Admin asked for a revision",
            text: "Please re-check your ratings and submit again.",
        },
    };
    const banner = banners[status];

    return (
        <section className="ao-page">
            {!hasAssignment && (
                <div className="ao-banner orange">
                    <svg className="ao-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4M12 16v.01" />
                    </svg>
                    <div>
                        <b>No foster pet assigned yet</b>
                        {NO_ASSIGNMENT_TEXT}
                    </div>
                </div>
            )}
            <section className="ao-card">
                <h2>Behavior Evaluation</h2>
                <p className="ao-hint">
                    You know {name} best at home. Rate what you've seen — the shelter reviews it before it
                    appears on {name}'s adoption profile.
                </p>

                <div className="ao-steps">
                    <div className={`ao-step ${step1}`}><b>{step1 === "done" ? "✓" : 1}</b>Fill in ratings</div>
                    <span className={`ao-step-line ${step1 === "done" ? "done" : ""}`} />
                    <div className={`ao-step ${step2}`}><b>{step2 === "done" ? "✓" : 2}</b>Submit for review</div>
                    <span className={`ao-step-line ${step2 === "done" ? "done" : ""}`} />
                    <div className={`ao-step ${step3}`}><b>{step3 === "done" ? "✓" : 3}</b>Admin accepts</div>
                </div>

                {banner && (
                    <div className={`ao-banner ${banner.tone}`}>
                        <svg className="ao-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            {status === "accepted" ? <path d="M20 6 9 17l-5-5" /> : <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
                        </svg>
                        <div>
                            <b>{banner.title}</b>
                            {banner.text}
                        </div>
                    </div>
                )}

                {hasAssignment && (
                <div className="ao-petcard">
                    <div className="ao-avatar">
                        {assignment.petImage ? <img src={assignment.petImage} alt="" /> : "🐾"}
                    </div>
                    <div>
                        <b>{name}</b>
                        <span>
                            {assignment.petBreed ? `${assignment.petBreed} · ` : ""}
                            Fostered since {formatDate(assignment.startDate || assignment.createdAt)}
                        </span>
                    </div>
                </div>
                )}

                <form className="ao-form" onSubmit={handleSubmit}>
                        <fieldset className="ao-fieldset" disabled={!hasAssignment}>
                    <div className="ao-progress">
                        <span>{ratedCount} of {TRAITS.length} traits rated</span>
                        <div className="ao-progress-track">
                            <i style={{ width: `${(ratedCount / TRAITS.length) * 100}%` }} />
                        </div>
                    </div>

                    <div className="ao-legend">
                        <span><i className="good" />Higher is better</span>
                        <span><i className="care" />Higher needs care</span>
                        <span><i className="neutral" />Neither good nor bad</span>
                    </div>

                    <div className="ao-trait-groups">
                        {TRAIT_GROUPS.map((group) => (
                            <div key={group.title}>
                                <h4 className="ao-group-title">{group.title}</h4>
                                {group.traits.map((trait) => (
                                    <TraitScale
                                        key={trait.key}
                                        trait={trait}
                                        value={evaluation[trait.key]}
                                        name={name}
                                        disabled={locked}
                                        onChange={rate}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>

                    {message && <div className={`ao-alert ${messageType}`}>{message}</div>}

                    <div className="ao-assess-foot">
                        <label className="ao-field">
                            <span>Behavior Notes <span className="ao-req">*</span></span>
                            <textarea
                                value={evaluation.notes}
                                onChange={(e) => setEvaluation((c) => ({ ...c, notes: e.target.value }))}
                                placeholder="Habits, triggers, how they act with people and other pets..."
                                disabled={locked}
                                required
                            />
                        </label>

                        <div className="ao-form-actions">
                            {!locked && (
                                <button type="submit" className="ao-btn primary" disabled={loading}>
                                    {loading ? "Sending..." : "Submit for Review"}
                                </button>
                            )}
                        </div>
                    </div>
                </fieldset>
                    </form>
            </section>
        </section>
    );
}
