import { useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function MedicalAssistance({ assignment }) {
    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    const fosterEmail = String(
        savedUser.email || ""
    ).trim().toLowerCase();

    const [issueType, setIssueType] = useState("Injury");
    const [priority, setPriority] = useState("Medium");
    const [description, setDescription] = useState("");
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const token = localStorage.getItem("token");

    async function handleSubmit(e) {
        e.preventDefault();

        setLoading(true);
        setMessage("");

        try {
            const formData = new FormData();

            formData.append("petId", assignment?._id || "");
            formData.append("petName", assignment?.petName || "");
            formData.append("fosterEmail", fosterEmail);
            formData.append("issueType", issueType);
            formData.append("priority", priority);
            formData.append("description", description);

            if (photo) {
                formData.append("photo", photo);
            }

            const response = await fetch(
                `${API}/api/foster/medical`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                setMessage(
                    "Medical assistance request submitted successfully."
                );

                setDescription("");
                setPhoto(null);
                setPriority("Medium");
                setIssueType("Inquiry");
            } else {
                setMessage(
                    data.message ||
                    "Unable to submit request."
                );
            }
        } catch (error) {
            console.error(error);

            setMessage("Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    if (!assignment) {
        return (
            <section className="foster-panel">
                <h2>Medical assistance</h2>

                <p>You don't have currently have an active foster assignment.</p>
            </section>
        );
    }

    return (
        <section className="foster-panel medical-page">
            <h2>Medical Assistance</h2>

            <p className="medical-subtitle">
                Report any illness, injury, emergency, or health concern regarding your foster pet.
            </p>

            <form
                className="medical-form"
                onSubmit={handleSubmit}
            >
                <div className="medical-grid">
                    <div className="medical-field">
                        <label>Pet</label>

                        <input
                            value={assignment.petName}
                            disabled
                        />
                    </div>

                    <div className="medical-field">
                        <label>Issue Type</label>

                        <select
                            value={issueType}
                            onChange={(e) =>
                                setIssueType(e.target.value)
                            }
                        >
                            <option>Injury</option>
                            <option>Loss of Appetite</option>
                            <option>Vomiting</option>
                            <option>Diarrhea</option>
                            <option>Difficulty Walking</option>
                            <option>Skin Problem</option>
                            <option>Emergency</option>
                            <option>Other</option>
                        </select>
                    </div>

                    <div className="medical-field">
                        <label>Priority</label>

                        <select
                            value={priority}
                            onChange={(e) =>
                                setIssueType(e.target.value)
                            }
                        >
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                            <option>Critical</option>
                        </select>
                    </div>

                    <div className="medical-field">
                        <label>Upload Photo</label>

                        <input
                            type="file"
                            accept="image/"
                            onChange={(e) =>
                                setPhoto(e.target.files[0])
                            }
                        />
                    </div>
                </div>
                <div className="medical-field">
                    <label>Describe the Problem</label>
                    <textarea
                        rows="7"
                        value={description}
                        onChange={(e) =>
                            setDescription(e.target.value)
                        }
                        placeholder="Describe what happened..."
                        required
                    />
                </div>

                {message && (
                    <div className="medical-message">
                        {message}
                    </div>
                )}

                <button
                    type="submit"
                    className="medical-submit"
                    disabled={loading}
                >
                    {
                        loading
                            ? "Submitting..."
                            : "Submit Medical Request"
                    }
                </button>
            </form>
        </section>
    )
}