import { useEffect, useMemo, useRef, useState } from "react";
import InfoTip from "../../../../components/system/InfoTip";

const API = import.meta.env.VITE_BACKEND_URL;

// Traits start empty ("Not rated yet") so staff must rate all 8 on purpose.
const emptyForm = {
    animalId: "",
    assessor: "",
    assessmentDate: "",
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

const SCORE_LABELS = {
    1: "Very low",
    2: "Low",
    3: "Moderate",
    4: "High",
    5: "Very high",
};

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
            { key: "friendliness", label: "Friendliness", question: "How warm is {name} toward people they meet?", low: "Reserved", high: "Very friendly", tone: "good" },
            { key: "humanSociability", label: "Human Sociability", question: "How comfortable is {name} with handling, strangers, and kids?", low: "Shy", high: "Loves people", tone: "good" },
            { key: "animalSociability", label: "Animal Sociability", question: "How does {name} get along with other animals?", low: "Prefers alone", high: "Loves company", tone: "good" },
            { key: "trainability", label: "Trainability", question: "How quickly does {name} pick up cues and routines?", low: "Stubborn", high: "Eager learner", tone: "good" },
        ],
    },
];

const BEHAVIOR_TRAITS = TRAIT_GROUPS.flatMap((group) => group.traits);

const MINI_TRAITS = [
    { key: "energyLevel", label: "Energy", tone: "neutral" },
    { key: "anxietyLevel", label: "Anxiety", tone: "care" },
    { key: "aggressionLevel", label: "Aggression", tone: "care" },
    { key: "friendliness", label: "Friendly", tone: "good" },
    { key: "humanSociability", label: "Social", tone: "good" },
];

function isRated(value) {
    const score = Number(value);
    return value !== null && value !== "" && value !== undefined && score >= 1 && score <= 5;
}

const countRated = (form) => BEHAVIOR_TRAITS.filter((t) => isRated(form[t.key])).length;

function hasAssessment(animal) {
    return animal.energyLevel !== null && animal.energyLevel !== undefined;
}

function needsExtraCare(animal) {
    return Number(animal.anxietyLevel) >= 4 || Number(animal.aggressionLevel) >= 4;
}

// Tags come from the backend (personalityService.js), same as the Adopter Preview
function getBehaviorTags(animal) {
    return animal?.personality?.tags || [];
}

function speciesEmoji(type) {
    if (type === "Cat") return "🐱";
    if (type === "Dog") return "🐶";
    return "🐾";
}

function today() {
    return new Date().toISOString().split("T")[0];
}

function buildFormFromAnimal(animal) {
    return {
        ...emptyForm,
        animalId: animal._id,
        assessmentDate: today(),
        energyLevel: animal.energyLevel ?? null,
        friendliness: animal.friendliness ?? null,
        humanSociability: animal.humanSociability ?? null,
        animalSociability: animal.animalSociability ?? null,
        trainability: animal.trainability ?? null,
        anxietyLevel: animal.anxietyLevel ?? null,
        aggressionLevel: animal.aggressionLevel ?? null,
        activityLevel: animal.activityLevel ?? null,
        notes: animal.behaviorNotes || "",
        assessor: animal.behaviorAssessedBy || "",
    };
}

// ---------- Trait rating card ----------

function TraitScale({ trait, value, animalName, onChange }) {
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
            <p className="ao-trait-question">
                {trait.question.replace("{name}", animalName || "the animal")}
            </p>

            <div className="ao-trait-scale" role="radiogroup" aria-label={trait.label}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={score === n}
                        aria-label={`${n} – ${SCORE_LABELS[n]}`}
                        className={rated && n === score ? "current" : rated && n < score ? "on" : ""}
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

// ---------- Shared UI pieces (stats strip, tabs, search bar) ----------

const ICONS = {
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
        </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    alert: (
        <>
            <path d="M12 3 2 21h20z" />
            <path d="M12 10v4M12 17.5v.01" />
        </>
    ),
    user: (
        <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </>
    ),
};

function Icon({ name, size = 15 }) {
    return (
        <svg
            className="ao-icon"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {ICONS[name]}
        </svg>
    );
}

function StatsStrip({ highlight, items }) {
    return (
        <div className="ao-strip">
            <div className="ao-strip-cta">
                <div>
                    <b>{highlight.value}</b>
                    <small>{highlight.label}</small>
                </div>
                {highlight.actionLabel && (
                    <button type="button" onClick={highlight.onAction}>
                        {highlight.actionLabel} →
                    </button>
                )}
            </div>

            {items.map((item) => (
                <div className="ao-strip-item" key={item.label}>
                    <div className="ao-strip-label">
                        <Icon name={item.icon} />
                        {item.label}
                    </div>
                    <div className="ao-strip-value">
                        {item.value}
                        {item.note && <em>{item.note}</em>}
                    </div>
                </div>
            ))}
        </div>
    );
}

function Tabs({ tabs, value, onChange }) {
    return (
        <div className="ao-tabs" role="tablist">
            {tabs.map((tab) => (
                <button
                    type="button"
                    key={tab.value}
                    role="tab"
                    aria-selected={value === tab.value}
                    className={value === tab.value ? "active" : ""}
                    onClick={() => onChange(tab.value)}
                >
                    {tab.label}
                    {tab.count > 0 && <i>{tab.count}</i>}
                </button>
            ))}
        </div>
    );
}

function SearchToolbar({
    searchBy,
    onSearchByChange,
    searchByOptions,
    search,
    onSearchChange,
    placeholder,
    filters = [],
    shown,
    total,
    noun,
    onClear,
}) {
    const hasActive =
        search.trim() !== "" ||
        searchBy !== searchByOptions[0].value ||
        filters.some((f) => f.value !== f.options[0].value);

    return (
        <>
            <div className="ao-toolbar">
                <div className="ao-searchbox">
                    <select
                        value={searchBy}
                        onChange={(e) => onSearchByChange(e.target.value)}
                        aria-label="Search by"
                    >
                        {searchByOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <label className="ao-searchbox-input">
                        <Icon name="search" />
                        <input
                            type="search"
                            value={search}
                            placeholder={placeholder}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </label>
                </div>

                {filters.map((filter) => (
                    <select
                        key={filter.label}
                        className="ao-dropdown"
                        value={filter.value}
                        aria-label={filter.label}
                        onChange={(e) => filter.onChange(e.target.value)}
                    >
                        {filter.options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                ))}
            </div>

            <p className="ao-results">
                Showing {shown} of {total} {noun}
                {hasActive && (
                    <button type="button" onClick={onClear}>
                        Clear filters
                    </button>
                )}
            </p>
        </>
    );
}

function matchesSearch(record, term, searchBy, fieldMap) {
    const needle = term.trim().toLowerCase();
    if (!needle) return true;

    const keys = searchBy === "all" ? Object.keys(fieldMap) : [searchBy];

    return keys.some((key) =>
        String(fieldMap[key](record) || "")
            .toLowerCase()
            .includes(needle)
    );
}

const SEARCH_FIELDS = {
    name: (a) => a.name,
    breed: (a) => a.breed,
    trait: (a) => getBehaviorTags(a).join(" "),
    notes: (a) => a.behaviorNotes,
};

const SEARCH_BY_OPTIONS = [
    { value: "all", label: "All fields" },
    { value: "name", label: "Animal name" },
    { value: "breed", label: "Breed" },
    { value: "trait", label: "Personality" },
    { value: "notes", label: "Notes" },
];

const DEFAULT_FILTERS = {
    searchBy: "all",
    search: "",
    tag: "All",
    sort: "newest",
};

// ---------- Page ----------

export default function BehaviorAssessment({ lockedAnimal = null, onSaved }) {
    const [animals, setAnimals] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [form, setForm] = useState(() =>
        lockedAnimal ? buildFormFromAnimal(lockedAnimal) : emptyForm
    );

    const [editingId, setEditingId] = useState("");
    const [tab, setTab] = useState("all");
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const token = localStorage.getItem("token");

    const formRef = useRef(null);

    async function fetchAnimals() {
        try {
            setLoading(true);

            const response = await fetch(`${API}/api/animals`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to fetch animals");
            }

            setAnimals(data.animals || []);
        } catch (error) {
            console.error("Fetch animals error: ", error);
            setMessage(error.message || "Server error while fetching animals");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    }

    // Staff/admin accounts for the "Assessed By" dropdown
    async function fetchStaff() {
        try {
            const response = await fetch(`${API}/api/users/staff`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok || !data.success) return;

            const list = data.staff || [];
            setStaffList(list);

            // Default to the logged-in user when they are on the list
            let me = "";
            try {
                me = JSON.parse(localStorage.getItem("rescuebase_user") || "{}").name || "";
            } catch {
                me = "";
            }
            if (me && list.some((person) => person.name === me)) {
                setForm((current) => (current.assessor ? current : { ...current, assessor: me }));
            }
        } catch {
            setStaffList([]);
        }
    }

    useEffect(() => {
        fetchAnimals();
        fetchStaff();
    }, []);

    function updateField(name, value) {
        setForm((current) => ({
            ...current,
            [name]: value,
        }));

        // Hide an old error once the user starts fixing it.
        if (messageType === "error") {
            setMessage("");
            setMessageType("");
        }
    }

    function selectAnimal(animal) {
        if (!animal) {
            setForm(emptyForm);
            setEditingId("");
            return;
        }

        setForm((current) => {
            const next = buildFormFromAnimal(animal);
            return { ...next, assessor: next.assessor || current.assessor };
        });
        setEditingId(hasAssessment(animal) ? animal._id : "");
        setMessage("");
        setMessageType("");
    }

    function handleAnimalChange(e) {
        // Fixed: look up the newly selected animal (not the previous one).
        selectAnimal(animals.find((animal) => animal._id === e.target.value));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.animalId) {
            setMessage("Please select an animal.");
            setMessageType("error");
            return;
        }

        const rated = countRated(form);
        if (rated < BEHAVIOR_TRAITS.length) {
            setMessage(`Please rate all ${BEHAVIOR_TRAITS.length} traits (${rated} rated so far).`);
            setMessageType("error");
            return;
        }

        try {
            setSubmitting(true);
            setMessage("");
            setMessageType("");

            const selectedAnimal =
                lockedAnimal || animals.find((animal) => animal._id === form.animalId);

            if (!selectedAnimal) {
                throw new Error("Selected animal was not found.");
            }

            const payload = {
                energyLevel: Number(form.energyLevel),
                friendliness: Number(form.friendliness),
                humanSociability: Number(form.humanSociability),
                animalSociability: Number(form.animalSociability),
                trainability: Number(form.trainability),
                anxietyLevel: Number(form.anxietyLevel),
                aggressionLevel: Number(form.aggressionLevel),
                activityLevel: Number(form.activityLevel),
                behaviorNotes: String(form.notes || "").trim(),
                behaviorAssessedBy: String(form.assessor || "").trim(),
                behaviorAssessedAt: form.assessmentDate || new Date().toISOString(),
            };

            const response = await fetch(`${API}/api/animals/${form.animalId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to save behavioral profile");
            }

            setMessage(
                editingId
                    ? `${selectedAnimal.name}'s behavioral profile was updated.`
                    : `${selectedAnimal.name}'s behavioral profile was saved.`
            );
            setMessageType("success");

            // Let the parent (Animal Profiles) refresh its Adopter Preview
            if (onSaved && data.animal) {
                onSaved(data.animal);
            }

            if (!lockedAnimal) {
                setEditingId("");
                setForm((current) => ({ ...emptyForm, assessor: current.assessor }));
            }

            await fetchAnimals();
        } catch (error) {
            console.error("Save behavioral profile error:", error);
            setMessage(error.message || "Server error while saving behavioral profile.");
            setMessageType("error");
        } finally {
            setSubmitting(false);
        }
    }

    function handleEditAssessment(animal) {
        selectAnimal(animal);
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function handleCancelEdit() {
        setEditingId("");
        setForm((current) => ({ ...emptyForm, assessor: current.assessor }));
        setMessage("");
        setMessageType("");
    }

    // ---------- Stats, tabs, filtering ----------

    const assessed = useMemo(() => animals.filter(hasAssessment), [animals]);
    const notAssessed = useMemo(() => animals.filter((a) => !hasAssessment(a)), [animals]);
    const extraCare = useMemo(() => assessed.filter(needsExtraCare), [assessed]);

    const topAssessor = useMemo(() => {
        const counts = {};
        let best = null;
        assessed.forEach((a) => {
            const name = String(a.behaviorAssessedBy || "").trim();
            if (!name) return;
            counts[name] = (counts[name] || 0) + 1;
            if (!best || counts[name] > counts[best]) best = name;
        });
        return best ? { value: best, count: counts[best] } : null;
    }, [assessed]);

    const tagOptions = useMemo(
        () => [...new Set(assessed.flatMap(getBehaviorTags))].sort(),
        [assessed]
    );

    const tabAnimals = useMemo(() => {
        if (tab === "Dog" || tab === "Cat") return assessed.filter((a) => a.type === tab);
        if (tab === "care") return extraCare;
        return assessed;
    }, [assessed, extraCare, tab]);

    const filteredAnimals = useMemo(() => {
        const list = tabAnimals.filter(
            (a) =>
                matchesSearch(a, filters.search, filters.searchBy, SEARCH_FIELDS) &&
                (filters.tag === "All" || getBehaviorTags(a).includes(filters.tag))
        );

        return [...list].sort((a, b) => {
            if (filters.sort === "name") return String(a.name).localeCompare(String(b.name));
            return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        });
    }, [tabAnimals, filters]);

    function setFilter(key, value) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    const selectedAnimal =
        lockedAnimal || animals.find((animal) => animal._id === form.animalId) || null;
    const ratedCount = countRated(form);

    const tabs = [
        { value: "all", label: "All" },
        { value: "Dog", label: "Dogs" },
        { value: "Cat", label: "Cats" },
        { value: "care", label: "Needs extra care", count: extraCare.length },
    ];

    return (
        <section className={`ao-page${lockedAnimal ? " ao-embedded" : ""}`}>
            {!lockedAnimal && (
                <StatsStrip
                    highlight={{
                        value: notAssessed.length,
                        label:
                            notAssessed.length === 1
                                ? "Animal not assessed yet"
                                : "Animals not assessed yet",
                        actionLabel: notAssessed.length > 0 ? "Assess next" : "",
                        onAction: () => {
                            selectAnimal(notAssessed[0]);
                            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        },
                    }}
                    items={[
                        {
                            icon: "check",
                            label: "Assessed",
                            value: assessed.length,
                            note: `of ${animals.length} animals`,
                        },
                        {
                            icon: "alert",
                            label: "Needs extra care",
                            value: extraCare.length,
                            note: "high anxiety or aggression",
                        },
                        {
                            icon: "user",
                            label: "Assessed mostly by",
                            value: topAssessor ? topAssessor.value : "—",
                            note: topAssessor
                                ? `${topAssessor.count} assessment${topAssessor.count === 1 ? "" : "s"}`
                                : "",
                        },
                    ]}
                />
            )}

            {/* ---------- ASSESSMENT FORM ---------- */}
            <section className="ao-card ao-form-card" ref={formRef}>
                {!lockedAnimal && (
                    <>
                        <h2 className="ao-label-tip">
                            {editingId ? "Edit Behavior Assessment" : "Behavior Assessment"}
                            <InfoTip text="Rate each of the 8 traits from 1 (Very Low) to 5 (Very High) based on what you observed. These scores feed the adopter compatibility match and the personality tags shown on the animal's profile." />
                        </h2>
                        <p className="ao-hint">
                            Tap a number for each trait based on what you've observed. Adopters see
                            this on the pet's profile.
                        </p>
                    </>
                )}

                <form className="ao-form" onSubmit={handleSubmit}>
                    <div className="ao-assess-top">
                        <label className="ao-field">
                            <span>Animal <span className="ao-req">*</span></span>
                            {lockedAnimal ? (
                                <input value={lockedAnimal.name} readOnly />
                            ) : (
                                <select value={form.animalId} onChange={handleAnimalChange} required>
                                    <option value="">Select an animal</option>
                                    {notAssessed.length > 0 && (
                                        <optgroup label="Not assessed yet">
                                            {notAssessed.map((animal) => (
                                                <option key={animal._id} value={animal._id}>
                                                    {animal.name} — {animal.type}
                                                    {animal.breed ? ` — ${animal.breed}` : ""}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {assessed.length > 0 && (
                                        <optgroup label="Already assessed">
                                            {assessed.map((animal) => (
                                                <option key={animal._id} value={animal._id}>
                                                    {animal.name} — {animal.type}
                                                    {animal.breed ? ` — ${animal.breed}` : ""}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            )}
                        </label>

                        <label className="ao-field">
                            <span>Assessed By <span className="ao-req">*</span></span>
                            <select
                                value={form.assessor}
                                onChange={(e) => updateField("assessor", e.target.value)}
                                required
                            >
                                <option value="">Select staff member</option>
                                {["staff", "admin"].map((role) => {
                                    const people = staffList.filter((person) => person.role === role);
                                    if (people.length === 0) return null;
                                    return (
                                        <optgroup key={role} label={role === "staff" ? "Staff" : "Admin"}>
                                            {people.map((person) => (
                                                <option key={person._id} value={person.name}>
                                                    {person.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    );
                                })}
                                {form.assessor &&
                                    !staffList.some((person) => person.name === form.assessor) && (
                                        <option value={form.assessor}>{form.assessor} (saved earlier)</option>
                                    )}
                            </select>
                        </label>

                        <label className="ao-field">
                            <span>Assessment Date <span className="ao-req">*</span></span>
                            <input
                                type="date"
                                value={form.assessmentDate}
                                onChange={(e) => updateField("assessmentDate", e.target.value)}
                                required
                            />
                        </label>
                    </div>

                    <div className="ao-progress">
                        <span>
                            {ratedCount} of {BEHAVIOR_TRAITS.length} traits rated
                        </span>
                        <div className="ao-progress-track">
                            <i style={{ width: `${(ratedCount / BEHAVIOR_TRAITS.length) * 100}%` }} />
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
                                        value={form[trait.key]}
                                        animalName={selectedAnimal?.name}
                                        onChange={updateField}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>

                    {message && <div className={`ao-alert ${messageType || "info"}`}>{message}</div>}

                    <div className="ao-assess-foot">
                        <label className="ao-field">
                            <span>Observation Notes <span className="ao-req">*</span></span>
                            <textarea
                                value={form.notes}
                                onChange={(e) => updateField("notes", e.target.value)}
                                placeholder="e.g. Warms up after a few minutes, nervous around loud noises."
                                required
                            />
                        </label>

                        <div className="ao-form-actions">
                            {editingId && !lockedAnimal && (
                                <button
                                    type="button"
                                    className="ao-btn"
                                    onClick={handleCancelEdit}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                            )}
                            <button type="submit" className="ao-btn primary" disabled={submitting}>
                                {submitting
                                    ? "Saving..."
                                    : editingId
                                      ? "Update Assessment"
                                      : "Save Assessment"}
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            {/* ---------- ASSESSED ANIMALS ---------- */}
            {!lockedAnimal && (
                <section className="ao-card">
                    <div className="ao-list-head">
                        <h2>Assessed Animals</h2>
                        <Tabs tabs={tabs} value={tab} onChange={setTab} />
                    </div>

                    <SearchToolbar
                        searchBy={filters.searchBy}
                        onSearchByChange={(value) => setFilter("searchBy", value)}
                        searchByOptions={SEARCH_BY_OPTIONS}
                        search={filters.search}
                        onSearchChange={(value) => setFilter("search", value)}
                        placeholder="Search name, breed, or personality..."
                        filters={[
                            {
                                label: "Personality",
                                value: filters.tag,
                                onChange: (value) => setFilter("tag", value),
                                options: [
                                    { value: "All", label: "Any personality" },
                                    ...tagOptions.map((tag) => ({ value: tag, label: tag })),
                                ],
                            },
                            {
                                label: "Sort",
                                value: filters.sort,
                                onChange: (value) => setFilter("sort", value),
                                options: [
                                    { value: "newest", label: "Recently updated" },
                                    { value: "name", label: "Name A–Z" },
                                ],
                            },
                        ]}
                        shown={filteredAnimals.length}
                        total={tabAnimals.length}
                        noun="animals"
                        onClear={() => setFilters(DEFAULT_FILTERS)}
                    />

                    {loading ? (
                        <p className="ao-empty">Loading behavioral profiles...</p>
                    ) : filteredAnimals.length === 0 ? (
                        <p className="ao-empty">No assessed animals match your search.</p>
                    ) : (
                        <div className="ao-list">
                            {filteredAnimals.map((animal) => (
                                <article className="ao-assess-row" key={animal._id}>
                                    <div className="ao-avatar">
                                        {animal.image ? (
                                            <img src={animal.image} alt="" />
                                        ) : (
                                            speciesEmoji(animal.type)
                                        )}
                                    </div>

                                    <div>
                                        <h3>{animal.name}</h3>
                                        <div className="ao-meta">
                                            {animal.type}
                                            {animal.breed ? ` · ${animal.breed}` : ""}
                                        </div>
                                        {getBehaviorTags(animal).length > 0 && (
                                            <div className="ao-tags">
                                                {getBehaviorTags(animal).map((tag) => (
                                                    <span className="ao-tag warm" key={tag}>
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {animal.behaviorNotes && (
                                            <p className="ao-note">"{animal.behaviorNotes}"</p>
                                        )}
                                    </div>

                                    <div className="ao-mini">
                                        {MINI_TRAITS.map((trait) => (
                                            <div className="ao-mini-row" key={trait.key}>
                                                <span>{trait.label}</span>
                                                <div className={`ao-mini-bar ${trait.tone}`}>
                                                    {[1, 2, 3, 4, 5].map((n) => (
                                                        <i
                                                            key={n}
                                                            className={n <= Number(animal[trait.key]) ? "on" : ""}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="ao-actions">
                                        <button
                                            type="button"
                                            className="ao-btn sm"
                                            onClick={() => handleEditAssessment(animal)}
                                        >
                                            Edit Ratings
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </section>
    );
}
