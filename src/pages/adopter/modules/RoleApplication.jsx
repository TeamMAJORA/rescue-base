import { useState, useEffect } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function RoleApplication() {
    const token = localStorage.getItem("token");
    const [targetRole, setTargetRole] = useState("volunteer");
    const [reason, setReason] = useState("");
    const [application, setApplication] = useState(null)
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function fetchApplication() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(`${API}/api/users/role-application/me`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to load application.");
            }

            setApplication(data.application || null);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!reason.trim()) {
            setError("Please provide a reason for your application");
        }

        try {
            setSubmitting(true);
            setError("");
            setSuccess("");

            const response = await fetch(`${API}/api/users/role-application`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        targetRole,
                        reason: reason.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to submit application");
            }

            setApplication(data.application);
            setReason("");
            setSuccess("Your application was submitted successfully");
        } catch (error) {
            setError(error.message);
        } finally {
            setSubmitting(false);
        }
    }

    useEffect(() => {
        fetchApplication();
    }, []);

    const status = application?.status || "none";
    const hasPendingApplication = status === "pending";

        // Labels + step states for the right-side status card
    const ROLE_LABELS = { volunteer: "Volunteer", foster: "Foster Caregiver" };
    const STATUS_LABELS = { none: "None", pending: "Pending", approved: "Approved", rejected: "Declined" };

    function formatDate(value) {
        if (!value) return "";
        return new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    }

    const raSteps = [
        {
            title: "Submitted",
            note: status === "none"
                ? "Waiting for you to apply"
                : `Sent ${formatDate(application?.submittedAt || application?.createdAt)}`,
            state: status === "none" ? "upcoming" : "done",
        },
        {
            title: "Under review",
            note: "Staff check your answers",
            state: status === "pending" ? "active" : status === "none" ? "upcoming" : "done",
        },
        {
            title: "Decision",
            note: status === "approved" ? "Approved" : status === "rejected" ? "Declined" : "Approved or declined",
            state: status === "approved" ? "done" : status === "rejected" ? "declined" : "upcoming",
        },
    ];

    return (
        <section className="role-application-module">
            <div className="adopter-panel">
                <div className="adopter-panel-heading">
                    <div>
                        <span className="adopter-dashboard-eyebrow">
                            RescueBase Community
                        </span>

                        <h2>Role Application</h2>

                        <p>
                            Apply to become a volunteer or foster member
                            and help support RescueBase.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchApplication}
                        disabled={loading}
                    >
                        Refresh
                    </button>
                </div>

                {loading && <p>Loading application...</p>}

                {error && (
                    <p className="role-application-error">
                        {error}
                    </p>
                )}

                {success && (
                    <p className="role-application-success">
                        {success}
                    </p>
                )}

                {!hasPendingApplication && (
                    <form
                        className="role-application-form"
                        onSubmit={handleSubmit}
                    >
                        <label htmlFor="targetRole">
                            Apply For
                        </label>

                        <select
                            id="targetRole"
                            value={targetRole}
                            onChange={(event) =>
                                setTargetRole(event.target.value)
                            }
                            disabled={submitting}
                        >
                            <option value="volunteer">
                                Volunteer
                            </option>

                            <option value="foster">
                                Foster Caregiver
                            </option>
                        </select>

                        <label htmlFor="reason">
                            Why do you want to apply?
                        </label>

                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(event) =>
                                setReason(event.target.value)
                            }
                            placeholder="Explain why you want to join the RescueBase team..."
                            rows={6}
                            disabled={submitting}
                            required
                        />

                        <button
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Submitting..."
                                : "Submit Application"}
                        </button>
                    </form>
                )}

                {hasPendingApplication && (
                    <p>
                        Your application is currently under review.
                        Please wait for an administrator's decision.
                    </p>
                )}
            </div>

            <aside className="role-application-side">
                <div className="ra-card">
                    <div className="ra-card-head">
                        <h3>Current application</h3>
                        <span className={`ra-badge ra-badge-${status}`}>
                            {STATUS_LABELS[status] || status}
                        </span>
                    </div>

                    <div className="ra-row">
                        <span>Requested role</span>
                        <strong>{application ? ROLE_LABELS[application.targetRole] || application.targetRole : "—"}</strong>
                    </div>

                    <div className="ra-row">
                        <span>Status</span>
                        <strong>{application ? STATUS_LABELS[status] || status : "No application yet"}</strong>
                    </div>

                    <ol className="ra-steps">
                        {raSteps.map((step, index) => (
                            <li key={step.title} className={`ra-step is-${step.state}`}>
                                <span className="ra-step-dot">
                                    {step.state === "done" ? "✓" : step.state === "declined" ? "✕" : index + 1}
                                </span>
                                <div>
                                    <b>{step.title}</b>
                                    <small>{step.note}</small>
                                </div>
                            </li>
                        ))}
                    </ol>

                    {application?.rejectionReason && (
                        <p className="ra-reason">
                            <strong>Reason:</strong> {application.rejectionReason}
                        </p>
                    )}
                </div>

                <div className="ra-note">
                    <span className="ra-note-dot" aria-hidden="true" />
                    <p>
                        When approved, your account is updated with the new role
                        and you will see its menu on your next login.
                    </p>
                </div>
            </aside>
        </section>
    );
}