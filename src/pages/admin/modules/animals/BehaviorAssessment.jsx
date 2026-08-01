import { useState } from "react";

const starterAssessments = [
    {
        id: 1,
        animalName: "Bella",
        assessor: "Shelter Staff",
        assessmentDate: "2026-07-30",
        energyLevel: 4,
        friendliness: 5,
        humanSociability: 5,
        animalSociability: 4,
        trainability: 4,
        confidence: 3,
        anxietyLevel: 2,
        aggressionLevel: 1,
        notes: "Very friendly and suitable for first-time adopters.",
    },
    {
        id: 2,
        animalName: "Max",
        assessor: "Volunteer Team",
        assessmentDate: "2026-07-27",
        energyLevel: 5,
        friendliness: 4,
        humanSociability: 4,
        animalSociability: 3,
        trainability: 4,
        confidence: 5,
        anxietyLevel: 1,
        aggressionLevel: 1,
        notes: "Highly energetic and loves outdoor activities.",
    },
];

export default function BehaviorAssessment() {
    const [assessments, setAssessments] = useState(starterAssessments);
    const [form, setForm] = useState({
        animalName: "",
        assessor: "",
        assessmentDate: "",
        energyLevel: 3,
        friendliness: 3,
        humanSociability: 3,
        animalSociability: 3,
        trainability: 3,
        confidence: 3,
        anxietyLevel: 3,
        aggressionLevel: 3,
        notes: "",
    });

    function updateField(name, value) {
        setForm({
            ...form,
            [name]: value,
        });
    }

    function handleSubmit(e) {
        e.preventDefault();

        const newAssessment = {
            id: Date.now(),
            ...form,
        }

        setAssessments((current) => [
            newAssessment,
            ...current,
        ]);

        setForm({
            animalName: "",
            assessor: "",
            assessmentDate: "",
            energyLevel: 3,
            friendliness: 3,
            humanSociability: 3,
            animalSociability: 3,
            trainability: 3,
            confidence: 3,
            anxietyLevel: 3,
            aggressionLevel: 3,
            notes: "",
        });
    }

    return (
        <section className="admin-behavior-page">
            <section className="admin-panel admin-behavior-form-panel">
                <div className="admin-panel-heading">
                    <h2>Behavioral Assessment</h2>
                </div>
                <form
                    className="admin-behavior-form"
                    onSubmit={handleSubmit}
                >
                    <label>
                        Animal Name
                        <input
                            value={form.animalName}
                            onChange={(e) =>
                                updateField(
                                    "animalName",
                                    e.target.value
                                )
                            }
                            required
                        />
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

                    {[
                        ["Energy Level", "energyLevel"],
                        ["Friendliness", "friendliness"],
                        ["Human Sociability", "humanSociability"],
                        ["Animal Sociability", "animalSociability"],
                        ["Trainability", "trainability"],
                        ["Confidence", "confidence"],
                        ["Anxiety Level", "anxietyLevel"],
                        ["Aggression Level", "aggressionLevel"],
                    ].map(([label, key]) => (
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
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                                <option value={4}>4</option>
                                <option value={5}>5</option>
                            </select>
                        </label>
                    ))}

                    <label
                        className="admin-behavior-notes-field"
                    >
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
                        />
                    </label>

                    <button type="submit">
                        Save Assessment
                    </button>
                </form>
            </section>

            <section className="admin-panel admin-behavior-list-panel">
                <div className="admin-panel-heading">
                    <h2>
                        Previous Assessments
                    </h2>
                </div>

                <div className="admin-behavior-list">
                    {
                        assessments.map((assessment) => (
                            <article
                                className="admin-behavior-row"
                                key={assessment.id}
                            >

                                <div>
                                    <h3>
                                        {assessment.animalName}
                                    </h3>

                                    <p>
                                        <strong>Assessor:</strong>{" "}
                                        {assessment.assessor}
                                    </p>

                                    <p>
                                        <strong>Date:</strong>{" "}
                                        {assessment.assessmentDate}
                                    </p>

                                    <p>
                                        Energy:
                                        {" "}
                                        {assessment.energyLevel}
                                        /5

                                        {" | "}

                                        Friendly:
                                        {" "}
                                        {assessment.friendliness}
                                        /5

                                        {" | "}

                                        Human:
                                        {" "}
                                        {assessment.humanSociability}
                                        /5
                                    </p>

                                    <p>
                                        Animal:
                                        {" "}
                                        {assessment.animalSociability}
                                        /5

                                        {" | "}

                                        Trainability:
                                        {" "}
                                        {assessment.trainability}
                                        /5
                                    </p>

                                    <p>
                                        Confidence:
                                        {" "}
                                        {assessment.confidence}
                                        /5

                                        {" | "}

                                        Anxiety:
                                        {" "}
                                        {assessment.anxietyLevel}
                                        /5

                                        {" | "}

                                        Aggression:
                                        {" "}
                                        {assessment.aggressionLevel}
                                        /5
                                    </p>

                                    <span>
                                        {assessment.notes}
                                    </span>
                                </div>
                            </article>
                        ))
                    }
                </div>
            </section>
        </section>
    );
}