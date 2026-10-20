import { useState } from "react";
function formatDate(dateValue, includeTime = false) {
    if (!dateValue) {
        return "Not Available";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Not Available";
    }

    return date.toLocaleString(
        "en-PH",
        includeTime
            ? {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
            }
            : {
                year: "numeric",
                month: "long",
                day: "numeric",
            }
    );
}

// Pet card helpers (status pill on the photo + short dates)
const PET_CARD_STATUS = {
    pending: { label: "Pending review", icon: "clock" },
    interview_scheduled: { label: "Interview scheduled", icon: "calendar" },
    interview_completed: { label: "Interview done", icon: "check" },
    approved: { label: "Approved", icon: "check" },
    rejected: { label: "Not approved", icon: "x" },
    withdrawn: { label: "Withdrawn", icon: "x" },
};

const PET_CARD_ICONS = {
    check: <path d="M20 6 9 17l-5-5" />,
    x: <path d="M7 7l10 10M17 7 7 17" />,
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    calendar: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
        </>
    ),
    refresh: (
        <>
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 4v7h-7" />
        </>
    ),
    copy: (
        <>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a1 1 0 0 1 1-1h10" />
        </>
    ),
    doc: (
        <>
            <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
            <path d="M14 3v5h5M9 14l2 2 4-4" />
        </>
    ),
};

function PetCardIcon({ name, size = 18 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {PET_CARD_ICONS[name]}
        </svg>
    );
}

function shortDate(dateValue) {
    const date = new Date(dateValue);
    if (!dateValue || Number.isNaN(date.getTime())) return "Not available";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getStatusContent(status) {
    if (status === "approved") {
        return {
            eyebrow: "Application Approved",
            title: "Your application was approved!",
            description:
                "RescueBase staff approved your adoption application. Check the instructions and interview schedule below.",
        };
    }

    if (status === "rejected") {
        return {
            eyebrow: "Application Update",
            title: "Your application was not approved",
            description:
                "You may review the shelter's notes below and browse other animal available",
        };
    }

    if (status === "interview_scheduled") {
    return {
        eyebrow: "Interview Scheduled",
        title: "Your interview is scheduled",
        description:
            "Shelter staff want to meet you. Please come to the shelter on the date and time below.",
        };
    }

    if (status === "withdrawn") {
        return {
            eyebrow: "Application Withdrawn",
            title: "You withdrew this application",
            description:
                "This application is closed. You can now apply for another pet.",
        };
    }

    if (status === "interview_completed") {
        return {
            eyebrow: "Interview Completed",
            title: "Waiting for the final decision",
            description:
                "Thank you for meeting with the shelter. Staff will post their final decision here soon.",
        };
    }

    return {
        eyebrow: "Application Under Review",
        title: "Your application is being reviewed",
        description:
            "Shelter staff are reviewing your information and ID. You will be notified once there is an update.",
    };
}

export default function ApplicationStatus({
    application,
    loading,
    error,
    onRefresh,
    onBrowsePets,
    onWithdraw,
    history = [],
    onResubmitDocuments,
}) {

    const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
    const [withdrawReason, setWithdrawReason] = useState("");
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState("");
    const [idCopied, setIdCopied] = useState(false);
    const [docUploading, setDocUploading] = useState(false);
    const [docError, setDocError] = useState("");

    async function handleNewDocument(event) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setDocError("Please choose an image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setDocError("The image must be 5 MB or smaller.");
            return;
        }

        try {
            setDocUploading(true);
            setDocError("");
            await onResubmitDocuments?.(file);
        } catch (uploadError) {
            setDocError(uploadError.message || "Upload failed. Please try again.");
        } finally {
            setDocUploading(false);
        }
    }

    async function handleWithdraw() {
        try {
            setWithdrawing(true);
            setWithdrawError("");
            await onWithdraw?.(withdrawReason.trim());
            setConfirmingWithdraw(false);
            setWithdrawReason("");
        } catch (error) {
            setWithdrawError(error.message || "Failed to withdraw your application.");
        } finally {
            setWithdrawing(false);
        }
    }

    // Check failed: don't pretend there is no application
    if (error && !application) {
        return (
            <section className="adopter-state-error">
                <div className="adopter-state-error-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 9v4M12 17h.01" />
                        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                    </svg>
                </div>

                <h2>We couldn't check your application</h2>

                <p>
                    Your application is safe. We just couldn't reach the
                    shelter's server.
                </p>

                <button
                    type="button"
                    onClick={() => onRefresh?.()}
                    disabled={loading}
                >
                    {loading ? "Checking..." : "Try again"}
                </button>
            </section>
        );
    }

    if (loading && !application) {
        return (
            <section className="application-status-loading">
                <div className="application-status-loading-icon">
                    🐾
                </div>

                <h2>Loading application status...</h2>

                <p>
                    RescueBase is checking your latest adoption
                    application.
                </p>
            </section>
        );
    }

    if (!application) {
        return (
            <section className="application-status-empty">
                <div className="application-status-empty-icon">
                    <img src="/icons/sidebar/brown paw-light.svg" alt="" />
                </div>

                <span>Adoption Management</span>

                <h2>No adoption application yet</h2>

                <p>
                    When you apply for a pet, you can follow every step of
                    your application right here.
                </p>

                <div className="application-status-empty-actions">
                    <button
                        type="button"
                        onClick={() => onBrowsePets?.()}
                    >
                        Browse Available Pets <span aria-hidden="true">→</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onRefresh?.()}
                        disabled={loading}
                    >
                        <img src="/icons/Refresh cw.svg" alt="" />
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </section>
        );
    }

    const status = String(application.status || "pending")
        .trim()
        .toLowerCase();

    const statusContent = getStatusContent(status);

    const isPending = status === "pending";
    const isApproved = status === "approved";
    const isRejected = status === "rejected";
    const isInterviewScheduled = status === "interview_scheduled";
    const isInterviewCompleted = status === "interview_completed";
    const hasInterview = Boolean(application.interviewSchedule);
    const isWithdrawn = status === "withdrawn";
    const isActive = isPending || isInterviewScheduled || isInterviewCompleted;
    // Document box: verified / staff asked for a new ID / new ID sent / waiting
    const docRequestStatus = application.documentRequest?.status || "none";
    const docState = application.documentsVerified
        ? "verified"
        : docRequestStatus === "requested" && isActive
            ? "requested"
            : docRequestStatus === "resubmitted"
                ? "resubmitted"
                : "pending";
    const DOC_COPY = {
        verified: ["Verified", "Staff have verified your ID. No action needed."],
        requested: ["Please upload a new ID", application.documentRequest?.reason || "The shelter needs a clearer copy of your ID."],
        resubmitted: ["New ID received", "Staff are checking your new upload. We will notify you when it is done."],
        pending: ["Pending verification", "Staff are checking your ID. We will notify you when it is done."],
    };
    const pastApplications = history.filter(
        (item) => String(item.applicationId) !== String(application.applicationId)
    );

    const stageMap = {
    pending: 1,
    interview_scheduled: 2,
    interview_completed: 3,
    approved: 4,
    rejected: 4,
    };

    const stageIndex = isWithdrawn
        ? stageMap[application.withdrawnFromStatus] ?? 1
        : stageMap[status] ?? 1;

    const progressSteps = [
        {
            label: "Submitted",
            detail: formatDate(application.submittedAt),
        },
        {
            label: "Review",
            detail: stageIndex > 1
                ? "Completed"
                : isWithdrawn
                    ? "Stopped"
                    : "In progress",
        },
        {
            label: "Interview",
            detail: hasInterview
                ? formatDate(application.interviewSchedule, true)
                : isApproved || isRejected || isWithdrawn
                    ? "Not held"
                    : "To be scheduled",
        },
        {
            label: "Decision",
            detail: isWithdrawn
                ? "Withdrawn"
                : isApproved
                ? "Approved"
                : isRejected
                    ? "Not approved"
                    : "Waiting",
        },
    ].map((step, index) => {
        let state = "upcoming";

        if (index < stageIndex) state = "done";
        if (index === stageIndex) state = "current";
        if (index === 2 && (isApproved || isRejected) && !hasInterview) state = "skipped";
        if (index === 3 && isRejected) state = "rejected";
        if (index === 3 && isApproved) state = "approved";
        if (isWithdrawn) {
            state = index < stageIndex ? "done" : "upcoming";
            if (index === 3) state = "withdrawn";
        }

        return { ...step, state };
    });

    const progressFill = isWithdrawn
    ? ((stageIndex - 1) / 3) * 100
    : (Math.min(stageIndex, 3) / 3) * 100;

    return (
        <section className="application-status-module">
            <header
                className={`application-status-header ${status}`}
            >
                <div>
                    <span>{statusContent.eyebrow}</span>

                    <h2>{statusContent.title}</h2>

                    <p>{statusContent.description}</p>
                </div>

                <button
                    type="button"
                    className={`application-status-refresh ${loading ? "is-loading" : ""}`}
                    onClick={() => onRefresh?.()}
                    disabled={loading}
                >
                    <img src="/icons/Refresh cw.svg" alt="" />
                    {loading ? "Refreshing..." : "Refresh Status"}
                </button>
            </header>

            <div className="application-status-layout">
                <aside className="application-status-pet-card asp-card">
                    <div className="asp-photo">
                        {application.petImage ? (
                            <img
                                src={application.petImage}
                                alt={application.petName || "Adoption pet"}
                            />
                        ) : (
                            <img
                                className="is-placeholder"
                                src="/icons/brown paw.svg"
                                alt=""
                                aria-hidden="true"
                            />
                        )}

                        <span className={`asp-status is-${status}`}>
                            <PetCardIcon name={PET_CARD_STATUS[status]?.icon || "clock"} size={16} />
                            {PET_CARD_STATUS[status]?.label || status.replaceAll("_", " ")}
                        </span>
                    </div>

                    <div className="asp-title">
                        <div>
                            <h2>{application.petName || "Selected Pet"}</h2>
                            <p>{application.petBreed || "Breed not available"}</p>
                        </div>

                        {application.applicationId && (
                            <button
                                type="button"
                                className="asp-id"
                                title="Copy application ID"
                                onClick={() => {
                                    navigator.clipboard
                                        ?.writeText(String(application.applicationId).slice(-8).toUpperCase())
                                        .then(() => {
                                            setIdCopied(true);
                                            setTimeout(() => setIdCopied(false), 1500);
                                        })
                                        .catch(() => {});
                                }}
                            >
                                <small>{idCopied ? "Copied!" : "Application ID"}</small>
                                <b>
                                    {String(application.applicationId).slice(-8).toUpperCase()}
                                    <PetCardIcon name={idCopied ? "check" : "copy"} size={15} />
                                </b>
                            </button>
                        )}
                    </div>

                    <div className="asp-dates">
                        <div className="asp-date">
                            <span className="asp-date-icon"><PetCardIcon name="calendar" /></span>
                            <div>
                                <small>Submitted</small>
                                <b>{shortDate(application.submittedAt)}</b>
                            </div>
                        </div>
                        <div className="asp-date">
                            <span className="asp-date-icon"><PetCardIcon name="refresh" /></span>
                            <div>
                                <small>Last updated</small>
                                <b>{shortDate(application.updatedAt)}</b>
                            </div>
                        </div>
                    </div>

                    <div className={`asp-doc is-${docState}`}>
                        <span className="asp-doc-icon"><PetCardIcon name="doc" size={22} /></span>
                        <div>
                            <small>Document status</small>
                            <b>{DOC_COPY[docState][0]}</b>
                            <p>
                                {docState === "requested" && <strong>Staff note: </strong>}
                                {DOC_COPY[docState][1]}
                            </p>

                            {docState === "requested" && (
                                <>
                                    <label className={`asp-doc-upload ${docUploading ? "is-busy" : ""}`}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleNewDocument}
                                            disabled={docUploading}
                                            hidden
                                        />
                                        {docUploading ? "Uploading..." : "Upload new ID"}
                                    </label>

                                    {docError && <span className="asp-doc-error">{docError}</span>}
                                </>
                            )}
                        </div>
                    </div>
                </aside>

                <div className="application-status-content">
                    <section className="application-status-progress">
                        <div className="application-status-section-heading">
                            <span>Application Progress</span>
                            <h3>Current review stage</h3>
                        </div>

                        <ol className={`application-stepper ${isRejected ? "is-rejected" : ""}`}>
                            <span className="application-stepper-line" aria-hidden="true">
                                <span style={{ width: `${progressFill}%` }} />
                            </span>

                            {progressSteps.map((step) => (
                                <li key={step.label} className={`is-${step.state}`}>
                                    <span className="application-stepper-dot" aria-hidden="true">
                                        {(step.state === "done" || step.state === "approved") && (
                                            <svg viewBox="0 0 24 24">
                                                <path d="m5 12.5 4.5 4.5L19 7.5" />
                                            </svg>
                                        )}
                                        {(step.state === "rejected" || step.state === "withdrawn") && (
                                            <svg viewBox="0 0 24 24">
                                                <path d="M7 7l10 10M17 7 7 17" />
                                            </svg>
                                        )}
                                    </span>

                                    <strong>{step.label}</strong>
                                    <small>{step.detail}</small>
                                </li>
                            ))}
                        </ol>
                    </section>

                    {isPending && (
                        <section className="application-status-information pending">
                            <div className="application-status-section-heading">
                                <span>What Happens Next</span>
                                <h3>
                                    Please wait for shelter review
                                </h3>
                            </div>

                            <p>
                                Shelter staff will review your contact
                                information, household details, reason
                                for adoption, pet-care experience, and
                                uploaded identification document.
                            </p>

                            <p>
                                You will see the updated decision here
                                once the review is complete.
                            </p>
                        </section>
                    )}

                    {(isInterviewScheduled || isInterviewCompleted) && (
                        <section className="application-status-information pending">
                            <div className="application-status-section-heading">
                                <span>Interview</span>
                                <h3>
                                    {isInterviewScheduled
                                        ? "Prepare for your interview"
                                        : "Interview done"}
                                </h3>
                            </div>

                            {isInterviewScheduled && application.interviewSchedule && (
                                <div className="application-interview-card">
                                    <span>Interview Schedule</span>
                                    <strong>{formatDate(application.interviewSchedule, true)}</strong>
                                </div>
                            )}

                            <p>
                                {isInterviewScheduled
                                    ? "Bring a valid ID. You will meet the pet and talk with shelter staff about your home and care plans."
                                    : "Shelter staff are now making the final decision on your application."}
                            </p>
                        </section>
                    )}

                    {isActive && (
                        <section className="application-withdraw">
                            {!confirmingWithdraw ? (
                                <div className="application-withdraw-row">
                                    <div>
                                        <strong>Changed your mind?</strong>
                                        <p>
                                            You can withdraw this application anytime
                                            before the shelter makes its final decision.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="application-withdraw-button"
                                        onClick={() => setConfirmingWithdraw(true)}
                                    >
                                        Withdraw Application
                                    </button>
                                </div>
                            ) : (
                                <div className="application-withdraw-confirm">
                                    <strong>
                                        Withdraw your application for {application.petName}?
                                    </strong>

                                    <p>
                                        This cannot be undone. {application.petName} will stay
                                        available to other adopters, and you can apply for
                                        another pet right away.
                                    </p>

                                    <label htmlFor="withdraw-reason">Reason (optional)</label>

                                    <textarea
                                        id="withdraw-reason"
                                        rows={3}
                                        maxLength={300}
                                        value={withdrawReason}
                                        onChange={(event) => setWithdrawReason(event.target.value)}
                                        placeholder="Let the shelter know why you are withdrawing."
                                        disabled={withdrawing}
                                    />

                                    {withdrawError && (
                                        <p className="application-withdraw-error">{withdrawError}</p>
                                    )}

                                    <div className="application-withdraw-actions">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setConfirmingWithdraw(false);
                                                setWithdrawError("");
                                            }}
                                            disabled={withdrawing}
                                        >
                                            Keep Application
                                        </button>

                                        <button
                                            type="button"
                                            className="application-withdraw-button"
                                            onClick={handleWithdraw}
                                            disabled={withdrawing}
                                        >
                                            {withdrawing ? "Withdrawing..." : "Yes, Withdraw"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {isWithdrawn && (
                        <section className="application-status-information withdrawn">
                            <div className="application-status-section-heading">
                                <span>Application Closed</span>
                                <h3>You can apply again</h3>
                            </div>

                            <p>
                                You withdrew this application on{" "}
                                {formatDate(application.withdrawnAt)}. You are free to
                                apply for another available pet.
                            </p>

                            <button
                                type="button"
                                className="application-browse-button"
                                onClick={() => onBrowsePets?.()}
                            >
                                Browse Available Pets
                            </button>
                        </section>
                    )}

                    {isApproved && (
                        <section className="application-status-information approved">
                            <div className="application-status-section-heading">
                                <span>Approval Details</span>
                                <h3>
                                    Continue the adoption process
                                </h3>
                            </div>

                            {application.interviewSchedule ? (
                                <div className="application-interview-card">
                                    <span>
                                        Interview Schedule
                                    </span>

                                    <strong>
                                        {formatDate(
                                            application.interviewSchedule,
                                            true
                                        )}
                                    </strong>
                                </div>
                            ) : (
                                <p>
                                    No interview schedule has been
                                    added yet. Please wait for further
                                    instructions from RescueBase
                                    staff.
                                </p>
                            )}

                            {application.reviewNotes && (
                                <div className="application-review-box">
                                    <span>Shelter Notes</span>

                                    <p>
                                        {application.reviewNotes}
                                    </p>
                                </div>
                            )}
                        </section>
                    )}

                    {isRejected && (
                        <section className="application-status-information rejected">
                            <div className="application-status-section-heading">
                                <span>Review Result</span>

                                <h3>
                                    Application review details
                                </h3>
                            </div>

                            <div className="application-review-box">
                                <span>Reason</span>

                                <p>
                                    {application.rejectionReason ||
                                        "The shelter did not provide a specific rejection reason."}
                                </p>
                            </div>

                            {application.reviewNotes && (
                                <div className="application-review-box">
                                    <span>Shelter Notes</span>

                                    <p>
                                        {application.reviewNotes}
                                    </p>
                                </div>
                            )}

                            <button
                                type="button"
                                className="application-browse-button"
                                onClick={() => onBrowsePets?.()}
                            >
                                Browse Other Available Pets
                            </button>
                        </section>
                    )}
                </div>
            </div>
                {pastApplications.length > 0 && (
                    <section className="application-history">
                        <div className="application-status-section-heading">
                            <span>Application History</span>
                            <h3>Your past applications</h3>
                        </div>

                        <ul className="application-history-list">
                            {pastApplications.map((item) => (
                                <li key={item.applicationId} className="application-history-item">
                                    <div className="application-history-thumb">
                                        {item.petImage ? (
                                            <img src={item.petImage} alt={item.petName} />
                                        ) : (
                                            <img
                                                src="/icons/sidebar/brown paw.svg"
                                                alt=""
                                                className="is-placeholder"
                                            />
                                        )}
                                    </div>

                                    <div className="application-history-info">
                                        <strong>{item.petName}</strong>
                                        <small>{item.petBreed || "Breed not available"}</small>
                                    </div>

                                    <div className="application-history-date">
                                        <span>Submitted</span>
                                        <strong>{formatDate(item.submittedAt)}</strong>
                                    </div>

                                    <div className="application-history-date">
                                        <span>Closed</span>
                                        <strong>{formatDate(item.closedAt)}</strong>
                                    </div>

                                    <span className={`application-status-pill ${item.status}`}>
                                        {item.status.replaceAll("_", " ")}
                                    </span>

                                    {item.note && (
                                        <p className="application-history-note">{item.note}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
            )}
        </section>
    );
}