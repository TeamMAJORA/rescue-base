import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function WeeklyUpdates({ assignment, refreshAssignment }) {
    const [note, setNote] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    async function handleSubmit(e) {
        e.preventDefault();

        if (!assignment?._id) {
            setMessage("No active foster assignment.");
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
                        note,
                        photoUrl,
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
                    "Unable to submit update."
                );
                return;
            }

            setMessage("Weekly update submitted.");

            setNote("");
            setPhotoUrl("");

            refreshAssignment?.();

        } catch (error) {
            console.error(error);
            setMessage("Server error.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="foster-weekly-updates">

            <section className="foster-panel">

                <div className="foster-section-heading">
                    <div>
                        <span>Weekly Report</span>
                        <h2>Submit Update</h2>
                    </div>
                </div>

                <form
                    className="foster-update-form"
                    onSubmit={handleSubmit}
                >

                    <label>
                        Progress Report

                        <textarea
                            rows="6"
                            value={note}
                            onChange={(e)=>
                                setNote(e.target.value)
                            }
                            placeholder="Tell the shelter how your foster pet is doing..."
                            required
                        />

                    </label>

                    <label>

                        Photo URL (Optional)

                        <input
                            type="text"
                            value={photoUrl}
                            onChange={(e)=>
                                setPhotoUrl(e.target.value)
                            }
                            placeholder="https://..."
                        />

                    </label>

                    {message && (
                        <p className="foster-message">
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="foster-submit-button"
                    >
                        {loading
                            ? "Submitting..."
                            : "Submit Weekly Update"}
                    </button>

                </form>

            </section>

            <section className="foster-panel">

                <div className="foster-section-heading">
                    <div>
                        <span>History</span>
                        <h2>Previous Updates</h2>
                    </div>
                </div>

                {!assignment?.updates?.length ? (

                    <p>No updates submitted yet.</p>

                ) : (

                    assignment.updates
                        .slice()
                        .reverse()
                        .map((update) => (
                            <article
                                key={update._id}
                                className="foster-update-card"
                            >

                                <strong>
                                    {new Date(
                                        update.createdAt
                                    ).toLocaleDateString()}
                                </strong>

                                <p>{update.note}</p>

                                {update.photoUrl && (
                                    <img
                                        src={update.photoUrl}
                                        alt="Weekly update"
                                    />
                                )}

                            </article>
                        ))

                )}

            </section>

        </section>
    );
}