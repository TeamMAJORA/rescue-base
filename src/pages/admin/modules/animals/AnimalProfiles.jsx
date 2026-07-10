import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

const emptyAnimalForm = {
    name: "",
    type: "Dog",
    breed: "",
    age: "",
    gender: "Unknown",
    size: "Unknown",
    color: "",
    image: "",
    description: "",
    medicalStatus: "",
    behaviorNotes: "",
    intakeCondition: "Unknown",
    availabilityStatus: "available",
    adoptionStatus: "available",
    fosterStatus: "none",
    location: "RescueBase Shelter",
};

export default function AnimalProfiles() {
    const [animals, setAnimals] = useState([]);
    const [animalForm, setAnimalForm] = useState(emptyAnimalForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const totalAnimals = animals.length;

    const availableAnimals = useMemo(() => {
        return animals.filter(
            (animal) =>
                animal.availabilityStatus === "available" &&
                animal.adoptionStatus === "available"
        ).length;
    }, [animals]);

    const pendingAnimals = useMemo(() => {
        return animals.filter((animal) => animal.adoptionStatus === "pending").length;
    }, [animals]);

    const adoptedAnimals = useMemo(() => {
        return animals.filter((animal) => animal.adoptionStatus === "adopted").length;
    }, [animals]);

    async function fetchAnimals() {
        try {
            setLoading(true);
            setMessage("");

            const response = await fetch(`${API}/api/animals`);
            const data = await response.json();

            console.log("Animals:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to fetch animals.");
                return;
            }

            setAnimals(data.animals || []);
        } catch (error) {
            console.error("Fetch animals error:", error);
            setMessage("Server error while fetching animals.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitAnimal(e) {
        e.preventDefault();

        try {
            setSubmitting(true);
            setMessage("");

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_user") || "{}"
            );

            const payload = {
                ...animalForm,
                age: Number(animalForm.age || 0),
                adminName: savedUser.name || savedUser.username || "Admin User",
                adminEmail: savedUser.email || "admin",
            };

            const endpoint = editingId
                ? `${API}/api/animals/${editingId}`
                : `${API}/api/animals`;

            const method = editingId ? "PATCH" : "POST";

            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            console.log("Save animal:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to save animal profile.");
                return;
            }

            setMessage(
                editingId
                    ? "Animal profile updated successfully."
                    : "Animal profile created successfully."
            );

            setAnimalForm(emptyAnimalForm);
            setEditingId(null);
            fetchAnimals();
        } catch (error) {
            console.error("Save animal error:", error);
            setMessage("Server error while saving animal profile.");
        } finally {
            setSubmitting(false);
        }
    }

    function handleEditAnimal(animal) {
        setEditingId(animal._id);

        setAnimalForm({
            name: animal.name || "",
            type: animal.type || "Dog",
            breed: animal.breed || "",
            age: animal.age || "",
            gender: animal.gender || "Unknown",
            size: animal.size || "Unknown",
            color: animal.color || "",
            image: animal.image || "",
            description: animal.description || "",
            medicalStatus: animal.medicalStatus || "",
            behaviorNotes: animal.behaviorNotes || "",
            intakeCondition: animal.intakeCondition || "Unknown",
            availabilityStatus: animal.availabilityStatus || "available",
            adoptionStatus: animal.adoptionStatus || "available",
            fosterStatus: animal.fosterStatus || "none",
            location: animal.location || "RescueBase Shelter",
        });

        setMessage("Editing animal profile.");
    }

    function handleCancelEdit() {
        setEditingId(null);
        setAnimalForm(emptyAnimalForm);
        setMessage("");
    }

    async function handleDeleteAnimal(id) {
        const confirmed = window.confirm("Delete this animal profile?");

        if (!confirmed) return;

        try {
            setMessage("");

            const response = await fetch(`${API}/api/animals/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            console.log("Delete animal:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to delete animal profile.");
                return;
            }

            setMessage("Animal profile deleted successfully.");

            if (editingId === id) {
                handleCancelEdit();
            }

            fetchAnimals();
        } catch (error) {
            console.error("Delete animal error:", error);
            setMessage("Server error while deleting animal profile.");
        }
    }

    useEffect(() => {
        fetchAnimals();
    }, []);

    return (
        <section className="admin-animal-page">
            <div className="admin-animal-stats">
                <article className="admin-stat-card">
                    <span>Total Animals</span>
                    <strong>{totalAnimals}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Available</span>
                    <strong>{availableAnimals}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Pending Adoption</span>
                    <strong>{pendingAnimals}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Adopted</span>
                    <strong>{adoptedAnimals}</strong>
                </article>
            </div>

            <section className="admin-panel admin-animal-form-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>{editingId ? "Update Animal Profile" : "Create Animal Profile"}</h2>
                        <p>Manage animal details, availability, adoption status, and foster status.</p>
                    </div>

                    {editingId && (
                        <button type="button" onClick={handleCancelEdit}>
                            Cancel Edit
                        </button>
                    )}
                </div>

                <form className="admin-animal-form" onSubmit={handleSubmitAnimal}>
                    <label>
                        Name
                        <input
                            value={animalForm.name}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, name: e.target.value })
                            }
                            required
                        />
                    </label>

                    <label>
                        Type
                        <select
                            value={animalForm.type}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, type: e.target.value })
                            }
                        >
                            <option value="Dog">Dog</option>
                            <option value="Cat">Cat</option>
                            <option value="Other">Other</option>
                        </select>
                    </label>

                    <label>
                        Breed
                        <input
                            value={animalForm.breed}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, breed: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Age
                        <input
                            type="number"
                            min="0"
                            value={animalForm.age}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, age: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Gender
                        <select
                            value={animalForm.gender}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, gender: e.target.value })
                            }
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Unknown">Unknown</option>
                        </select>
                    </label>

                    <label>
                        Size
                        <select
                            value={animalForm.size}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, size: e.target.value })
                            }
                        >
                            <option value="Small">Small</option>
                            <option value="Medium">Medium</option>
                            <option value="Large">Large</option>
                            <option value="Unknown">Unknown</option>
                        </select>
                    </label>

                    <label>
                        Color
                        <input
                            value={animalForm.color}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, color: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Image URL
                        <input
                            value={animalForm.image}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, image: e.target.value })
                            }
                            placeholder="Paste image URL"
                        />
                    </label>

                    <label>
                        Intake Condition
                        <select
                            value={animalForm.intakeCondition}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    intakeCondition: e.target.value,
                                })
                            }
                        >
                            <option value="Healthy">Healthy</option>
                            <option value="Injured">Injured</option>
                            <option value="Sick">Sick</option>
                            <option value="Under Observation">Under Observation</option>
                            <option value="Unknown">Unknown</option>
                        </select>
                    </label>

                    <label>
                        Availability
                        <select
                            value={animalForm.availabilityStatus}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    availabilityStatus: e.target.value,
                                })
                            }
                        >
                            <option value="available">Available</option>
                            <option value="unavailable">Unavailable</option>
                        </select>
                    </label>

                    <label>
                        Adoption Status
                        <select
                            value={animalForm.adoptionStatus}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    adoptionStatus: e.target.value,
                                })
                            }
                        >
                            <option value="available">Available</option>
                            <option value="pending">Pending</option>
                            <option value="adopted">Adopted</option>
                        </select>
                    </label>

                    <label>
                        Foster Status
                        <select
                            value={animalForm.fosterStatus}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    fosterStatus: e.target.value,
                                })
                            }
                        >
                            <option value="none">None</option>
                            <option value="in_foster">In Foster</option>
                            <option value="completed">Completed</option>
                        </select>
                    </label>

                    <label>
                        Location
                        <input
                            value={animalForm.location}
                            onChange={(e) =>
                                setAnimalForm({ ...animalForm, location: e.target.value })
                            }
                        />
                    </label>

                    <label className="admin-animal-wide">
                        Description
                        <textarea
                            value={animalForm.description}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    description: e.target.value,
                                })
                            }
                        />
                    </label>

                    <label className="admin-animal-wide">
                        Medical Status
                        <textarea
                            value={animalForm.medicalStatus}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    medicalStatus: e.target.value,
                                })
                            }
                        />
                    </label>

                    <label className="admin-animal-wide">
                        Behavior Notes
                        <textarea
                            value={animalForm.behaviorNotes}
                            onChange={(e) =>
                                setAnimalForm({
                                    ...animalForm,
                                    behaviorNotes: e.target.value,
                                })
                            }
                        />
                    </label>

                    {message && <p className="admin-animal-message">{message}</p>}

                    <button type="submit" disabled={submitting}>
                        {submitting
                            ? "Saving..."
                            : editingId
                            ? "Update Animal"
                            : "Save Animal"}
                    </button>
                </form>
            </section>

            <section className="admin-panel admin-animal-list-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Animal Profiles</h2>
                        <p>View and manage registered rescue animals.</p>
                    </div>

                    <button type="button" onClick={fetchAnimals}>
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <p className="admin-empty">Loading animal profiles...</p>
                ) : animals.length === 0 ? (
                    <p className="admin-empty">No animal profiles found.</p>
                ) : (
                    <div className="admin-animal-list">
                        {animals.map((animal) => (
                            <article className="admin-animal-card" key={animal._id}>
                                <div className="admin-animal-image">
                                    {animal.image ? (
                                        <img src={animal.image} alt={animal.name} />
                                    ) : (
                                        <span>🐾</span>
                                    )}
                                </div>

                                <div className="admin-animal-info">
                                    <h3>{animal.name}</h3>
                                    <p>
                                        {animal.type} • {animal.breed || "Unknown breed"} •{" "}
                                        {animal.gender}
                                    </p>
                                    <small>{animal.location || "RescueBase Shelter"}</small>

                                    <div className="admin-animal-badges">
                                        <span>{animal.availabilityStatus}</span>
                                        <span>{animal.adoptionStatus}</span>
                                        <span>{animal.fosterStatus}</span>
                                    </div>
                                </div>

                                <div className="admin-animal-details">
                                    <p>
                                        <b>Age:</b> {animal.age || 0}
                                    </p>
                                    <p>
                                        <b>Size:</b> {animal.size}
                                    </p>
                                    <p>
                                        <b>Condition:</b> {animal.intakeCondition}
                                    </p>
                                </div>

                                <div className="admin-animal-actions">
                                    <button
                                        type="button"
                                        onClick={() => handleEditAnimal(animal)}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        className="delete"
                                        onClick={() => handleDeleteAnimal(animal._id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}