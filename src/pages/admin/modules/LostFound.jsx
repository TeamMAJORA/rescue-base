import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function LostFoundPage({ setPage }) {
    const [user, setUser] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [reportType, setReportType] = useState("lost");
    const [petName, setPetName] = useState("");
    const [species, setSpecies] = useState("");
    const [breed, setBreed] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [dateReported, setDateReported] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        try {
            const savedUser = localStorage.getItem("rescuebase_user");

            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }
        } catch (error) {
            console.error("Failed to load user:", error);
        }
    }, []);

    const role = String(user?.role || "").trim().toLowerCase();

    const isAdmin = role === "admin";
    const isStaff = role === "staff";

    const canSubmitReport = [
        "adopter",
        "foster",
        "volunteer",
        "staff",
        "admin",
    ].includes(role);

    const canClaimReport = [
        "adopter",
        "foster",
        "volunteer",
        "staff",
        "admin",
    ].includes(role);

    const canManageReports = isAdmin || isStaff;
    const canDeleteReport = isAdmin;
    const token = localStorage.getItem("token");

    async function loadReports() {
        if (!token || !role) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const endpoint = canManageReports ? `${API}/api/lost-found/reports` : `${API}/api/lost-found/reports/me`
            const response = await fetch(endpoint, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to load lost and found reports.");
            }

            setReports(data.reports || []);
        } catch (error) {
            console.error("Load lost and found reports error:", error);
            setError(error.message || "Failed to load reports");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitReport(e) {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!species.trim()) {
            setError("Please enter the pet species.");
            return;
        }

        if (!description.trim()) {
            setError("Please provide a description of the pet.");
            return;
        }

        if (!location.trim()) {
            setError("Please provide the location.");
            return;
        }

        if (!token) {
            setError("You must be logged in to submit a report.");
            return;
        }

        try {
            setSubmitting(true);

            const response = await fetch(
                `${API}/api/lost-found/reports`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        reportType,
                        petName: petName.trim(),
                        species: species.trim(),
                        breed: breed.trim(),
                        description: description.trim(),
                        location: location.trim(),
                        dateReported:
                            dateReported ||
                            new Date().toISOString(),
                        photoUrl: photoUrl.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Failed to submit lost and found report."
                );
            }

            setSuccess(
                data.message ||
                "Lost and found report submitted successfully."
            );

            setReportType("lost");
            setPetName("");
            setSpecies("");
            setBreed("");
            setDescription("");
            setLocation("");
            setDateReported("");
            setPhotoUrl("");

            await loadReports();

        } catch (error) {
            console.error(
                "Submit lost and found report error:",
                error
            );

            setError(
                error.message ||
                "Failed to submit report."
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleClaim(reportId) {
        setError("");
        setSuccess("");

        const claimNotes = window.prompt(
            "Please provide information that can help verify your ownership of this pet:"
        );

        if (
            claimNotes === null ||
            !claimNotes.trim()
        ) {
            return;
        }

        try {
            const response = await fetch(
                `${API}/api/lost-found/reports/${reportId}/claim`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        claimNotes: claimNotes.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Failed to submit claim."
                );
            }

            setSuccess(
                data.message ||
                "Claim submitted for verification."
            );

            await loadReports();

        } catch (error) {
            console.error(
                "Submit lost and found claim error:",
                error
            );

            setError(
                error.message ||
                "Failed to submit claim."
            );
        }
    }

    async function handleReviewClaim(
        reportId,
        claimStatus
    ) {
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `${API}/api/lost-found/reports/${reportId}/claim`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        claimStatus,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Failed to review claim."
                );
            }

            setSuccess(
                data.message ||
                `Claim ${claimStatus}.`
            );

            await loadReports();

        } catch (error) {
            console.error(
                "Review lost and found claim error:",
                error
            );

            setError(
                error.message ||
                "Failed to review claim."
            );
        }
    }

    async function handleMarkReunited(reportId) {
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `${API}/api/lost-found/reports/${reportId}/reunited`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Failed to mark case as reunited."
                );
            }

            setSuccess(
                data.message ||
                "Case marked as reunited."
            );

            await loadReports();

        } catch (error) {
            console.error(
                "Mark reunited error:",
                error
            );

            setError(
                error.message ||
                "Failed to mark case as reunited."
            );
        }
    }

    async function handleDeleteReport(reportId) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this lost and found report?"
        );

        if (!confirmed) {
            return;
        }

        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `${API}/api/lost-found/reports/${reportId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Failed to delete report."
                );
            }

            setSuccess(
                data.message ||
                "Lost and found report deleted."
            );

            await loadReports();

        } catch (error) {
            console.error(
                "Delete lost and found report error:",
                error
            );

            setError(
                error.message ||
                "Failed to delete report."
            );
        }
    }

    useEffect(() => {
        if (user) {
            loadReports();
        }
    }, [user]);

    return (
        <main className="lost-found-page">
            <header className="lost-found-header">
                <div className="lost-found-stats">
                    <article className="lost-found-stat-card">
                        <span>Total Reports</span>
                        <strong>{reports.length}</strong>
                    </article>

                    <article className="lost-found-stat-card">
                        <span>Lost Pets</span>
                        <strong>
                            {reports.filter(
                                (report) => report.reportType === "lost"
                            ).length}
                        </strong>
                    </article>

                    <article className="lost-found-stat-card">
                        <span>Found Pets</span>
                        <strong>
                            {reports.filter(
                                (report) => report.reportType === "found"
                            ).length}
                        </strong>
                    </article>

                    <article className="lost-found-stat-card">
                        <span>Reunited</span>
                        <strong>
                            {reports.filter(
                                (report) => report.status === "reunited"
                            ).length}
                        </strong>
                    </article>
                </div>
            </header>

            {error && (
                <div className="lost-found-message error">
                    {error}
                </div>
            )}

            {success && (
                <div className="lost-found-message success">
                    {success}
                </div>
            )}

            <section className="lost-found-content">
                {canSubmitReport && (
                    <div className="lost-found-card">
                        <div className="lost-found-card-header">
                            <div>
                                <h2>Report a Pet</h2>

                                <p>
                                    Report a lost or found pet to help
                                    reconnect them with their family.
                                </p>
                            </div>
                        </div>

                        <form
                            className="lost-found-form"
                            onSubmit={handleSubmitReport}
                        >
                            <div className="lost-found-type">
                                <button
                                    type="button"
                                    className={
                                        reportType === "lost"
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setReportType("lost")
                                    }
                                >
                                    Lost Pet
                                </button>

                                <button
                                    type="button"
                                    className={
                                        reportType === "found"
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setReportType("found")
                                    }
                                >
                                    Found Pet
                                </button>
                            </div>

                            <div className="lost-found-form-grid">
                                <label className="lost-found-field">
                                    <span>Pet Name</span>

                                    <input
                                        type="text"
                                        value={petName}
                                        onChange={(e) =>
                                            setPetName(e.target.value)
                                        }
                                        placeholder="Enter pet name"
                                    />
                                </label>

                                <label className="lost-found-field">
                                    <span>Species *</span>

                                    <input
                                        type="text"
                                        value={species}
                                        onChange={(e) =>
                                            setSpecies(e.target.value)
                                        }
                                        placeholder="Dog, Cat, etc."
                                        required
                                    />
                                </label>

                                <label className="lost-found-field">
                                    <span>Breed</span>

                                    <input
                                        type="text"
                                        value={breed}
                                        onChange={(e) =>
                                            setBreed(e.target.value)
                                        }
                                        placeholder="Enter breed"
                                    />
                                </label>

                                <label className="lost-found-field">
                                    <span>Date Reported</span>

                                    <input
                                        type="date"
                                        value={dateReported}
                                        onChange={(e) =>
                                            setDateReported(e.target.value)
                                        }
                                    />
                                </label>

                                <label className="lost-found-field lost-found-field-full">
                                    <span>Location *</span>

                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) =>
                                            setLocation(e.target.value)
                                        }
                                        placeholder="Where was the pet lost or found?"
                                        required
                                    />
                                </label>

                                <label className="lost-found-field lost-found-field-full">
                                    <span>Description *</span>

                                    <textarea
                                        value={description}
                                        onChange={(e) =>
                                            setDescription(e.target.value)
                                        }
                                        placeholder="Describe the pet, markings, color, collar, behavior, or other identifying details."
                                        rows={5}
                                        required
                                    />
                                </label>

                                <label className="lost-found-field lost-found-field-full">
                                    <span>Photo URL</span>

                                    <input
                                        type="url"
                                        value={photoUrl}
                                        onChange={(e) =>
                                            setPhotoUrl(e.target.value)
                                        }
                                        placeholder="Paste the uploaded image URL"
                                    />
                                </label>
                            </div>

                            <button
                                className="lost-found-submit"
                                type="submit"
                                disabled={submitting}
                            >
                                {submitting
                                    ? "Submitting..."
                                    : "Submit Report"}
                            </button>
                        </form>
                    </div>
                )}

                <div className="lost-found-card">
                    <div className="lost-found-card-header">
                        <div>
                            <h2>
                                {canManageReports
                                    ? "Lost & Found Reports"
                                    : "My Reports"}
                            </h2>

                            <p>
                                {canManageReports
                                    ? "Review and manage submitted lost and found reports."
                                    : "View the lost and found reports you have submitted."}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="lost-found-refresh"
                            onClick={loadReports}
                            disabled={loading}
                        >
                            {loading ? "Loading..." : "Refresh"}
                        </button>
                    </div>

                    {loading ? (
                        <div className="lost-found-empty">
                            <p>Loading reports...</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="lost-found-empty">
                            <h3>No reports yet</h3>

                            <p>
                                There are currently no lost and found
                                reports to display.
                            </p>
                        </div>
                    ) : (
                        <div className="lost-found-list">
                            {reports.map((report) => (
                                <article
                                    className="lost-found-report"
                                    key={report._id}
                                >
                                    <div className="lost-found-report-image">
                                        {report.photoUrl ? (
                                            <img
                                                src={report.photoUrl}
                                                alt={
                                                    report.petName ||
                                                    "Lost or found pet"
                                                }
                                            />
                                        ) : (
                                            <div className="lost-found-no-image">
                                                No Photo
                                            </div>
                                        )}
                                    </div>

                                    <div className="lost-found-report-content">
                                        <div className="lost-found-report-top">
                                            <span
                                                className={`lost-found-type-badge ${report.reportType}`}
                                            >
                                                {report.reportType === "lost"
                                                    ? "Lost"
                                                    : "Found"}
                                            </span>

                                            <span
                                                className={`lost-found-status ${report.status}`}
                                            >
                                                {report.status}
                                            </span>
                                        </div>

                                        <h3>
                                            {report.petName ||
                                                "Unnamed Pet"}
                                        </h3>

                                        <p className="lost-found-report-species">
                                            {report.species}

                                            {report.breed
                                                ? ` • ${report.breed}`
                                                : ""}
                                        </p>

                                        <p className="lost-found-report-location">
                                            {report.location}
                                        </p>

                                        <p className="lost-found-report-description">
                                            {report.description}
                                        </p>

                                        <div className="lost-found-report-meta">
                                            <span>
                                                Reported by:{" "}
                                                {report.reporterName}
                                            </span>

                                            <span>
                                                {report.reporterEmail}
                                            </span>

                                            <span>
                                                {report.dateReported
                                                    ? new Date(
                                                        report.dateReported
                                                    ).toLocaleDateString()
                                                    : "No date"}
                                            </span>
                                        </div>

                                        {report.claimStatus !== "none" && (
                                            <div className="lost-found-claim-status">
                                                <strong>
                                                    Claim Status:
                                                </strong>

                                                <span>
                                                    {report.claimStatus}
                                                </span>
                                            </div>
                                        )}

                                        <div className="lost-found-actions">
                                            {canClaimReport &&
                                                report.reporterEmail !==
                                                user?.email &&
                                                report.status !==
                                                "reunited" &&
                                                report.status !==
                                                "rejected" &&
                                                report.claimStatus ===
                                                "none" && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleClaim(
                                                                report._id
                                                            )
                                                        }
                                                    >
                                                        Claim Pet
                                                    </button>
                                                )}

                                            {canManageReports &&
                                                report.claimStatus ===
                                                "pending" && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleReviewClaim(
                                                                    report._id,
                                                                    "approved"
                                                                )
                                                            }
                                                        >
                                                            Approve Claim
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleReviewClaim(
                                                                    report._id,
                                                                    "rejected"
                                                                )
                                                            }
                                                        >
                                                            Reject Claim
                                                        </button>
                                                    </>
                                                )}

                                            {canManageReports &&
                                                report.claimStatus ===
                                                "approved" &&
                                                report.status !==
                                                "reunited" && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleMarkReunited(
                                                                report._id
                                                            )
                                                        }
                                                    >
                                                        Mark Reunited
                                                    </button>
                                                )}

                                            {canDeleteReport && (
                                                <button
                                                    type="button"
                                                    className="danger"
                                                    onClick={() =>
                                                        handleDeleteReport(
                                                            report._id
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}