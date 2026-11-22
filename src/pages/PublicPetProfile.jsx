import { useEffect, useState } from "react";
import { formatAge } from "../utils/formatAge";
import { openOnAdopterDashboard } from "../utils/adopterStartPage";
import { getAnimalStatus } from "../utils/petStatus";
import "../styles/PublicPetProfiles.css";

const API = import.meta.env.VITE_BACKEND_URL;
const HEADERS = { "ngrok-skip-browser-warning": "true" };

const STATUS_LABEL = {
    available: "Available for adoption",
    pending: "Adoption pending",
    fostered: "In a foster home",
    adopted: "Adopted",
    unavailable: "In shelter care",
};

const LEVEL_LABEL = { 1: "Very low", 2: "Low", 3: "Moderate", 4: "High", 5: "Very high" };

// tone: "good" = higher is better, "care" = higher needs care, "neutral" = neither
const TRAIT_GROUPS = [
    {
        title: "Temperament",
        traits: [
            { key: "energyLevel", label: "Energy", low: "Very calm", high: "Very energetic", tone: "neutral" },
            { key: "activityLevel", label: "Activity", low: "Mostly resting", high: "Always moving", tone: "neutral" },
            { key: "anxietyLevel", label: "Anxiety", low: "Relaxed", high: "Very anxious", tone: "care" },
            { key: "aggressionLevel", label: "Aggression", low: "Gentle", high: "Reactive", tone: "care" },
        ],
    },
    {
        title: "Social & learning",
        traits: [
            { key: "friendliness", label: "Friendliness", low: "Reserved", high: "Very friendly", tone: "good" },
            { key: "humanSociability", label: "With people", low: "Shy", high: "Loves people", tone: "good" },
            { key: "animalSociability", label: "With animals", low: "Prefers alone", high: "Loves company", tone: "good" },
            { key: "trainability", label: "Trainability", low: "Needs patience", high: "Eager learner", tone: "good" },
        ],
    },
];

// Plain phrases for "Personality at a glance", in priority order: [trait, phrase if high (4-5), phrase if low (1-2)]
const GLANCE_RULES = [
    ["friendliness", ["Friendly with people", "good"], ["Takes time to trust people", "neutral"]],
    ["aggressionLevel", ["Can be reactive", "care"], ["Gentle", "good"]],
    ["anxietyLevel", ["Gets scared easily", "care"], ["Mostly relaxed", "good"]],
    ["animalSociability", ["Gets along with other pets", "good"], ["Best as the only pet", "neutral"]],
    ["humanSociability", ["Good with strangers and kids", "good"], ["Shy with strangers", "neutral"]],
    ["trainability", ["Learns quickly", "good"], ["Needs patient training", "neutral"]],
    ["energyLevel", ["Playful, lots of energy", "neutral"], ["Calm and easygoing", "neutral"]],
];
const MAX_GLANCE_PHRASES = 4;

function buildGlancePhrases(animal) {
    const phrases = [];
    for (const [traitKey, whenHigh, whenLow] of GLANCE_RULES) {
        const score = Number(animal[traitKey]) || 0;
        if (score >= 4) phrases.push(whenHigh);
        else if (score > 0 && score <= 2) phrases.push(whenLow);
        if (phrases.length === MAX_GLANCE_PHRASES) break;
    }
    return phrases;
}

// Short tags: "Dewormed" is done; "needs 2nd vaccine" still needs doing
const isHealthItemStillDue = (item) => /needs|due|pending|scheduled|not /i.test(item);

// Short tags ("Dewormed, needs 2nd vaccine") become chips; written notes become one line per sentence
function splitHealthNotes(medicalStatus) {
    const text = String(medicalStatus || "").trim();
    if (!text) return { items: [], isSentences: false };
    const isSentences = /[.;]/.test(text);
    const items = text
        .split(isSentences ? /(?<=[.;])\s+/ : /,/)
        .map((item) => item.trim().replace(/[.;]$/, ""))
        .filter(Boolean);
    return { items, isSentences };
}

function TraitBar({ trait, value }) {
    const score = Number(value) || 0;
    return (
        <div className={`pp-trait is-${trait.tone}`}>
            <div className="pp-trait-head">
                <b>{trait.label}</b>
                {score > 0 && <span className="pp-level">{LEVEL_LABEL[score]}</span>}
            </div>
            <div className="pp-bar" aria-label={`${trait.label}: ${score} of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <i key={n} className={n <= score ? "is-on" : ""} />
                ))}
            </div>
            <div className="pp-ends"><span>{trait.low}</span><span>{trait.high}</span></div>
        </div>
    );
}

// Opens a page of the adopter dashboard (log in first if needed)
function goToAdopterPage(adopterPageKey, adoptPetId) {
    openOnAdopterDashboard(adopterPageKey);
    if (adoptPetId) {
        try {
            sessionStorage.setItem("rb_adopt_pet", adoptPetId);
        } catch {
            // storage blocked: the adopter picks the pet again in Browse Pets
        }
    }
    window.location.href = "/";
}

export default function PublicPetProfile({ tagCode }) {
    const [animal, setAnimal] = useState(null);
    const [error, setError] = useState("");
    const [shelter, setShelter] = useState(null);
    const [isPhone, setIsPhone] = useState(() => window.matchMedia("(max-width: 760px)").matches);

    useEffect(() => {
<<<<<<< HEAD
        fetch(`${API}/api/qr-tags/lookup/${encodeURIComponent(tagCode)}`)
=======
        fetch(`${API}/api/qr-tags/lookup/${encodeURIComponent(tagCode)}`, { headers: HEADERS })
>>>>>>> 3eb14fb9d48a9e2e66f5eabff2a5dfebe0d6b0e5
            .then((r) => r.json())
            .then((data) => (data.success ? setAnimal(data.animal) : setError(data.message || "Pet not found.")))
            .catch(() => setError("Could not load pet info."));

        fetch(`${API}/api/settings/contact`, { headers: HEADERS })
            .then((r) => r.json())
            .then((data) => data.success && setShelter(data.contact))
            .catch(() => setShelter(null)); // the page works without the contact box
    }, [tagCode]);

    useEffect(() => {
        const phoneQuery = window.matchMedia("(max-width: 760px)");
        const updateIsPhone = () => setIsPhone(phoneQuery.matches);
        phoneQuery.addEventListener("change", updateIsPhone);
        return () => phoneQuery.removeEventListener("change", updateIsPhone);
    }, []);

    if (error || !animal) {
        return (
            <div className="pp-page">
                <div className="pp-message">{error || "Loading…"}</div>
            </div>
        );
    }

    const status = getAnimalStatus(animal);
    const isAvailable = status === "available";
    const facts = [animal.type, animal.breed, animal.age != null && formatAge(animal.age), animal.gender, animal.size, animal.color].filter(Boolean);
    const glancePhrases = buildGlancePhrases(animal);
    const hasAssessment = TRAIT_GROUPS.some((group) => group.traits.some((trait) => animal[trait.key]));
    const health = splitHealthNotes(animal.medicalStatus);
    const shelterName = shelter?.name || "RescueBase Shelter";
    const shelterLink = shelter?.phone ? `tel:${shelter.phone.replace(/[^\d+]/g, "")}` : shelter?.email ? `mailto:${shelter.email}` : "";

    // Adopted or fostered pets may wear the tag outside: help a finder reach the shelter
    const statusBox = status === "adopted" || status === "fostered" ? (
        <div className="pp-status-box">
            <b>{status === "adopted" ? `${animal.name} already has a home.` : `${animal.name} is staying with a foster family.`}</b>
            <span>Found {animal.name} outside? Please contact the shelter so we can bring them back.</span>
            <div className="pp-status-actions">
                {shelterLink && <a className="pp-btn is-primary" href={shelterLink}>{shelter.phone ? "Call the shelter" : "Email the shelter"}</a>}
                <button type="button" className="pp-btn is-outline" onClick={() => goToAdopterPage("browse-pets")}>See pets you can adopt</button>
            </div>
        </div>
    ) : !isAvailable ? (
        <div className="pp-status-box">
            <b>{status === "pending" ? `${animal.name}'s adoption is in progress.` : `${animal.name} is in shelter care.`}</b>
            <span>Other pets are waiting for a home too.</span>
            <div className="pp-status-actions">
                <button type="button" className="pp-btn is-outline" onClick={() => goToAdopterPage("browse-pets")}>See pets you can adopt</button>
            </div>
        </div>
    ) : null;

    const adoptActions = isAvailable && (
        <div className="pp-adopt-actions">
            <button type="button" className="pp-btn is-primary" onClick={() => goToAdopterPage("browse-pets", animal._id)}>
                Apply to adopt {animal.name}
            </button>
            <button type="button" className="pp-btn is-outline" onClick={() => goToAdopterPage("donation")}>
                {isPhone ? "Donate" : "Donate to shelter"}
            </button>
        </div>
    );

    return (
        <div className={`pp-page ${isAvailable ? "has-adopt-bar" : ""}`}>
            <div className="pp-wrap">
                <aside className="pp-side">
                    <div className="pp-photo">
                        {animal.image ? <img src={animal.image} alt={animal.name} /> : <div className="pp-photo-empty" />}
                        <span className={`pp-status is-${status}`}>{STATUS_LABEL[status]}</span>
                    </div>

                    <div className="pp-side-body">
                        <h1 className="pp-name">{animal.name}</h1>
                        <p className="pp-loc">{animal.location || shelterName}</p>
                        {facts.length > 0 && (
                            <ul className="pp-facts">
                                {facts.map((fact) => <li key={fact}>{fact}</li>)}
                            </ul>
                        )}
                        {statusBox}
                        {adoptActions}
                    </div>
                </aside>

                <main className="pp-main">
                    {glancePhrases.length > 0 && (
                        <section className="pp-section">
                            <h2>Personality at a glance</h2>
                            <div className="pp-glance">
                                {glancePhrases.map(([phrase, tone]) => <span key={phrase} className={`is-${tone}`}>{phrase}</span>)}
                            </div>
                        </section>
                    )}

                    <section className="pp-section">
                        {hasAssessment ? (
                            // Folded on phone so the page stays short; open on desktop
                            <details className="pp-details" open={!isPhone}>
                                <summary>
                                    <h2>Behavior details</h2>
                                    <span>Rated by shelter staff from daily care</span>
                                </summary>
                                <p className="pp-legend">
                                    <span><i className="is-good" />Higher is better</span>
                                    <span><i className="is-care" />Higher needs extra care</span>
                                </p>
                                {TRAIT_GROUPS.map((group) => (
                                    <div key={group.title}>
                                        <h3 className="pp-group-title">{group.title}</h3>
                                        <div className="pp-traits">
                                            {group.traits.map((trait) => <TraitBar key={trait.key} trait={trait} value={animal[trait.key]} />)}
                                        </div>
                                    </div>
                                ))}
                            </details>
                        ) : (
                            <>
                                <h2>Behavior details</h2>
                                <p className="pp-empty">Not assessed yet. Our staff are still getting to know {animal.name}.</p>
                            </>
                        )}
                    </section>

                    {health.items.length > 0 && (
                        <section className="pp-section">
                            <h2>Health</h2>
                            {health.isSentences ? (
                                // Written notes stay neutral: guessing done/to-do from free text is unreliable
                                <ul className="pp-health-list">
                                    {health.items.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                            ) : (
                                <div className="pp-health">
                                    {health.items.map((item) => (
                                        <span key={item} className={isHealthItemStillDue(item) ? "is-due" : "is-done"}>{item}</span>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {animal.description && (
                        <section className="pp-section">
                            <h2>Story</h2>
                            <p className="pp-story">{animal.description}</p>
                        </section>
                    )}

                    {(shelter?.phone || shelter?.email) && (
                        <footer className="pp-shelter">
                            <b>{shelter.name}</b>
                            {shelter.phone && <a href={`tel:${shelter.phone.replace(/[^\d+]/g, "")}`}>{shelter.phone}</a>}
                            {shelter.email && <a href={`mailto:${shelter.email}`}>{shelter.email}</a>}
                        </footer>
                    )}
                </main>
            </div>
        </div>
    );
}
