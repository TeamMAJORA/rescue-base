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

const TRAIT_GROUPS = [
    {
        title: "Temperament",
        traits: [
            { key: "energyLevel", label: "Energy Level", desc: "How much energy it shows day to day", low: "Very calm", high: "Very energetic" },
            { key: "activityLevel", label: "Activity Level", desc: "How active it is during play and walks", low: "Mostly resting", high: "Always on the move" },
            { key: "anxietyLevel", label: "Anxiety Level", desc: "How nervous or fearful it gets", low: "Relaxed", high: "Very anxious" },
            { key: "aggressionLevel", label: "Aggression Level", desc: "Growling, snapping or guarding", low: "Not aggressive", high: "Very aggressive" },
        ],
    },
    {
        title: "Social and Learning",
        traits: [
            { key: "friendliness", label: "Friendliness", desc: "Overall warmth toward others", low: "Aloof", high: "Very friendly" },
            { key: "humanSociability", label: "Human Sociability", desc: "Comfort around people", low: "Avoids people", high: "Loves people" },
            { key: "animalSociability", label: "Animal Sociability", desc: "Comfort around other animals", low: "Avoids animals", high: "Loves other animals" },
            { key: "trainability", label: "Trainability", desc: "How quickly it learns commands", low: "Hard to train", high: "Learns quickly" },
        ],
    },
];


function TraitBar({ trait, value }) {
    const score = Number(value) || 0;
    return (
        <div className="pp-trait">
            <div className="pp-trait-head">
                <span className="pp-trait-name">{trait.label}</span>
                {score > 0 && <span className="pp-badge">{score} · {LEVEL_LABEL[score]}</span>}
            </div>
            <div className="pp-trait-desc">{trait.desc}</div>
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
                    {error ? `🐾 ${error}` : "Loading..."}
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
                        <span className="pp-loc">📍 {animal.location || "RescueBase Shelter"}</span>
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
                                {personality.map((tag, i) => (
                                    <span key={tag} className={`pp-chip ${i % 2 ? "pink" : ""}`}>{tag}</span>
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
                    <div className="pp-brand">🐾 RescueBase</div>
                    <h2 className="pp-title">Behavioral Assessment</h2>
                    <p className="pp-intro">
                        Every pet has their own personality. This assessment, based on our shelter staff's daily care
                        and observation, shows how they get along with people and other animals, so you can find a
                        match where you'll both be happy.
                    </p>

                    {hasAssessment ? (
                        <div className="pp-groups">
                            {TRAIT_GROUPS.map((group) => (
                                <div key={group.title}>
                                    <div className="pp-group-title">{group.title}</div>
                                    {group.traits.map((t) => (
                                        <TraitBar key={t.key} trait={t} value={animal[t.key]} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="pp-empty">Not assessed yet. Our staff are still getting to know {animal.name}.</p>
                    )}

                    <div className="pp-actions">
                        <button type="button" className="pp-btn primary" onClick={goHome} disabled={status === "adopted"}>
                            Apply to Adopt 🐾
                        </button>
                        <button type="button" className="pp-btn secondary" onClick={goHome}>
                            Donate Shelter 🤲
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
}