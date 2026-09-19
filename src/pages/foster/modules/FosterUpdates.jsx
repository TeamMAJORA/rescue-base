import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

const behavioralFactors = [
    {
        key: "energyLevel",
        label: "Energy Level",
        description: "How energetic and active is the animal?",
    },
    {
        key: "friendliness",
        label: "Friendliness",
        description: "How friendly and approachable is the animal?",
    },
    {
        key: "humanSociability",
        label: "Human Sociability",
        description: "How comfortable is the animal around people?",
    },
    {
        key: "animalSociability",
        label: "Animal Sociability",
        description: "How comfortable is the animal around other animals?",
    },
    {
        key: "trainability",
        label: "Trainability",
        description: "How responsive is the animal to training and commands?",
    },
    {
        key: "anxietyLevel",
        label: "Anxiety Level",
        description: "How frequently does the animal show signs of anxiety or fear?",
    },
    {
        key: "aggressionLevel",
        label: "Aggression Level",
        description: "How frequently does the animal show aggressive behavior?",
    },
    {
        key: "activityLevel",
        label: "Activity Level",
        description: "How much daily activity does the animal generally need?",
    },
];

const initialEvaluation = {
    energyLevel: "",
    friendliness: "",
    humanSociability: "",
    animalSociability: "",
    trainability: "",
    anxietyLevel: "",
    aggressionLevel: "",
    activityLevel: "",
    notes: "",
};

export default function FosterUpdates({
    assignment,
    refreshAssignment,
}) {
    const [note, setNote] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [evaluation, setEvaluation] = useState(initialEvaluation);
    const [loading, setLoading] = useState(false);
    const [evaluationLoading, setEvaluationLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [evaluationMessage, setEvaluationMessage] = useState("");
    const [medicalIssue, setMedicalIssue] = useState("");
    const [medicalUrgency, setMedicalUrgency] = useState("Medium");
    const [medicalLoading, setMedicalLoading] = useState(false);
    const [medicalMessage, setMedicalMessage] = useState("");
    const token = localStorage.getItem("token");

    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    useEffect(() => {
        setMessage("");
        setEvaluationMessage("");

        if (assignment?.behaviorEvaluation) {
            const savedEvaluation =
                assignment.behaviorEvaluation;

            setEvaluation({
                energyLevel:
                    savedEvaluation.energyLevel ?? "",
                friendliness:
                    savedEvaluation.friendliness ?? "",
                humanSociability:
                    savedEvaluation.humanSociability ?? "",
                animalSociability:
                    savedEvaluation.animalSociability ?? "",
                trainability:
                    savedEvaluation.trainability ?? "",
                anxietyLevel:
                    savedEvaluation.anxietyLevel ?? "",
                aggressionLevel:
                    savedEvaluation.aggressionLevel ?? "",
                activityLevel:
                    savedEvaluation.activityLevel ?? "",
                notes:
                    savedEvaluation.notes || "",
            });
        } else {
            setEvaluation(initialEvaluation);
        }
    }, [assignment]);

    if (!assignment) {
        return (
            <section className="foster-panel">
                <h2>Weekly Updates</h2>
                <p>No active foster assignment.</p>
            </section>
        );
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
                            savedUser.name ||
                            "Foster User",
                        submittedByEmail:
                            savedUser.email || "",
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
            setMessage("Weekly update submitted.");

            await refreshAssignment();
        } catch (error) {
            console.error(
                "Foster update error:",
                error
            );
            setMessage("Server error");
        } finally {
            setLoading(false);
        }
    }

    async function handleMedicalRequest(e) {
        e.preventDefault();

        if (!assignment?._id) {
            setMedicalMessage("No active foster assignment.");
            return;
        }

        if (!medicalIssue.trim()) {
            setMedicalMessage("Please describe the medical issue.");
            return;
        }

        try {
            setMedicalLoading(true);
            setMedicalMessage("");

            const response = await fetch(
                `${API}/api/foster/assignments/${assignment._id}/medical-requests`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        issue: medicalIssue,
                        urgency: medicalUrgency,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMedicalMessage(
                    data.message ||
                    "Unable to submit medical request."
                );
                return;
            }

            setMedicalIssue("");
            setMedicalUrgency("Medium");

            setMedicalMessage(
                "Medical assistance request submitted."
            );

            await refreshAssignment?.();
        } catch (error) {
            console.error(
                "Medical assistance error:",
                error
            );

            setMedicalMessage("Server error.");
        } finally {
            setMedicalLoading(false);
        }
    }

    function handleEvaluationChange(key, value) {
        setEvaluation((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function handleEvaluationSubmit(e) {
        e.preventDefault();

        if (!assignment?._id) {
            setEvaluationMessage(
                "No active foster assignment."
            );
            return;
        }

        for (const factor of behavioralFactors) {
            if (!evaluation[factor.key]) {
                setEvaluationMessage(
                    `Please rate ${factor.label}.`
                );
                return;
            }
        }

        try {
            setEvaluationLoading(true);
            setEvaluationMessage("");

            const response = await fetch(
                `${API}/api/foster/assignments/${assignment._id}/behavior-evaluation`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        energyLevel: Number(
                            evaluation.energyLevel
                        ),
                        friendliness: Number(
                            evaluation.friendliness
                        ),
                        humanSociability: Number(
                            evaluation.humanSociability
                        ),
                        animalSociability: Number(
                            evaluation.animalSociability
                        ),
                        trainability: Number(
                            evaluation.trainability
                        ),
                        anxietyLevel: Number(
                            evaluation.anxietyLevel
                        ),
                        aggressionLevel: Number(
                            evaluation.aggressionLevel
                        ),
                        activityLevel: Number(
                            evaluation.activityLevel
                        ),
                        notes: evaluation.notes,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setEvaluationMessage(
                    data.message ||
                    "Unable to submit behavioral evaluation."
                );
                return;
            }

            setEvaluationMessage(
                "Behavioral evaluation submitted for admin review."
            );

            await refreshAssignment();
        } catch (error) {
            console.error(
                "Behavioral evaluation error:",
                error
            );
            setEvaluationMessage("Server error");
        } finally {
            setEvaluationLoading(false);
        }
    }

    const evaluationStatus =
        assignment.behaviorEvaluation?.status ||
        "not_submitted";

    const evaluationLocked =
        evaluationStatus === "pending" ||
        evaluationStatus === "accepted";

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
                        <span>Medical Support</span>
                        <h2>Request Medical Assistance</h2>
                    </div>
                </div>

                <form
                    className="foster-update-form"
                    onSubmit={handleMedicalRequest}
                >

                    <label>
                        Describe Medical Issue

                        <textarea
                            rows="5"
                            value={medicalIssue}
                            onChange={(e) =>
                                setMedicalIssue(e.target.value)
                            }
                            placeholder="Describe the animal's symptoms, injury, or medical concern..."
                            required
                        />
                    </label>

                    <label>
                        Urgency

                        <select
                            value={medicalUrgency}
                            onChange={(e) =>
                                setMedicalUrgency(e.target.value)
                            }
                        >
                            <option value="Low">
                                Low
                            </option>

                            <option value="Medium">
                                Medium
                            </option>

                            <option value="High">
                                High
                            </option>

                            <option value="Emergency">
                                Emergency
                            </option>
                        </select>
                    </label>

                    {medicalMessage && (
                        <div className="foster-alert success">
                            {medicalMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="foster-submit-button"
                        disabled={medicalLoading}
                    >
                        {medicalLoading
                            ? "Submitting..."
                            : "Request Medical Assistance"}
                    </button>

                </form>

                <div className="foster-section-heading">
                    <div>
                        <span>Request History</span>
                        <h2>Previous Medical Requests</h2>
                    </div>
                </div>

                {assignment.medicalRequests?.length ? (
                    <div className="foster-update-list">

                        {[...assignment.medicalRequests]
                            .reverse()
                            .map((request) => (
                                <article
                                    key={request._id}
                                    className="foster-update-card"
                                >
                                    <strong>
                                        {new Date(
                                            request.createdAt
                                        ).toLocaleDateString()}
                                    </strong>

                                    <p>
                                        {request.issue}
                                    </p>

                                    <p>
                                        <strong>Urgency:</strong>{" "}
                                        {request.urgency}
                                    </p>

                                    <p>
                                        <strong>Status:</strong>{" "}
                                        {request.status}
                                    </p>

                                    {request.resolutionNotes && (
                                        <p>
                                            <strong>Resolution:</strong>{" "}
                                            {request.resolutionNotes}
                                        </p>
                                    )}
                                </article>
                            ))}

                    </div>
                ) : (
                    <p>No medical requests submitted yet.</p>
                )}

            </section>

            <section className="foster-panel">

                <div className="foster-section-heading">
                    <div>
                        <span>Behavior Assessment</span>
                        <h2>Behavioral Evaluation</h2>
                    </div>
                </div>

                {evaluationStatus === "pending" && (
                    <div className="foster-alert success">
                        Your behavioral evaluation is pending
                        admin review.
                    </div>
                )}

                {evaluationStatus === "accepted" && (
                    <div className="foster-alert success">
                        Your behavioral evaluation has been
                        accepted.
                    </div>
                )}

                {evaluationStatus === "revision" && (
                    <div className="foster-alert">
                        Your behavioral evaluation requires
                        revision. Please update the ratings
                        and submit again.
                    </div>
                )}

                <form
                    className="foster-update-form"
                    onSubmit={handleEvaluationSubmit}
                >

                    {behavioralFactors.map((factor) => (
                        <label
                            key={factor.key}
                        >
                            {factor.label}

                            <span>
                                {factor.description}
                            </span>

                            <select
                                value={
                                    evaluation[factor.key]
                                }
                                onChange={(e) =>
                                    handleEvaluationChange(
                                        factor.key,
                                        e.target.value
                                    )
                                }
                                disabled={evaluationLocked}
                                required
                            >
                                <option value="">
                                    Select rating
                                </option>

                                <option value="1">
                                    1 - Very Low
                                </option>

                                <option value="2">
                                    2 - Low
                                </option>

                                <option value="3">
                                    3 - Moderate
                                </option>

                                <option value="4">
                                    4 - High
                                </option>

                                <option value="5">
                                    5 - Very High
                                </option>
                            </select>
                        </label>
                    ))}

                    <label>
                        Behavioral Notes

                        <textarea
                            rows="6"
                            value={evaluation.notes}
                            onChange={(e) =>
                                setEvaluation(
                                    (current) => ({
                                        ...current,
                                        notes: e.target.value,
                                    })
                                )
                            }
                            disabled={evaluationLocked}
                            placeholder="Describe the animal's behavior, interactions, habits, triggers, and other observations."
                        />
                    </label>

                    {evaluationMessage && (
                        <div className="foster-alert success">
                            {evaluationMessage}
                        </div>
                    )}

                    {!evaluationLocked && (
                        <button
                            type="submit"
                            className="foster-submit-button"
                            disabled={evaluationLoading}
                        >
                            {evaluationLoading
                                ? "Submitting..."
                                : "Submit Behavioral Evaluation"}
                        </button>
                    )}

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
                                            alt="Foster update"
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