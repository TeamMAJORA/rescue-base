import { useEffect, useState } from "react";
import { formatAge } from "../utils/formatAge";
import "../styles/PublicPetProfiles.css";

const API = import.meta.env.VITE_BACKEND_URL;

const STATUS_LABEL = {
    available: "Available for Adoption",
    pending: "Adoption Pending",
    adopted: "Adopted",
};

const LEVEL_LABEL = { 1: "Very low", 2: "Low", 3: "Moderate", 4: "High", 5: "Very high" };

// tone: "good" = higher is better, "care" = higher needs care, "neutral" = neither
const TRAIT_GROUPS = [
    {
        title: "Temperament",
        traits: [
            { key: "energyLevel", label: "Energy Level", question: "How much energy does {name} have day to day?", low: "Very calm", high: "Very energetic", tone: "neutral" },
            { key: "activityLevel", label: "Activity Level", question: "How much play and exercise does {name} need?", low: "Mostly resting", high: "Always on the move", tone: "neutral" },
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
            { key: "trainability", label: "Trainability", question: "How quickly does {name} learn routines?", low: "Needs patience", high: "Eager learner", tone: "good" },
        ],
    },
];

function TraitBar({ trait, value, name }) {
    const score = Number(value) || 0;
    return (
        <div className={`pp-trait ${trait.tone}`}>
            <div className="pp-trait-head">
                <span className="pp-trait-name">{trait.label}</span>
                {score > 0 && <span className="pp-badge">{LEVEL_LABEL[score]} ({score}/5)</span>}
            </div>
            <div className="pp-trait-desc">{trait.question.replace("{name}", name)}</div>
            <div className="pp-bar">
                {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className={`pp-seg ${n < score ? "on" : ""} ${n === score ? "current" : ""}`} />
                ))}
            </div>
            <div className="pp-ends"><span>{trait.low}</span><span>{trait.high}</span></div>
        </div>
    );
}

export default function PublicPetProfile({ tagCode }) {
    const [animal, setAnimal] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch(`${API}/api/qr-tags/lookup/${encodeURIComponent(tagCode)}`)
            .then((r) => r.json())
            .then((data) => (data.success ? setAnimal(data.animal) : setError(data.message || "Pet not found.")))
            .catch(() => setError("Could not load pet info."));
    }, [tagCode]);

    if (error || !animal) {
        return (
            <div className="pp-page">
                <div className="pp-card" style={{ maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
                    {error || "Loading..."}
                </div>
            </div>
        );
    }

    const personality = animal.personality?.tags || [];
    const medical = (animal.medicalStatus || "").split(",").map((s) => s.trim()).filter(Boolean);
    const hasAssessment = TRAIT_GROUPS.some((g) => g.traits.some((t) => animal[t.key]));
    const status = animal.adoptionStatus || "available";
    const goHome = () => (window.location.href = "/");

    return (
        <div className="pp-page">
            <div className="pp-wrap">
                {/* LEFT: pet info */}
                <aside className="pp-card">
                    {animal.image ? (
                        <img className="pp-photo" src={animal.image} alt={animal.name} />
                    ) : (
                        <div className="pp-photo" />
                    )}
                    <span className={`pp-status ${status}`}>{STATUS_LABEL[status] || "In Shelter Care"}</span>

                    <div className="pp-name-row">
                        <h1 className="pp-name">{animal.name}</h1>
                        <span className="pp-loc">{animal.location || "RescueBase Shelter"}</span>
                    </div>

                    <div className="pp-facts">
                        <div><div className="pp-label">Species</div><div className="pp-value">{animal.type || "—"}</div></div>
                        <div><div className="pp-label">Breed</div><div className="pp-value">{animal.breed || "—"}</div></div>
                        <div><div className="pp-label">Age</div><div className="pp-value">{formatAge(animal.age)}</div></div>
                        <div><div className="pp-label">Sex</div><div className="pp-value">{animal.gender || "—"}</div></div>
                        <div><div className="pp-label">Size</div><div className="pp-value">{animal.size || "—"}</div></div>
                        <div><div className="pp-label">Color</div><div className="pp-value">{animal.color || "—"}</div></div>
                    </div>

                    {personality.length > 0 && (
                        <div className="pp-section">
                            <div className="pp-label">Personality</div>
                            <div className="pp-chips">
                                {personality.map((tag) => (
                                    <span key={tag} className="pp-chip">{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {medical.length > 0 && (
                        <div className="pp-section">
                            <div className="pp-label">Medical Status</div>
                            <div className="pp-chips">
                                {medical.map((m) => <span key={m} className="pp-chip green">{m}</span>)}
                            </div>
                        </div>
                    )}

                    {animal.description && (
                        <div className="pp-section">
                            <div className="pp-label">Story</div>
                            <p className="pp-story">{animal.description}</p>
                        </div>
                    )}
                </aside>

                {/* RIGHT: behavioral assessment */}
                <main className="pp-card">
                    <div className="pp-brand">RescueBase</div>
                    <h2 className="pp-title">Behavioral Assessment</h2>
                    <p className="pp-intro">
                        Every pet has their own personality. This assessment, based on our shelter staff's daily care
                        and observation, shows how they get along with people and other animals, so you can find a
                        match where you'll both be happy.
                    </p>

                    {hasAssessment ? (
                        <>
                        <div className="pp-legend">
                            <span><i className="good" />Higher is better</span>
                            <span><i className="care" />Higher needs extra care</span>
                            <span><i className="neutral" />Neither good nor bad</span>
                        </div>
                        <div className="pp-groups">
                            {TRAIT_GROUPS.map((group) => (
                                <div key={group.title}>
                                    <div className="pp-group-title">{group.title}</div>
                                    {group.traits.map((t) => (
                                        <TraitBar key={t.key} trait={t} value={animal[t.key]} name={animal.name} />
                                    ))}
                                </div>
                            ))}
                        </div>
                        </>
                    ) : (
                        <p className="pp-empty">Not assessed yet. Our staff are still getting to know {animal.name}.</p>
                    )}

                    <div className="pp-actions">
                        <button type="button" className="pp-btn primary" onClick={goHome}>
                            Apply to Adopt
                        </button>
                        <button type="button" className="pp-btn secondary" onClick={goHome}>
                            Donate to Shelter
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
}