import { useState } from "react";
import { isAdmin } from "../../../../utils/auth";
import InfoTip from "../../../../components/system/InfoTip";

const starterVaccinations = [
    {
        id: 1,
        animalName: "Max",
        vaccineName: "Anti-Rabies",
        veterinarian: "Dr. Santos",
        vaccinationDate: "2026-06-20",
        nextDueDate: "2027-06-20",
        status: "Completed",
        notes: "Annual anti-rabies vaccination completed.",
    },
    {
        id: 2,
        animalName: "Luna",
        vaccineName: "5-in-1 Vaccine",
        veterinarian: "Dr. Reyes",
        vaccinationDate: "2026-07-05",
        nextDueDate: "2027-07-05",
        status: "Completed",
        notes: "No adverse reactions observed.",
    },
];

// "2026-06-20" → "Jun 20, 2026"; empty → "—"
function formatVaccineDate(value) {
    if (!value) return "—";

    const date = new Date(`${value}T00:00:00`); // local date, no timezone shift
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default function VaccinationRecords({ lockedAnimal = null }) {
    const blankForm = {
        animalName: lockedAnimal?.name || "",
        vaccineName: "",
        veterinarian: "",
        vaccinationDate: "",
        nextDueDate: "",
        status: "Completed",
        notes: "",
    };

    const [vaccinations, setVaccinations] = useState(starterVaccinations);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [vaccinationForm, setVaccinationForm] = useState(blankForm);

    function handleAddVaccination(e) {
        e.preventDefault();

        if (editingId) {
            setVaccinations((current) =>
                current.map((vaccination) =>
                    vaccination.id === editingId
                        ? {
                            ...vaccination,
                            ...vaccinationForm
                        }
                        : vaccination
                )
            );

            setEditingId(null);
        } else {
            const newVaccination = {
                id: Date.now(),
                ...vaccinationForm,
            }

            setVaccinations((current) => [
                newVaccination,
                ...current,
            ]);
        }

        setVaccinationForm(blankForm);
    }

    function handleEditVaccination(vaccination) {
        setEditingId(vaccination.id);

        setVaccinationForm({
            animalName: vaccination.animalName,
            vaccineName: vaccination.vaccineName,
            veterinarian: vaccination.veterinarian,
            vaccinationDate: vaccination.vaccinationDate,
            nextDueDate: vaccination.nextDueDate,
            status: vaccination.status,
            notes: vaccination.notes,
        });
    }

    function handleDeleteVaccination(id) {
        if (!isAdmin()) {
            alert("Only administrators can delete can delete vaccination records.");
            return;
        }

        setVaccinations((current) =>
            current.filter(
                (vaccination) => vaccination.id !== id
            )
        )
    }

    const filteredVaccinations = vaccinations.filter((vaccination) => {
        const matchesAnimal = !lockedAnimal || vaccination.animalName === lockedAnimal.name;
        const matchesSearch = vaccination.animalName.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === "All" || vaccination.status === filterStatus;
        return matchesAnimal && matchesSearch && matchesStatus;
    });

    const columnCount = lockedAnimal ? 7 : 8;

    return (
        <section className="admin-vaccination-page">
            <section className="admin-panel admin-vaccination-form-panel">
                {!lockedAnimal && (
                    <div className="admin-panel-heading">
                        <h2>{
                            editingId
                                ? "Editing Vaccination Record"
                                : "Add Vaccination Record"
                        }</h2>
                    </div>
                )}
                <form
                    className="admin-vaccination-form"
                    onSubmit={handleAddVaccination}
                >
                    <label>
                        <span className="admin-field-label">
                            Animal Name
                            {!lockedAnimal && <span className="admin-required">*</span>}
                        </span>
                        <input
                            type="text"
                            readOnly={Boolean(lockedAnimal)}
                            value={vaccinationForm.animalName}
                            onChange={(e) =>
                                setVaccinationForm({ ...vaccinationForm, animalName: e.target.value })
                            }
                            placeholder="e.g. Max"
                            required
                        />
                    </label>

                    <label>
                        <span className="admin-field-label">
                            Vaccine Name <span className="admin-required">*</span>
                        </span>
                        <input
                            type="text"
                            value={vaccinationForm.vaccineName}
                            onChange={(e) =>
                                setVaccinationForm({ ...vaccinationForm, vaccineName: e.target.value })
                            }
                            placeholder="Example: Anti-Rabies"
                            required
                        />
                    </label>

                    <label>
                        <span className="admin-field-label">Veterinarian</span>
                        <input
                            type="text"
                            value={vaccinationForm.veterinarian}
                            onChange={(e) =>
                                setVaccinationForm({ ...vaccinationForm, veterinarian: e.target.value })
                            }
                            placeholder="e.g. Dr. Santos"
                        />
                    </label>

                    <label>
                        <span className="admin-field-label">
                            Vaccination Date <span className="admin-required">*</span>
                        </span>
                        <input
                            type="date"
                            value={vaccinationForm.vaccinationDate}
                            onChange={(e) =>
                                setVaccinationForm({ ...vaccinationForm, vaccinationDate: e.target.value })
                            }
                            required
                        />
                    </label>

                    <label>
                        <span className="admin-field-label">
                            Next Due Date
                            <InfoTip text="Leave blank for one-time vaccines. Fill it in when a booster is needed. It can't be earlier than the vaccination date." />
                        </span>
                        <input
                            type="date"
                            value={vaccinationForm.nextDueDate}
                            min={vaccinationForm.vaccinationDate || undefined}
                            onChange={(e) =>
                                setVaccinationForm({ ...vaccinationForm, nextDueDate: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        <span className="admin-field-label">
                            Status <span className="admin-required">*</span>
                            <InfoTip text="Completed: the vaccine was given. Pending: scheduled but not given yet. Overdue: the due date passed and it wasn't given." />
                        </span>
                        <select
                            value={vaccinationForm.status}
                            onChange={(e) =>
                                setVaccinationForm({ ...vaccinationForm, status: e.target.value })
                            }
                            required
                        >
                            <option value="Completed">Completed</option>
                            <option value="Pending">Pending</option>
                            <option value="Overdue">Overdue</option>
                        </select>
                    </label>

                    <label className="admin-vaccination-notes-field">
                        <span className="admin-field-label">Notes</span>
                        <textarea
                            rows="4"
                            value={vaccinationForm.notes}
                            onChange={(e) =>
                                setVaccinationForm({ ...vaccinationForm, notes: e.target.value })
                            }
                            placeholder="Optional: reactions, batch number, reminders..."
                        />
                    </label>

                    <button type="submit" className="admin-vaccination-save">
                        {editingId
                            ? "Update Vaccination Record"
                            : "Save Vaccination Record"}
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={() => {
                                setEditingId(null);
                                setVaccinationForm(blankForm);
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </form>
            </section>

            <section className="admin-panel admin-vaccination-list-panel">
                <div className="admin-vacc-list-heading">
                    <h2>Vaccination Records</h2>

                    <div className="admin-vacc-list-controls">
                        {!lockedAnimal && (
                            <input
                                type="text"
                                className="admin-vacc-search"
                                placeholder="Search animal..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        )}

                        <select
                            className="admin-vacc-status-filter"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">Status: All</option>
                            <option value="Completed">Status: Completed</option>
                            <option value="Pending">Status: Pending</option>
                            <option value="Overdue">Status: Overdue</option>
                        </select>
                    </div>
                </div>

                <div className="admin-vacc-table-wrap">
                    <table className="admin-vacc-table">
                        <thead>
                            <tr>
                                {!lockedAnimal && <th>Animal</th>}
                                <th>Vaccine</th>
                                <th>Vaccination Date</th>
                                <th>Next Due</th>
                                <th>Veterinarian</th>
                                <th>Status</th>
                                <th>Notes</th>
                                <th aria-label="Actions"></th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredVaccinations.length === 0 ? (
                                <tr>
                                    <td colSpan={columnCount} className="admin-vacc-empty">
                                        {vaccinations.length === 0
                                            ? "No vaccinations added yet."
                                            : "No vaccinations match this filter."}
                                    </td>
                                </tr>
                            ) : (
                                filteredVaccinations.map((vaccination) => (
                                    <tr key={vaccination.id}>
                                        {!lockedAnimal && <td>{vaccination.animalName}</td>}
                                        <td className="admin-vacc-name">{vaccination.vaccineName}</td>
                                        <td>{formatVaccineDate(vaccination.vaccinationDate)}</td>
                                        <td>{formatVaccineDate(vaccination.nextDueDate)}</td>
                                        <td>{vaccination.veterinarian || "—"}</td>
                                        <td>
                                            <span
                                                className={`admin-vacc-status ${String(vaccination.status).toLowerCase()}`}
                                            >
                                                {vaccination.status}
                                            </span>
                                        </td>
                                        <td className="admin-vacc-notes">{vaccination.notes || "—"}</td>
                                        <td>
                                            <div className="admin-vacc-actions">
                                                <button
                                                    type="button"
                                                    className="edit"
                                                    onClick={() => handleEditVaccination(vaccination)}
                                                >
                                                    Edit
                                                </button>

                                                {isAdmin() && (
                                                    <button
                                                        type="button"
                                                        className="delete"
                                                        onClick={() => handleDeleteVaccination(vaccination.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    );
}