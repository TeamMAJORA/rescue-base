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
                            Apply to become a volunteer or staff member
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

                {!loading && application && (
                    <div className="role-application-status">
                        <h3>Current Application</h3>

                        <p>
                            <strong>Requested Role:</strong>{" "}
                            {application.targetRole}
                        </p>

                        <p>
                            <strong>Status:</strong>{" "}
                            {application.status}
                        </p>

                        {application.reason && (
                            <p>
                                <strong>Reason:</strong>{" "}
                                {application.reason}
                            </p>
                        )}

                        {application.rejectionReason && (
                            <p>
                                <strong>Rejection Reason:</strong>{" "}
                                {application.rejectionReason}
                            </p>
                        )}
                    </div>
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

                            <option value="staff">
                                Staff
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
        </section>
    );
}