import { useEffect, useState } from "react";
import { isAdmin } from "../../../../utils/auth";
import InfoTip from "../../../../components/system/InfoTip";

const API = import.meta.env.VITE_BACKEND_URL;

const emptyForm = {
    animalId: "",
    assessor: "",
    assessmentDate: "",
    energyLevel: 3,
    friendliness: 3,
    humanSociability: 3,
    animalSociability: 3,
    trainability: 3,
    anxietyLevel: 3,
    aggressionLevel: 3,
    activityLevel: 3,
    notes: "",
};

const SCORE_LABELS = {
    1: "Very Low",
    2: "Low",
    3: "Moderate",
    4: "High",
    5: "Very High",
};

const TRAIT_GROUPS = [
    {
        title: "Temperament",
        traits: [
            { key: "energyLevel", label: "Energy Level", description: "How much energy the animal shows day to day.", low: "Calm", high: "Hyper" },
            { key: "activityLevel", label: "Activity Level", description: "How much exercise and play it needs.", low: "Laid-back", high: "Very active" },
            { key: "anxietyLevel", label: "Anxiety Level", description: "How easily it becomes stressed or fearful.", low: "Relaxed", high: "Very anxious" },
            { key: "aggressionLevel", label: "Aggression Level", description: "Tendency to growl, snap or guard things.", low: "Gentle", high: "Reactive" },
        ],
    },
    {
        title: "Social and Learning",
        traits: [
            { key: "friendliness", label: "Friendliness", description: "General warmth toward people it meets.", low: "Reserved", high: "Very friendly" },
            { key: "humanSociability", label: "Human Sociability", description: "Comfort with handling, strangers and kids.", low: "Shy", high: "Loves people" },
            { key: "animalSociability", label: "Animal Sociability", description: "How it gets along with other animals.", low: "Prefers alone", high: "Loves company" },
            { key: "trainability", label: "Trainability", description: "How quickly it picks up cues and routines.", low: "Stubborn", high: "Eager learner" },
        ],
    },
];

const BEHAVIOR_TRAITS = TRAIT_GROUPS.flatMap((group) => group.traits);

const countRated = (form) =>
    BEHAVIOR_TRAITS.filter((t) => form[t.key] !== null && form[t.key] !== "" && form[t.key] !== undefined).length;

function TraitScale({ trait, value, onChange }) {
    const score = Number(value);
    const hasScore = score >= 1 && score <= 5;

    return (
        <div className="admin-trait-card">
            <div className="admin-trait-head">
                <div>
                    <h4>{trait.label}</h4>
                    <p>{trait.description}</p>
                </div>
                <span className={`admin-trait-badge${hasScore ? "" : " empty"}`}>
                    {hasScore ? `${score} · ${SCORE_LABELS[score]}` : "Not rated"}
                </span>
            </div>

            <div className="admin-trait-scale" role="radiogroup" aria-label={trait.label}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={score === n}
                        aria-label={`${n} – ${SCORE_LABELS[n]}`}
                        className={`admin-trait-segment${hasScore && n <= score ? " filled" : ""}${score === n ? " selected" : ""}`}
                        onClick={() => onChange(trait.key, n)}
                    />
                ))}
            </div>

            <div className="admin-trait-ends">
                <span>{trait.low}</span>
                <span>{trait.high}</span>
            </div>
        </div>
    );
}
function buildFormFromAnimal(animal) {
    return {
        ...emptyForm,
        animalId: animal._id,
        assessmentDate: new Date().toISOString().split("T")[0],
        energyLevel: animal.energyLevel ?? 3,
        friendliness: animal.friendliness ?? 3,
        humanSociability: animal.humanSociability ?? 3,
        animalSociability: animal.animalSociability ?? 3,
        trainability: animal.trainability ?? 3,
        anxietyLevel: animal.anxietyLevel ?? 3,
        aggressionLevel: animal.aggressionLevel ?? 3,
        activityLevel: animal.activityLevel ?? 3,
        notes: animal.behaviorNotes || "",
    };
}

export default function BehaviorAssessment({ lockedAnimal = null }) {
    const [animals, setAnimals] = useState([]);
    const [form, setForm] = useState(() =>
        lockedAnimal ? buildFormFromAnimal(lockedAnimal) : emptyForm
    );

    const [editingId, setEditingId] = useState("");
    const [search, setSearch] = useState("");
    const [filterAssessor, setFilterAssessor] = useState("All");
    const [filterSpecies, setFilterSpecies] = useState("All");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const token = localStorage.getItem("token");

    async function fetchAnimals() {
        try {
            setLoading(true);
            setMessage("");

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

    useEffect(() => {
        fetchAnimals();
    }, []);

    function updateField(name, value) {
        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function handleAnimalChange(e) {
        const animalId = e.target.value;

        const selectedAnimal =
            lockedAnimal ||
            animals.find((animal) => animal._id === form.animalId);

        if (!selectedAnimal) {
            setForm((current) => ({
                ...current,
                animalId: "",
            }));
            return;
        }

        setForm((current) => ({
            ...current,
            animalId,
            energyLevel: selectedAnimal.energyLevel ?? 3,
            friendliness: selectedAnimal.friendliness ?? 3,
            humanSociability: selectedAnimal.humanSociability ?? 3,
            animalSociability: selectedAnimal.animalSociability ?? 3,
            trainability: selectedAnimal.trainability ?? 3,
            anxietyLevel: selectedAnimal.anxietyLevel ?? 3,
            aggressionLevel: selectedAnimal.aggressionLevel ?? 3,
            activityLevel: selectedAnimal.activityLevel ?? 3,
            notes: selectedAnimal.behaviorNotes || "",
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.animalId) {
            setMessage("Please select an animal");
            setMessageType("error");
            return;
        }

        try {
            setSubmitting(true);
            setMessage("");
            setMessageType("");

            const selectedAnimal = animals.find(
                (animal) => animal._id === form.animalId
            );

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

            setMessage(editingId
                ? `${selectedAnimal.name}'s behavioral profile was updated successfully.`
                : `${selectedAnimal.name}'s behavioral profile was saved successfully.`
            );

            setMessageType("success");
            setEditingId("");

            if (!lockedAnimal) {
                setForm(emptyForm);
            }

            await fetchAnimals();
        } catch (error) {
            console.error(
                "Save behavioral profile error:",
                error
            );

            setMessage(
                error.message ||
                "Server error while saving behavioral profile."
            );
            setMessageType("error");
        } finally {
            setSubmitting(false);
        }
    }

    function handleEditAssessment(animal) {
        setEditingId(animal._id);

        setForm({
            animalId: animal._id,
            assessor: "",
            assessmentDate: new Date()
                .toISOString()
                .split("T")[0],
            energyLevel: animal.energyLevel ?? 3,
            friendliness: animal.friendliness ?? 3,
            humanSociability:
                animal.humanSociability ?? 3,
            animalSociability:
                animal.animalSociability ?? 3,
            trainability: animal.trainability ?? 3,
            anxietyLevel: animal.anxietyLevel ?? 3,
            aggressionLevel: animal.aggressionLevel ?? 3,
            activityLevel: animal.activityLevel ?? 3,
            notes: animal.behaviorNotes || "",
        });

        setMessage(`Editing behavioral profile for ${animal.name}`);
        setMessageType("");
    }

    function handleCancelEdit() {
        setEditingId("");
        setForm(emptyForm);
        setMessage("");
        setMessageType("");
    }

    const assessors = [
        ...new Set(
            animals.map((animal) => animal.behaiorAssessor).filter(Boolean)
        ),
    ];

    const speciesOptions = [
        ...new Set(animals.map((animal) => animal.type).filter(Boolean)),
    ];

    const filteredAnimals = animals.filter((animal) => {
        const searchValue = search.toLowerCase().trim();
        const matchesSearch = animal.name?.toLowerCase().includes(searchValue) ||
            animal.breed?.toLowerCase().includes(searchValue);
        const hasAssessment = animal.energyLevel !== null && animal.energyLevel !== undefined;
        const matchesAssessor = filterAssessor === "All" || animal.behaiorAssessor === filterAssessor;
        const matchesSpecies = filterSpecies === "All" || animal.type === filterSpecies;

        return matchesSearch && matchesAssessor && matchesSpecies && hasAssessment;
    });

    return (
        <section className="admin-behavior-page">
            <section className="admin-panel admin-behavior-form-panel">
                 {!lockedAnimal && (
                    <div className="admin-panel-heading">
                        <div>
                            <h2 className="admin-heading-with-tip">
                                {editingId
                                    ? "Edit Behavioral Assessment"
                                    : "Behavioral Assessment"}
                                <InfoTip text="Rate each of the 8 traits from 1 (Very Low) to 5 (Very High) based on what you observed. These scores feed the adopter compatibility match and the personality tags shown on the animal's profile." />
                            </h2>

                            <p>
                                Manually evaluate an animal's behavior
                                using the eight matching factors.
                            </p>
                        </div>
                    </div>
                )}
                
                <form
                    className="admin-behavior-form"
                    onSubmit={handleSubmit}
                >
                    <div className="admin-behavior-top-row">
                        {lockedAnimal ? (
                            <label>
                                Animal
                                <input value={lockedAnimal.name} readOnly />
                            </label>
                        ) : (
                            <label>
                                Animal
                                <select
                                    value={form.animalId}
                                    onChange={handleAnimalChange}
                                    required
                                >
                                    <option value="">Select an animal</option>
                                    {animals.map((animal) => (
                                        <option key={animal._id} value={animal._id}>
                                            {animal.name} — {animal.type}
                                            {animal.breed ? ` — ${animal.breed}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        <label>
                            Assessed By
                            <input
                                value={form.assessor}
                                onChange={(e) => updateField("assessor", e.target.value)}
                                placeholder="Shelter Staff / Volunteer"
                                required
                            />
                        </label>

                        <label>
                            Assessment Date
                            <input
                                type="date"
                                value={form.assessmentDate}
                                onChange={(e) => updateField("assessmentDate", e.target.value)}
                                required
                            />
                        </label>
                    </div>

                    <div className="admin-behavior-progress">
                        <div className="admin-behavior-progress-text">
                            <span>Traits rated</span>
                            <strong>
                                {countRated(form)} of {BEHAVIOR_TRAITS.length}
                            </strong>
                        </div>
                        <div className="admin-behavior-progress-track">
                            <div
                                className="admin-behavior-progress-fill"
                                style={{
                                    width: `${(countRated(form) / BEHAVIOR_TRAITS.length) * 100}%`,
                                }}
                            />
                        </div>
                    </div>

                    {TRAIT_GROUPS.map((group) => (
                        <fieldset key={group.title} className="admin-trait-group">
                            <legend>{group.title}</legend>
                            <div className="admin-trait-grid">
                                {group.traits.map((trait) => (
                                    <TraitScale
                                        key={trait.key}
                                        trait={trait}
                                        value={form[trait.key]}
                                        onChange={updateField}
                                    />
                                ))}
                            </div>
                        </fieldset>
                    ))}

                    <label className="admin-behavior-notes-field">
                        Behavior Notes
                        <textarea
                            rows="5"
                            value={form.notes}
                            onChange={(e) => updateField("notes", e.target.value)}
                            placeholder="Describe observed behavior..."
                        />
                    </label>

                    {message && (
                        <p className={`admin-behavior-message ${messageType}`}>
                            {message}
                        </p>
                    )}

                    <div className="admin-behavior-form-footer">
                        {editingId && (
                            <button
                                type="button"
                                className="admin-secondary-button"
                                onClick={handleCancelEdit}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                        )}
                        <button type="submit" disabled={submitting}>
                            {submitting
                                ? "Saving..."
                                : editingId
                                    ? "Update Assessment"
                                    : "Save Assessment"}
                        </button>
                    </div>
                </form>
            </section>

  {!lockedAnimal && (
            <section className="admin-panel admin-behavior-list-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>
                            Current Behavioral Profiles
                        </h2>

                        <p>
                            Animals with completed behavioral
                            evaluations used for matching.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="admin-behavior-refresh"
                        onClick={fetchAnimals}
                        disabled={loading}
                    >
                        <span aria-hidden="true">⟲</span> Refresh
                    </button>
                </div>

                <div className="admin-behavior-toolbar">
                    <input
                        type="text"
                        placeholder="Search animal..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <select
                        value={filterAssessor}
                        onChange={(e) => setFilterAssessor(e.target.value)}
                    >
                        <option value="All">All Assessors</option>
                        {assessors.map((assessor) => (
                            <option key={assessor} value={assessor}>
                                {assessor}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterSpecies}
                        onChange={(e) => setFilterSpecies(e.target.value)}
                    >
                        <option value="All">Species: All</option>
                        {speciesOptions.map((species) => (
                            <option key={species} value={species}>
                                {species}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <p className="admin-empty">
                        Loading behavioral profiles...
                    </p>
                ) : filteredAnimals.length === 0 ? (
                    <p className="admin-empty">
                        No completed behavioral profiles found.
                    </p>
                ) : (
                    <div className="admin-behavior-list">
                        {filteredAnimals.map((animal) => (
                            <article
                                className="admin-behavior-row"
                                key={animal._id}
                            >
                                <div>
                                    <h3>
                                        {animal.name}
                                    </h3>

                                    <p>
                                        <strong>Type:</strong>{" "}
                                        {animal.type}
                                        {" | "}
                                        <strong>Breed:</strong>{" "}
                                        {animal.breed ||
                                            "Unknown"}
                                    </p>

                                    <p>
                                        <strong>
                                            Energy:
                                        </strong>{" "}
                                        {animal.energyLevel}/5

                                        {" | "}

                                        <strong>
                                            Friendly:
                                        </strong>{" "}
                                        {animal.friendliness}/5

                                        {" | "}

                                        <strong>
                                            Human:
                                        </strong>{" "}
                                        {animal.humanSociability}/5
                                    </p>

                                    <p>
                                        <strong>
                                            Animal:
                                        </strong>{" "}
                                        {animal.animalSociability}/5

                                        {" | "}

                                        <strong>
                                            Trainability:
                                        </strong>{" "}
                                        {animal.trainability}/5
                                    </p>

                                    <p>
                                        <strong>
                                            Anxiety:
                                        </strong>{" "}
                                        {animal.anxietyLevel}/5

                                        {" | "}

                                        <strong>
                                            Aggression:
                                        </strong>{" "}
                                        {animal.aggressionLevel}/5

                                        {" | "}

                                        <strong>
                                            Activity:
                                        </strong>{" "}
                                        {animal.activityLevel}/5
                                    </p>

                                    {animal.behaviorNotes && (
                                        <span>
                                            {animal.behaviorNotes}
                                        </span>
                                    )}

                                    <div className="admin-behavior-actions">
                                        <button
                                            type="button"
                                            className="admin-edit-button"
                                            onClick={() =>
                                                handleEditAssessment(
                                                    animal
                                                )
                                            }
                                        >
                                            Edit
                                        </button>

                                        {isAdmin() && (
                                            <button
                                                type="button"
                                                className="admin-delete-button"
                                                onClick={() =>
                                                    handleEditAssessment(
                                                        animal
                                                    )
                                                }
                                            >
                                                Edit Profile
                                            </button>
                                        )}
                                    </div>
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