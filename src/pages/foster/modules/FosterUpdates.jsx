import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function FosterUpdates({
    assignment,
    refreshAssignment,
}) {
    const [note, setNote] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const token = localStorage.getItem("token");

    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    useEffect(() => {
        setMessage("");
    }, [assignment]);

    if (loading && !assignment) {
        return (
            <section className="foster-panel">
                <p>Loading....</p>
            </section>
        )
    }

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
                        Authorization: `Bearer ${token}`,
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

            setNote("");
            setPhotoUrl("");
            setMessage("Weekly updates submitted.");

            refreshAssignment();
        } catch (error) {
            console.log(error)
            setMessage("Server error");
        } finally {
            setLoading(false);
        }

        if (!assignment) {
            return (
                <section className="foster-panel">
                    <h2>Weekly Updates</h2>
                    <p>No active foster assignment.</p>
                </section>
            );
        }
    }

    return (
        <section className="foster-updates-page">

            <section className="foster-panel">

                <div className="foster-section-heading">
                    <div>
                        <span>Foster Progress</span>
                        <h2>Weekly Update</h2>
                    </div>
                </div>

                <form
                    className="foster-update-form"
                    onSubmit={handleSubmit}
                >

                    <label>
                        Progress Notes

                        <textarea
                            rows="6"
                            value={note}
                            onChange={(e) =>
                                setNote(e.target.value)
                            }
                            placeholder="Describe the pet's condition, appetite, behavior, health, etc."
                            required
                        />

                    </label>

                    <label>
                        Photo URL (Optional)

                        <input
                            type="text"
                            value={photoUrl}
                            onChange={(e) =>
                                setPhotoUrl(e.target.value)
                            }
                            placeholder="https://..."
                        />

                    </label>

                    {message && (
                        <div className="foster-alert success">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="foster-submit-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Submitting..."
                            : "Submit Update"}
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

                {assignment.updates?.length ? (
                    <div className="foster-update-list">

                        {[...assignment.updates]
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
                                            alt="Update"
                                        />
                                    )}
                                </article>
                            ))}

                    </div>
                ) : (
                    <p>No updates submitted yet.</p>
                )}
            </section>
        </section>
    );
}