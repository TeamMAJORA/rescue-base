import { useState } from "react";

const starterIntakes = [
    {
        id: 1,
        animalName: "Max",
        intakeType: "Rescue",
        intakeDate: "2026-06-25",
        foundLocation: "Cebu City",
        condition: "Good",
        notes: "Rescued near roadside. No visible injuries.",
    },
    {
        id: 2,
        animalName: "Luna",
        intakeType: "Surrender",
        intakeDate: "2026-06-26",
        foundLocation: "Talisay City",
        condition: "Needs Observation",
        notes: "Owner surrendered due to relocation.",
    },
];

export default function IntakeRecords() {
    const [intakes, setIntakes] = useState(starterIntakes);

    const [intakeForm, setIntakeForm] = useState({
        animalName: "",
        intakeType: "Rescue",
        intakeDate: "",
        foundLocation: "",
        condition: "Good",
        notes: "",
    });

    function handleAddIntake(e) {
        e.preventDefault();

        const newIntake = {
            id: Date.now(),
            ...intakeForm,
        };

        setIntakes((current) => [newIntake, ...current]);

        setIntakeForm({
            animalName: "",
            intakeType: "Rescue",
            intakeDate: "",
            foundLocation: "",
            condition: "Good",
            notes: "",
        });
    }

    return (
        <section className="admin-intake-page">
            <section className="admin-panel admin-intake-form-panel">
                <div className="admin-panel-heading">
                    <h2>Add Intake Record</h2>
                </div>

                <form className="admin-intake-form" onSubmit={handleAddIntake}>
                    <label>
                        Animal Name
                        <input
                            type="text"
                            value={intakeForm.animalName}
                            onChange={(e) =>
                                setIntakeForm({
                                    ...intakeForm,
                                    animalName: e.target.value,
                                })
                            }
                            placeholder="Example: Max"
                            required
                        />
                    </label>

                    <label>
                        Intake Type
                        <select
                            value={intakeForm.intakeType}
                            onChange={(e) =>
                                setIntakeForm({
                                    ...intakeForm,
                                    intakeType: e.target.value,
                                })
                            }
                        >
                            <option value="Rescue">Rescue</option>
                            <option value="Surrender">Surrender</option>
                            <option value="Transfer">Transfer</option>
                            <option value="Found Stray">Found Stray</option>
                        </select>
                    </label>

                    <label>
                        Intake Date
                        <input
                            type="date"
                            value={intakeForm.intakeDate}
                            onChange={(e) =>
                                setIntakeForm({
                                    ...intakeForm,
                                    intakeDate: e.target.value,
                                })
                            }
                            required
                        />
                    </label>

                    <label>
                        Found / Source Location
                        <input
                            type="text"
                            value={intakeForm.foundLocation}
                            onChange={(e) =>
                                setIntakeForm({
                                    ...intakeForm,
                                    foundLocation: e.target.value,
                                })
                            }
                            placeholder="Example: Cebu City"
                            required
                        />
                    </label>

                    <label>
                        Condition
                        <select
                            value={intakeForm.condition}
                            onChange={(e) =>
                                setIntakeForm({
                                    ...intakeForm,
                                    condition: e.target.value,
                                })
                            }
                        >
                            <option value="Good">Good</option>
                            <option value="Needs Observation">Needs Observation</option>
                            <option value="Injured">Injured</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </label>

                    <label className="admin-intake-notes-field">
                        Notes
                        <textarea
                            value={intakeForm.notes}
                            onChange={(e) =>
                                setIntakeForm({
                                    ...intakeForm,
                                    notes: e.target.value,
                                })
                            }
                            placeholder="Write intake details here..."
                            required
                        />
                    </label>

                    <button type="submit">Add Intake Record</button>
                </form>
            </section>

            <section className="admin-panel admin-intake-list-panel">
                <div className="admin-panel-heading">
                    <h2>Intake Records</h2>
                </div>

                <div className="admin-intake-list">
                    {intakes.map((intake) => (
                        <article className="admin-intake-row" key={intake.id}>
                            <div>
                                <h3>{intake.animalName}</h3>

                                <p>
                                    {intake.intakeType} • {intake.intakeDate} •{" "}
                                    {intake.condition}
                                </p>

                                <small>{intake.foundLocation}</small>

                                <span>{intake.notes}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </section>
    );
}