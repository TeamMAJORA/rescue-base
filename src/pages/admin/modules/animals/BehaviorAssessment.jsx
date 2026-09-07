import { useEffect, useState } from "react";
import { isAdmin } from "../../../../utils/auth";

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

const factorLabels = [
    ["Energy Level", "energyLevel"],
    ["Friendliness", "friendliness"],
    ["Human Sociability", "humanSociability"],
    ["Animal Sociability", "animalSociability"],
    ["Trainability", "trainability"],
    ["Anxiety Level", "anxietyLevel"],
    ["Aggression Level", "aggressionLevel"],
    ["Activity Level", "activityLevel"],
]

export default function BehaviorAssessment() {
    const [animals, setAnimals] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState("");
    const [search, setSearch] = useState("");
    const [filterAssessor, setFilterAssessor] = useState("All");
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

        const selectedAnimal = animals.find(
            (animal) => animal._id === animalId
        );

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

            setMessage("success");
            setEditingId("");
            setForm(emptyForm);

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
            animals
                .map((animal) => animal.behaiorAssessor).filter(Boolean)
        ),
    ];

    const filteredAnimals = animals.filter((animal) => {
        const searchValue = search.toLowerCase().trim();
        const matchesSearch = animal.name?.toLowerCase().includes(searchValue) ||
            animal.breed?.toLowerCase().includes(searchValue);
        const hasAssessment = animal.energyLevel !== null & animal.energyLevel !== undefined;
        const matchesAssessor = filterAssessor === "All" || animal.behaiorAssessor === filterAssessor;

        return matchesSearch && matchesAssessor && hasAssessment;
    });

    return (
        <section className="admin-behavior-page">
            <section className="admin-panel admin-behavior-form-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>
                            {editingId
                                ? "Edit Behavioral Assessment"
                                : "Behavioral Assessment"}
                        </h2>

                        <p>
                            Manually evaluate an animal's behavior
                            using the eight matching factors.
                        </p>
                    </div>
                </div>

                <form
                    className="admin-behavior-form"
                    onSubmit={handleSubmit}
                >
                    <label>
                        Animal

                        <select
                            value={form.animalId}
                            onChange={handleAnimalChange}
                            required
                        >
                            <option value="">
                                Select an animal
                            </option>

                            {animals.map((animal) => (
                                <option
                                    key={animal._id}
                                    value={animal._id}
                                >
                                    {animal.name} — {animal.type}
                                    {animal.breed
                                        ? ` — ${animal.breed}`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Assessed By

                        <input
                            value={form.assessor}
                            onChange={(e) =>
                                updateField(
                                    "assessor",
                                    e.target.value
                                )
                            }
                            placeholder="Shelter Staff / Volunteer"
                            required
                        />
                    </label>

                    <label>
                        Assessment Date

                        <input
                            type="date"
                            value={form.assessmentDate}
                            onChange={(e) =>
                                updateField(
                                    "assessmentDate",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </label>

                    {factorLabels.map(([label, key]) => (
                        <label key={key}>
                            {label}

                            <select
                                value={form[key]}
                                onChange={(e) =>
                                    updateField(
                                        key,
                                        Number(e.target.value)
                                    )
                                }
                            >
                                <option value={1}>
                                    1 — Very Low
                                </option>

                                <option value={2}>
                                    2 — Low
                                </option>

                                <option value={3}>
                                    3 — Moderate
                                </option>

                                <option value={4}>
                                    4 — High
                                </option>

                                <option value={5}>
                                    5 — Very High
                                </option>
                            </select>
                        </label>
                    ))}

                    <label className="admin-behavior-notes-field">
                        Behavior Notes

                        <textarea
                            rows="5"
                            value={form.notes}
                            onChange={(e) =>
                                updateField(
                                    "notes",
                                    e.target.value
                                )
                            }
                            placeholder="Describe observed behavior..."
                        />
                    </label>

                    {message && (
                        <p
                            className={`admin-behavior-message ${messageType}`}
                        >
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                    >
                        {submitting
                            ? "Saving..."
                            : editingId
                                ? "Update Assessment"
                                : "Save Assessment"}
                    </button>

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
                </form>
            </section>

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
                        onClick={fetchAnimals}
                        disabled={loading}
                    >
                        Refresh
                    </button>
                </div>

                <input
                    type="text"
                    placeholder="Search animal..."
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                />

                <select
                    value={filterAssessor}
                    onChange={(e) =>
                        setFilterAssessor(e.target.value)
                    }
                >
                    <option value="All">
                        All Assessors
                    </option>

                    {assessors.map((assessor) => (
                        <option
                            key={assessor}
                            value={assessor}
                        >
                            {assessor}
                        </option>
                    ))}
                </select>

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
        </section>
    );
}