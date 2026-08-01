import { useState } from "react";

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

export default function VaccinationRecords() {
    const [vaccinations, setVaccinations] = useState(starterVaccinations);
    const [vaccinationForm, setVaccinationForm] = useState({
        animalName: "",
        vaccineName: "",
        veterinarian: "",
        vaccinationDate: "",
        nextDueDate: "",
        status: "Completed",
        notes: "",
    });

    function handleAddVaccination(e) {
        e.preventDefault();

        const newVaccination = {
            id: Date.now(),
            ...vaccinationForm,
        };

        setVaccinations((current) => [
            newVaccination,
            ...current,
        ]);

        setVaccinationForm({
            animalName: "",
            vaccineName: "",
            veterinarian: "",
            vaccinationDate: "",
            nextDueDate: "",
            status: "Completed",
            notes: "",
        });
    }

    return (
        <section className="admin-vaccination-page">
            <section className="admin-panel admin-vaccination-form-panel">
                <div className="admin-panel-heading">
                    <h2>Add Vaccination Record</h2>
                </div>
                <form
                    className="admin-vaccination-form"
                    onSubmit={handleAddVaccination}
                >

                    <label>
                        Animal Name
                        <input
                            type="text"
                            value={vaccinationForm.animalName}
                            onChange={(e) =>
                                setVaccinationForm({
                                    ...vaccinationForm,
                                    animalName: e.target.value,
                                })
                            }
                            required
                        />
                    </label>

                    <label>
                        Vaccine Name
                        <input
                            type="text"
                            value={vaccinationForm.vaccineName}
                            onChange={(e) =>
                                setVaccinationForm({
                                    ...vaccinationForm,
                                    vaccineName: e.target.value,
                                })
                            }
                            placeholder="Example: Anti-Rabies"
                            required
                        />
                    </label>

                    <label>
                        Veterinarian
                        <input
                            type="text"
                            value={vaccinationForm.veterinarian}
                            onChange={(e) =>
                                setVaccinationForm({
                                    ...vaccinationForm,
                                    veterinarian: e.target.value,
                                })
                            }
                            required
                        />
                    </label>

                    <label>
                        Vaccination Date
                        <input
                            type="date"
                            value={vaccinationForm.vaccinationDate}
                            onChange={(e) =>
                                setVaccinationForm({
                                    ...vaccinationForm,
                                    vaccinationDate: e.target.value,
                                })
                            }
                            required
                        />
                    </label>

                    <label>
                        Next Due Date
                        <input
                            type="date"
                            value={vaccinationForm.nextDueDate}
                            onChange={(e) =>
                                setVaccinationForm({
                                    ...vaccinationForm,
                                    nextDueDate: e.target.value,
                                })
                            }
                            required
                        />
                    </label>

                    <label>
                        Status

                        <select
                            value={vaccinationForm.status}
                            onChange={(e) =>
                                setVaccinationForm({
                                    ...vaccinationForm,
                                    status: e.target.value,
                                })
                            }
                        >
                            <option value="Completed">
                                Completed
                            </option>

                            <option value="Pending">
                                Pending
                            </option>

                            <option value="Overdue">
                                Overdue
                            </option>
                        </select>
                    </label>

                    <label
                        className="admin-vaccination-notes-field"
                    >
                        Notes
                        <textarea
                            rows="4"
                            value={vaccinationForm.notes}
                            onChange={(e) =>
                                setVaccinationForm({
                                    ...vaccinationForm,
                                    notes: e.target.value,
                                })
                            }
                        />

                    </label>
                    <button type="submit">
                        Save Vaccination Record
                    </button>
                </form>
            </section>

            <section className="admin-panel admin-vaccination-list-panel">
                <div className="admin-panel-heading">
                    <h2>Vaccination Records</h2>
                </div>
                <div className="admin-vaccination-list">

                    {vaccinations.map((vaccination) => (

                        <article
                            className="admin-vaccination-row"
                            key={vaccination.id}
                        >

                            <div>

                                <h3>
                                    {vaccination.animalName}
                                </h3>

                                <p>

                                    <strong>
                                        Vaccine:
                                    </strong>

                                    {" "}

                                    {vaccination.vaccineName}

                                </p>

                                <p>

                                    <strong>
                                        Veterinarian:
                                    </strong>

                                    {" "}

                                    {vaccination.veterinarian}

                                </p>

                                <p>

                                    <strong>
                                        Vaccinated:
                                    </strong>

                                    {" "}

                                    {vaccination.vaccinationDate}

                                </p>

                                <p>

                                    <strong>
                                        Next Due:
                                    </strong>

                                    {" "}

                                    {vaccination.nextDueDate}

                                </p>

                                <span
                                    className={`admin-vaccination-status ${vaccination.status.toLowerCase()}`}
                                >
                                    {vaccination.status}
                                </span>

                                <p>

                                    {vaccination.notes}

                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </section>
    );
}