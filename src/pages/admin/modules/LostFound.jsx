import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";


// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

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
    const [search, setSearch] = useState("");
    const [speciesFilter, setSpeciesFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [typeFilter, setTypeFilter] = useState("all");
    const [onlyMine, setOnlyMine] = useState(false);
    const [color, setColor] = useState("");
    const [age, setAge] = useState("");
    const [ageUnit, setAgeUnit] = useState("Years");
    const [gender, setGender] = useState("");
    const [size, setSize] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [showReportForm, setShowReportForm] = useState(false);

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
                        description: [
                        description.trim(),
                        color.trim() && `Color: ${color.trim()}`,
                        age && `Age: ${age} ${ageUnit}`,
                        gender && `Gender: ${gender}`,
                        size && `Size: ${size}`,
                        contactNumber.trim() && `Contact: ${contactNumber.trim()}`,
                        notes.trim() && `Notes: ${notes.trim()}`,
                        ].filter(Boolean).join(" · "),                        location: location.trim(),
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
            setColor("");
            setAge("");
            setAgeUnit("Years");
            setGender("");
            setSize("");
            setContactNumber("");
            setNotes("");
            await loadReports();
            setShowReportForm(false);

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
        const confirmed = await askConfirm({ title: "Delete this lost and found report?", message: "This can't be undone.", confirmLabel: "Delete", danger: true });

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
const countLost = reports.filter((r) => r.reportType === "lost").length;
const countFound = reports.filter((r) => r.reportType === "found").length;
const countReunited = reports.filter((r) => r.status === "reunited").length;
const countMine = reports.filter((r) => r.reporterEmail === user?.email).length;

const LF_CHIPS = [
    { value: "all", label: "All", count: reports.length },
    { value: "lost", label: "Lost", count: countLost },
    { value: "found", label: "Found", count: countFound },
    { value: "reunited", label: "Reunited", count: countReunited },
];

const query = search.trim().toLowerCase();

const visibleReports = reports
    .filter((r) => {
        if (typeFilter === "reunited") return r.status === "reunited";
        if (typeFilter !== "all") return r.reportType === typeFilter;
        return true;
    })
    .filter((r) => !onlyMine || r.reporterEmail === user?.email)
    .filter((r) => {
        const s = String(r.species || "").toLowerCase();
        if (speciesFilter === "all") return true;
        if (speciesFilter === "Other") return s !== "dog" && s !== "cat";
        return s === speciesFilter.toLowerCase();
    })
    .filter((r) =>
        !query ||
        [r.petName, r.breed, r.location].some((v) =>
            String(v || "").toLowerCase().includes(query)
        )
    )
    .sort((a, b) => {
        const diff = new Date(b.dateReported || b.createdAt) - new Date(a.dateReported || a.createdAt);
        return sortBy === "newest" ? diff : -diff;
    });

    if (showReportForm && canSubmitReport) {
    const isLost = reportType === "lost";

    return (
        <main className="lfr-page">
            <header className="lfr-header">
                <h1>Lost &amp; Found</h1>
                <p>Report a lost and found pet to help reconnect them with their family</p>
            </header>

            <form className="lfr-card" onSubmit={handleSubmitReport}>
                <div className="lfr-tabs">
                    <button type="button" className={isLost ? "is-active" : ""} onClick={() => setReportType("lost")}>
                        Lost Pet
                    </button>
                    <button type="button" className={!isLost ? "is-active" : ""} onClick={() => setReportType("found")}>
                        Found Pet
                    </button>
                </div>

                {error && <div className="lost-found-message error">{error}</div>}

                <section className="lfr-section">
                    <h2>Pet Details</h2>
                    <p>Describe the pet so people can recognize it. Fields marked * are required.</p>

                    <div className="lfr-grid">
                        <label className="lfr-field">
                            <span>Pet Name <i className="lfr-help" title="Leave blank if you don't know the name">?</i></span>
                            <input value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="e.g. Brownie" />
                        </label>

                        <label className="lfr-field">
                            <span>Species <em>*</em></span>
                            <select value={species} onChange={(e) => setSpecies(e.target.value)} required>
                                <option value="">Select</option>
                                <option value="Dog">Dog</option>
                                <option value="Cat">Cat</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>

                        <label className="lfr-field">
                            <span>Breed</span>
                            <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Aspin" />
                        </label>

                        <label className="lfr-field">
                            <span>Color</span>
                            <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Brown and white" />
                        </label>

                        <label className="lfr-field">
                            <span>Age</span>
                            <div className="lfr-age">
                                <input type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 2" />
                                <select value={ageUnit} onChange={(e) => setAgeUnit(e.target.value)}>
                                    <option value="Years">Years</option>
                                    <option value="Months">Months</option>
                                </select>
                            </div>
                        </label>

                        <label className="lfr-field">
                            <span>Gender</span>
                            <select value={gender} onChange={(e) => setGender(e.target.value)}>
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Unknown">Unknown</option>
                            </select>
                        </label>

                        <label className="lfr-field">
                            <span>Size</span>
                            <select value={size} onChange={(e) => setSize(e.target.value)}>
                                <option value="">Select</option>
                                <option value="Small">Small</option>
                                <option value="Medium">Medium</option>
                                <option value="Large">Large</option>
                            </select>
                        </label>

                        <label className="lfr-field">
                            <span>
                                {isLost ? "Date Lost" : "Date Found"} <em>*</em>{" "}
                                <i className="lfr-help" title="Your best guess is fine">?</i>
                            </span>
                            <input type="date" value={dateReported} onChange={(e) => setDateReported(e.target.value)} required />
                        </label>

                        <label className="lfr-field">
                            <span>Photo</span>
                            <input type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Paste image URL" />
                        </label>

                        <label className="lfr-field lfr-span-3">
                            <span>Description <em>*</em></span>
                            <input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Markings, collar, behavior or other identifying details..."
                                required
                            />
                        </label>
                    </div>
                </section>

                <section className="lfr-section">
                    <h2>Location &amp; Contact</h2>
                    <p>Where the pet was {isLost ? "last seen" : "found"} and how to reach the reporter.</p>

                    <div className="lfr-grid">
                        <label className="lfr-field lfr-span-2">
                            <span>
                                {isLost ? "Last Seen Location" : "Found Location"} <em>*</em>{" "}
                                <i className="lfr-help" title="Barangay and city is enough">?</i>
                            </span>
                            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Brgy. Lahug, Cebu City" required />
                        </label>

                        <label className="lfr-field">
                            <span>
                                Contact Number <em>*</em>{" "}
                                <i className="lfr-help" title="Shown to staff so they can reach you">?</i>
                            </span>
                            <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="e.g. 0917 123 4567" required />
                        </label>

                        <label className="lfr-field">
                            <span>Reported By</span>
                            <input value={user?.name || user?.username || ""} placeholder="Auto-filled from your account" readOnly />
                        </label>

                        <label className="lfr-field lfr-span-4">
                            <span>Notes</span>
                            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                        </label>
                    </div>
                </section>

                <footer className="lfr-foot">
                    <small>Next: your report appears in the Lost &amp; Found list right away.</small>
                    <div>
                        <button type="button" className="lfr-cancel" onClick={() => setShowReportForm(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="lfr-submit" disabled={submitting}>
                            {submitting ? "Submitting..." : "Submit Report"}
                        </button>
                    </div>
                </footer>
            </form>
        </main>
    );
}
    return (
        <main className="lost-found-page">
            <header className="lost-found-header">
                <div className="lost-found-stats">
                    <section className="lf-hero">
                     <div className="lf-hero-text">
                      <span className="lf-hero-badge">Lost &amp; Found</span>
                    <h1>Help a pet find its way home</h1>
                    <p>Spot a pet you recognize, or lost your own? Reports from the community appear here.</p>
                </div>

                     <button type="button" className="lf-hero-btn" onClick={() => setShowReportForm(true)}>
                                         + Report a Pet
                      </button>
                    </section>
                </div>
            </header>
            <div className="lf-filters">
    <div className="lf-toolbar">
        <input
            type="search"
            className="lf-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, breed or location..."
        />

        <select className="lf-select" value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)}>
            <option value="all">Species: All</option>
            <option value="Dog">Species: Dog</option>
            <option value="Cat">Species: Cat</option>
            <option value="Other">Species: Other</option>
        </select>

        <select className="lf-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
        </select>
    </div>

    <div className="lf-chips-row">
        <div className="lf-chips">
            {LF_CHIPS.map((chip) => (
                <button
                    key={chip.value}
                    type="button"
                    className={`lf-chip ${typeFilter === chip.value ? "is-active" : ""}`}
                    onClick={() => setTypeFilter(chip.value)}
                >
                    {chip.label} <span>{chip.count}</span>
                </button>
            ))}
        </div>

        <button
            type="button"
            className={`lf-chip ${onlyMine ? "is-active" : ""}`}
            onClick={() => setOnlyMine(!onlyMine)}
        >
            My Reports <span>{countMine}</span>
        </button>
    </div>
</div>

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
                    {loading ? (
                        <div className="lost-found-empty">
                            <p>Loading reports...</p>
                        </div>
                      ) : reports.length === 0 ? null : (
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
                                                report.claimStatus !==
                                                "pending" &&
                                                report.claimStatus !==
                                                "approved" && (
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

                                            {/* Approved claimant never came: open the report again */}
                                            {canManageReports &&
                                                report.claimStatus ===
                                                "approved" &&
                                                report.status !==
                                                "reunited" && (
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            const ok = window.rbConfirm
                                                                ? await window.rbConfirm({
                                                                    title: "Revoke this claim?",
                                                                    message: "The report opens again so someone else can claim it.",
                                                                    confirmLabel: "Revoke claim",
                                                                    danger: true,
                                                                })
                                                                : window.confirm("Revoke this claim?");

                                                            if (ok) handleReviewClaim(report._id, "revoked");
                                                        }}
                                                    >
                                                        Revoke Claim
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
            </section>
        </main>
    );
}