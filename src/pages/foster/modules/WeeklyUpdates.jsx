import { useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function WeeklyUpdates({
    assignment,
    refreshAssignment,
}) {
    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    const [note, setNote] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();

        if (!assignment) {
            setMessage("No active foster assignment");
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            const response = await fetch(
                `${API}/api/foster/assignments/${assignment._id}/update`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
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
                    "Failed to submit update."
                );
                return;
            }

            setMessage("Weekly update submitted.");

            setNote("");
            setPhotoUrl("");

            refreshAssignment();
        } catch (error) {
            console.error(error);
            setMessage("Server error.");
        } finally {
            setLoading(false);
        }
    }

    function formatDate(date) {
        return new Date(date).toLocaleDateString(
            "en-PH",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
            }
        );
    }

    return (
        <section className="foster-panel">

            <div className="foster-section-heading">
                <div>
                    <span>Foster Progress</span>
                    <h2>Weekly Updates</h2>
                </div>
            </div>

            {!assignment ? (
                <p>
                    You currently have no active foster assignment.
                </p>
            ) : (
                <>
                    <form
                        className="foster-weekly-form"
                        onSubmit={handleSubmit}
                    >

                        <label>
                            Photo URL

                            <input
                                type="text"
                                value={photoUrl}
                                onChange={(e) =>
                                    setPhotoUrl(e.target.value)
                                }
                                placeholder="Paste Cloudinary image URL"
                            />

                        </label>

                        <label>

                            Progress Note

                            <textarea
                                rows="6"
                                value={note}
                                onChange={(e) =>
                                    setNote(e.target.value)
                                }
                                placeholder="Tell us how your foster pet is doing..."
                                required
                            />

                        </label>

                        {message && (
                            <div className="foster-alert success">
                                {message}
                            </div>
                        )}

                        <button
                            className="foster-submit-button"
                            disabled={loading}
                        >
                            {loading
                                ? "Submitting..."
                                : "Submit Weekly Update"}
                        </button>

                    </form>

                    <section className="foster-update-history">

                        <h3>Recent Updates</h3>

                        {assignment.updates?.length === 0 ? (
                            <p>
                                No updates yet.
                            </p>
                        ) : (
                            assignment.updates
                                .slice()
                                .reverse()
                                .map((update) => (
                                    <article
                                        key={update._id}
                                        className="foster-update-card"
                                    >

                                        {update.photoUrl && (
                                            <img
                                                src={update.photoUrl}
                                                alt="Update"
                                            />
                                        )}

                                        <div>

                                            <strong>
                                                {formatDate(
                                                    update.createdAt
                                                )}
                                            </strong>

                                            <p>
                                                {update.note}
                                            </p>

                                        </div>

                                    </article>
                                ))
                        )}

                    </section>
                </>
            )}

        </section>
    );

}