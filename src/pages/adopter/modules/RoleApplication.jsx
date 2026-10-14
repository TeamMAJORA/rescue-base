import { useState, useEffect } from "react";
import InfoTip from "../../../components/system/InfoTip";
import FosterApplication from "../../foster/modules/FosterApplication";
import "../../../styles/foster/FosterApplication.css";

const API = import.meta.env.VITE_BACKEND_URL;

export default function RoleApplication() {
    const token = localStorage.getItem("token");
    const [targetRole, setTargetRole] = useState("volunteer");
    const [reason, setReason] = useState("");
    const [roleApp, setApplication] = useState(null); // volunteer (Role Application)
    const [fosterApp, setFosterApp] = useState(null); // foster (FosterApplication form)
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

    // Latest foster application (the full foster form)
    async function fetchFosterApplication() {
        try {
            const response = await fetch(`${API}/api/foster/applications/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to load foster application.");
            }

            setFosterApp(data.application || null);

            // open the Foster tab if that application is the one under review
            if (data.application?.status === "pending") setTargetRole("foster");
        } catch (error) {
            setError(error.message);
        }
    }

    function refreshAll() {
        fetchApplication();
        fetchFosterApplication();
    }
    async function handleSubmit(event) {
        event.preventDefault();

        if (!reason.trim()) {
            setError("Please provide a reason for your application");
            return;
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
        refreshAll();
    }, []);

    // The side card shows whichever application matches the selected role
    const application = targetRole === "foster"
        ? fosterApp && {
            targetRole: "foster",
            status: fosterApp.status,
            submittedAt: fosterApp.createdAt,
            rejectionReason: fosterApp.rejectionReason ||
                (fosterApp.status === "rejected" ? fosterApp.reviewNotes : ""),
        }
        : roleApp;

    const status = application?.status || "none";

    // Only one application can be under review at a time
    const pendingRole = roleApp?.status === "pending"
        ? roleApp.targetRole
        : fosterApp?.status === "pending" ? "foster" : null;
    const hasPendingApplication = Boolean(pendingRole);

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

    
    // Role choices shown as cards
    const ROLE_OPTIONS = [
        {
            value: "volunteer",
            title: "Volunteer",
            description: "Help at the shelter with daily care, events and adoption days.",
            tags: ["On-site", "Flexible schedule"],
            icon: "/icons/Volunteer-white.svg",
        },
        {
            value: "foster",
            title: "Foster",
            description: "Give a pet a temporary home until it is ready for adoption.",
            tags: ["At home", "Short or long term"],
            icon: "/icons/Foster.svg",
        },
    ];

    return (
        <section className="role-application-module">
            <div className="adopter-panel ra-form-panel">
                <div className="adopter-panel-heading">
                    <div>
                        <span className="adopter-dashboard-eyebrow">
                            RescueBase Community
                        </span>

                        <h2>Join the RescueBase team</h2>

                        <p>
                            Apply to become a volunteer or foster member
                            and help support RescueBase.
                        </p>
                    </div>

                    <button
                        type="button"
                        className={`application-status-refresh ${loading ? "is-loading" : ""}`}
                        onClick={refreshAll}
                        disabled={loading}
                    >
                        <img src="/icons/Refresh cw.svg" alt="" />
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                {loading && <p className="ra-loading">Loading application...</p>}

                {error && <p className="role-application-error">{error}</p>}

                {success && <p className="role-application-success">{success}</p>}

                {!loading && (
                    <div className="ra-field ra-role-field">
                        <span className="ra-label">
                            Apply for <em>*</em>
                            <InfoTip text="Volunteers help at the shelter. Fosters care for a pet at home until it gets adopted." />
                        </span>

                        <div className="ra-role-grid" role="radiogroup" aria-label="Apply for">
                            {ROLE_OPTIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className={`ra-role-card ${targetRole === option.value ? "is-selected" : ""}`}
                                >
                                    <input
                                        type="radio"
                                        name="targetRole"
                                        value={option.value}
                                        checked={targetRole === option.value}
                                        onChange={(event) => {
                                            setTargetRole(event.target.value);
                                            setError("");
                                            setSuccess("");
                                        }}
                                        disabled={submitting}
                                    />

                                    <span className="ra-role-icon" aria-hidden="true">
                                        <img src={option.icon} alt="" />
                                    </span>

                                    <span className="ra-role-text">
                                        <b>{option.title}</b>
                                        <small>{option.description}</small>
                                        <span className="ra-role-tags">
                                            {option.tags.map((tag) => (
                                                <span key={tag}>{tag}</span>
                                            ))}
                                        </span>
                                    </span>

                                    <span className="ra-role-check" aria-hidden="true">
                                        <img src="/icons/checkmark.svg" alt="" />
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {!loading && hasPendingApplication && (
                    <div className="ra-pending">
                        <span className="ra-pending-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                        </span>
                        <div>
                            <b>Your {ROLE_LABELS[pendingRole] || pendingRole} application is under review</b>
                            <p>You can only have one application at a time. Please wait for a staff decision.</p>
                        </div>
                    </div>
                )}

                {!loading && !hasPendingApplication && targetRole === "foster" && (
                    <FosterApplication embedded onSubmitted={fetchFosterApplication} />
                )}

                {!loading && !hasPendingApplication && targetRole === "volunteer" && (
                    <form className="role-application-form" onSubmit={handleSubmit}>
                        <div className="ra-field">
                            <label className="ra-label" htmlFor="reason">
                                Why do you want to apply? <em>*</em>
                            </label>

                            <div className="ra-textarea-wrap">
                                <textarea
                                    id="reason"
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    placeholder="Explain why you want to join the RescueBase team..."
                                    rows={6}
                                    maxLength={500}
                                    disabled={submitting}
                                    required
                                />
                                <span className="ra-counter">{reason.length} / 500</span>
                            </div>

                            <small className="ra-hint">
                                Tell us about your experience with animals and when you are available.
                            </small>
                        </div>

                        <div className="ra-form-footer">
                            <p>
                                Staff review every application. You will get a
                                notification when it is decided.
                            </p>

                            <button
                                type="submit"
                                className="ra-submit"
                                disabled={submitting || !reason.trim()}
                            >
                                {submitting ? "Submitting..." : "Submit Application"}
                            </button>
                        </div>
                    </form>
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
                                    {step.state === "done"
                                        ? <img src="/icons/checkmark.svg" alt="" />
                                        : step.state === "declined" ? "✕" : index + 1}
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