import { useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function WeeklyUpdates({
    assignment,
    refreshAssignment,
}) {
    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    const [form, setForm] = useState({
        healthStatus: "Good",
        weight: "",
        appetite: "Normal",
        behavior: "Calm",
        medication: false,
        exercise: false,
        note: "",
        photoUrl: "",
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    function updateField(name, value) {
        setForm({
            ...form,
            [name]: value,
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!assignment?._id) {
            setMessage(
                "No active foster assignment."
            );
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            const response = await fetch(
                `${API}/api/foster/assignments/${assignment._id}/updates`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...form,

                        submittedBy:
                            savedUser.username ||
                            savedUser.name,

                        submittedByEmail:
                            savedUser.email,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Unable to submit weekly report."
                );
                return;
            }

            setMessage(
                "Weekly report submitted successfully."
            );

            setForm({
                healthStatus: "Good",
                weight: "",
                appetite: "Normal",
                behavior: "Calm",
                medication: false,
                exercise: false,
                note: "",
                photoUrl: "",
            });
            refreshAssignment?.();
        } catch (error) {
            console.error(error);

            setMessage("Server Failed to fetch data.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="foster-weekly-page">
            <section className="foster-panel">
                <div className="foster-section-heading">
                    <div>
                        <span>
                            Weekly Care Report
                        </span>
                        <h2>
                            Submit Weekly Update
                        </h2>
                    </div>
                </div>
                <form
                    className="foster-update-form"
                    onSubmit={handleSubmit}
                >
                    <div className="update-grid">
                        <label>
                            Overall Health
                            <select
                                value={form.healthStatus}
                                onChange={(e) =>
                                    updateField(
                                        "healthStatus",
                                        e.target.value
                                    )
                                }
                            >
                                <option>
                                    Excellent
                                </option>

                                <option>
                                    Good
                                </option>

                                <option>
                                    Fair
                                </option>

                                <option>
                                    Needs Attention
                                </option>
                            </select>
                        </label>

                        <label>
                            Weight (kg)
                            <input
                                type="number"
                                step="0.1"
                                value={form.weight}
                                onChange={(e) =>
                                    updateField(
                                        "weight",
                                        e.target.value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Appetite
                            <select
                                value={form.appetite}
                                onChange={(e) =>
                                    updateField(
                                        "appetite",
                                        e.target.value
                                    )
                                }
                            >
                                <option>
                                    Excellent
                                </option>

                                <option>
                                    Normal
                                </option>

                                <option>
                                    Poor
                                </option>
                            </select>
                        </label>

                        <label>
                            Behavior
                            <select
                                value={form.behavior}
                                onChange={(e) =>
                                    updateField(
                                        "behavior",
                                        e.target.value
                                    )
                                }
                            >
                                <option>
                                    Playful
                                </option>

                                <option>
                                    Calm
                                </option>

                                <option>
                                    Shy
                                </option>

                                <option>
                                    Aggressive
                                </option>
                            </select>
                        </label>
                    </div>

                    <div className="update-checks">
                        <label>
                            <input
                                type="checkbox"
                                checked={form.medication}
                                onChange={(e) =>
                                    updateField(
                                        "medication",
                                        e.target.checked
                                    )
                                }
                            />
                            Medication Given
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={form.exercise}
                                onChange={(e) =>
                                    updateField(
                                        "exercise",
                                        e.target.checked
                                    )
                                }
                            />
                            Exercise Completed
                        </label>
                    </div>

                    <label>
                        Photo URL
                        <input
                            value={form.photoUrl}
                            onChange={(e) =>
                                updateField(
                                    "photoUrl",
                                    e.target.value
                                )
                            }
                            placeholder="Cloudinary image URL"
                        />
                    </label>

                    <label>
                        Progress Report
                        <textarea
                            rows="6"
                            value={form.note}
                            onChange={(e) =>
                                updateField(
                                    "note",
                                    e.target.value
                                )
                            }
                            placeholder="Describe your foster pet's condition this week..."
                            required
                        />
                    </label>

                    {
                        message && (
                            <div className="foster-message">

                                {message}

                            </div>
                        )
                    }

                    <button
                        type="submit"
                        className="foster-submit-button"
                        disabled={loading}
                    >
                        {
                            loading
                                ? "Submitting..."
                                : "Submit Weekly Report"
                        }
                    </button>
                </form>
            </section>

            <section className="foster-panel">
                <div className="foster-section-heading">
                    <div>
                        <span>
                            Weekly Reports
                        </span>
                        <h2>
                            Previous Updates
                        </h2>
                    </div>
                </div>
                {
                    !assignment?.updates?.length ? (
                        <div className="foster-empty-state">
                            No weekly reports submitted yet.
                        </div>
                    )
                        :
                        (
                            <div className="weekly-history">
                                {
                                    assignment.updates
                                        .slice()
                                        .reverse()
                                        .map((update) => (
                                            <article
                                                className="weekly-card"
                                                key={update._id}
                                            >
                                                <div className="weekly-card-header">
                                                    <strong>
                                                        {
                                                            new Date(
                                                                update.createdAt
                                                            ).toLocaleDateString()
                                                        }
                                                    </strong>
                                                </div>
                                                <p>
                                                    {update.note}
                                                </p>
                                                {
                                                    update.photoUrl && (
                                                        <img
                                                            src={update.photoUrl}
                                                            alt="Weekly Report"
                                                        />
                                                    )
                                                }
                                            </article>
                                        ))
                                }
                            </div>
                        )
                }
            </section>
        </section>
    );
}