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
                "You may reviewe the shelter's notes below and browse other animal available",
        };
    }

    return {
        eyebrow: "Application Under Review",
        title: "Your application was approved!",
        description:
            "RescueBase staff approved your adoption application. Check the instructions and interview schedule below.",
    };
}

export default function ApplicationStatus({
    application,
    loading,
    onRefresh,
    onBrowsePets,
}) {
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
                    🐾
                </div>

                <span>Adoption Management</span>

                <h2>No adoption application yet</h2>

                <p>
                    Select an available animal and submit an adoption
                    application to track its progress here.
                </p>

                <div className="application-status-empty-actions">
                    <button
                        type="button"
                        onClick={() => onBrowsePets?.()}
                    >
                        Browse Available Pets
                    </button>

                    <button
                        type="button"
                        onClick={() => onRefresh?.()}
                        disabled={loading}
                    >
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
                    className="application-status-refresh"
                    onClick={() => onRefresh?.()}
                    disabled={loading}
                >
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
                        {status}
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

                        <div className="application-progress-track">
                            <article className="complete">
                                <div>1</div>

                                <section>
                                    <strong>
                                        Application Submitted
                                    </strong>

                                    <p>
                                        Submitted on{" "}
                                        {formatDate(
                                            application.submittedAt
                                        )}
                                    </p>
                                </section>
                            </article>

                            <article
                                className={
                                    isPending
                                        ? "active"
                                        : "complete"
                                }
                            >
                                <div>2</div>

                                <section>
                                    <strong>
                                        Shelter Review
                                    </strong>

                                    <p>
                                        {isPending
                                            ? "Your information and identification document are being reviewed."
                                            : "The shelter has completed its initial review."}
                                    </p>
                                </section>
                            </article>

                            <article
                                className={
                                    isApproved
                                        ? "complete"
                                        : isRejected
                                            ? "rejected"
                                            : ""
                                }
                            >
                                <div>3</div>

                                <section>
                                    <strong>
                                        Final Decision
                                    </strong>

                                    <p>
                                        {isApproved
                                            ? "Your application was approved."
                                            : isRejected
                                                ? "Your application was not approved."
                                                : "Waiting for the shelter’s final decision."}
                                    </p>
                                </section>
                            </article>
                        </div>
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