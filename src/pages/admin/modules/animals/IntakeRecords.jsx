import { useState } from "react";

const starterIntakes = [
    {
        id: 1,
        animalName: "Bella",
        animalType: "Dog",
        intakeType: "Rescued",
        rescueLocation: "Poblacion, Koronadal",
        intakeDate: "2026-07-18",
        rescuedBy: "Volunteer Team A",
        condition: "Injured",
        notes: "Found with a minor leg injury.",
    },
    {
        id: 2,
        animalName: "Ming",
        animalType: "Cat",
        intakeType: "Owner Surrender",
        rescueLocation: "Koronadal Shelter",
        intakeDate: "2026-07-24",
        rescuedBy: "Owner",
        condition: "Healthy",
        notes: "Owner relocated overseas.",
    },
];

export default function IntakeRecords() {
    const [records, setRecords] = useState(starterIntakes);
    const [form, setForm] = useState({
        animalName: "",
        animalType: "Dog",
        intakeType: "Rescued",
        rescueLocation: "",
        intakeDate: "",
        rescuedBy: "",
        condition: "Healthy",
        notes: "",
    });

    function handleAddRecord(e) {
        e.preventDefault();

        const newRecord = {
            id: Date.now(),
            ...form,
        };

        setRecords((current) => [
            newRecord,
            ...current,
        ]);

        setForm({
            animalName: "",
            animalType: "Dog",
            intakeType: "Rescued",
            rescueLocation: "",
            intakeDate: "",
            rescuedBy: "",
            condition: "Healthy",
            notes: "",
        });
    }
    return (
        <section className="admin-intake-page">
            <section className="admin-panel admin-intake-form-panel">
                <div className="admin-panel-heading">
                    <h2>New Intake Record</h2>
                </div>
                <form
                    className="admin-intake-form"
                    onSubmit={handleAddRecord}
                >
                    <label>
                        Animal Name
                        <input
                            value={form.animalName}
                            onChange={(e)=>
                                setForm({
                                    ...form,
                                    animalName:e.target.value
                                })
                            }
                            required
                        />
                    </label>

                    <label>
                        Animal Type
                        <select
                            value={form.animalType}
                            onChange={(e)=>
                                setForm({
                                    ...form,
                                    animalType:e.target.value
                                })
                            }
                        >
                            <option>Dog</option>
                            <option>Cat</option>
                            <option>Other</option>
                        </select>
                    </label>

                    <label>
                        Intake Type
                        <select
                            value={form.intakeType}
                            onChange={(e)=>
                                setForm({
                                    ...form,
                                    intakeType:e.target.value
                                })
                            }
                        >
                            <option>Rescued</option>
                            <option>Owner Surrender</option>
                            <option>Transferred</option>
                            <option>Stray</option>
                        </select>
                    </label>

                    <label>
                        Rescue Location
                        <input
                            value={form.rescueLocation}
                            onChange={(e)=>
                                setForm({
                                    ...form,
                                    rescueLocation:e.target.value
                                })
                            }
                            required
                        />
                    </label>

                    <label>
                        Intake Date
                        <input
                            type="date"
                            value={form.intakeDate}
                            onChange={(e)=>
                                setForm({
                                    ...form,
                                    intakeDate:e.target.value
                                })
                            }
                            required
                        />
                    </label>

                    <label>
                       Rescued By
                        <input
                            value={form.rescuedBy}
                            onChange={(e)=>
                                setForm({
                                    ...form,
                                    rescuedBy:e.target.value
                                })
                            }
                    />
                    </label>

                    <label>
                        Initial Condition
                        <select
                            value={form.condition}
                            onChange={(e)=>
                                setForm({
                                    ...form,
                                    condition:e.target.value
                                })
                            }
                        >
                            <option>Healthy</option>
                            <option>Injured</option>
                            <option>Critical</option>
                            <option>Under Observation</option>
                        </select>
                    </label>
                    <label className="admin-intake-notes-field">
                        Notes
                        <textarea
                            rows="4"
                            value={form.notes}
                            onChange={(e)=>
                                setForm({
                                    ...form,
                                    notes:e.target.value
                                })
                            }
                        />
                    </label>
                    <button type="submit">
                        Save Intake Record
                    </button>
                </form>
            </section>

            <section className="admin-panel admin-intake-list-panel">
                <div className="admin-panel-heading">

                    <h2>Intake Records</h2>

                </div>

                <div className="admin-intake-list">
                    {
                        records.map((record)=>(
                            <article
                                key={record.id}
                                className="admin-intake-row"
                            >
                                <div>

                                    <h3>

                                        {record.animalName}

                                    </h3>

                                    <p>

                                        <strong>Animal:</strong>{" "}

                                        {record.animalType}

                                    </p>

                                    <p>

                                        <strong>Intake:</strong>{" "}

                                        {record.intakeType}

                                    </p>

                                    <p>

                                        <strong>Location:</strong>{" "}

                                        {record.rescueLocation}

                                    </p>

                                    <p>

                                        <strong>Date:</strong>{" "}

                                        {record.intakeDate}

                                    </p>

                                    <p>

                                        <strong>Rescued By:</strong>{" "}

                                        {record.rescuedBy}

                                    </p>

                                    <p>

                                        <strong>Condition:</strong>{" "}

                                        {record.condition}

                                    </p>

                                    <span>

                                        {record.notes}

                                    </span>
                                </div>
                            </article>
                    ))
                    }
                </div>
            </section>
        </section>
    );

};