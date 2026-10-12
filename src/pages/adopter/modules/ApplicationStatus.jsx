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
    onRefresh,
    onBrowsePets,
    onWithdraw,
}) {

    const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
    const [withdrawReason, setWithdrawReason] = useState("");
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState("");

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
                <aside className="application-status-pet-card">
                    <div className="application-status-pet-image">
                        {application.petImage ? (
                            <img
                                src={application.petImage}
                                alt={
                                    application.petName ||
                                    "Adoption pet"
                                }
                            />
                        ) : (
                            <span>🐾</span>
                        )}
                    </div>

                    <span
                        className={`application-status-pill ${status}`}
                    >
                        {status.replaceAll("_", " ")}
                    </span>

                    <h2>
                        {application.petName || "Selected Pet"}
                    </h2>

                    <p>
                        {application.petBreed ||
                            "Breed not available"}
                    </p>

                    <div className="application-status-pet-meta">
                        <article>
                            <span>Application ID</span>

                            <strong>
                                {application.applicationId
                                    ? String(
                                        application.applicationId
                                    ).slice(-8)
                                    : "Not available"}
                            </strong>
                        </article>

                        <article>
                            <span>Submitted</span>

                            <strong>
                                {formatDate(
                                    application.submittedAt
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>Last Updated</span>

                            <strong>
                                {formatDate(
                                    application.updatedAt
                                )}
                            </strong>
                        </article>

                        <article>
                            <span>Document Status</span>

                            <strong>
                                {application.documentsVerified
                                    ? "Verified"
                                    : "Pending Verification"}
                            </strong>
                        </article>
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
        </section>
    );
}