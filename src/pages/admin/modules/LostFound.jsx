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
const CEBU_CENTER = [10.3157, 123.8854];

const PIN_ICON = L.divIcon({
    className: "lfr-pin",
    html: "<span></span>",
    iconSize: [26, 34],
    iconAnchor: [13, 34],
});

// Click on the map = drop a pin
function MapClick({ onPick }) {
    useMapEvents({
        click: (e) => onPick(e.latlng.lat, e.latlng.lng),
    });
    return null;
}

// Move the map to the pin when it changes
function MapFollow({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) map.setView([lat, lng], Math.max(map.getZoom(), 16));
    }, [lat, lng]);
    return null;
}


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
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [mapSearch, setMapSearch] = useState(""); 
    const [viewingReport, setViewingReport] = useState(null);
    const [claimOpen, setClaimOpen] = useState(false);
    const [claimText, setClaimText] = useState("");
    const [claimError, setClaimError] = useState("");
    const [photoName, setPhotoName] = useState("");
    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoError, setPhotoError] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const phoneInvalid = contactNumber.length > 0 && !/^9\d{9}$/.test(contactNumber);
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
            const response = await fetch(`${API}/api/lost-found/reports`, {
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
        if (!/^9\d{9}$/.test(contactNumber)) {
             setError("Please enter a valid phone number: 10 digits starting with 9, e.g. 917 123 4567.");
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
                          reportType === "lost" && age && `Age: ${age} ${ageUnit}`,
                          reportType === "lost" && gender && `Gender: ${gender}`,
                          size && `Size: ${size}`,
                          reportType === "found" && lat && lng && `Pin: ${lat}, ${lng}`,
                          contactNumber && `Contact: +63 ${contactNumber}`,
                          notes.trim() && `Notes: ${notes.trim()}`,
                          ].filter(Boolean).join(" · "),
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
            setPhotoName("");
            setPhotoError("");
            setColor("");
            setAge("");
            setAgeUnit("Years");
            setGender("");
            setSize("");
            setContactNumber("");
            setNotes("");
            setLat("");
            setLng("");
            setMapSearch("");
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
async function uploadPhoto(file) {
    setPhotoError("");
    if (!file) return;

    const okTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!okTypes.includes(file.type)) {
        setPhotoError("Please choose a PNG, JPG, JPEG or WEBP image.");
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        setPhotoError("Image is too large. Max 5 MB.");
        return;
    }

    try {
        setPhotoUploading(true);

        const formData = new FormData();
        formData.append("folder", "rescuebase/lost-found");
        formData.append("image", file);

        const response = await fetch(`${API}/api/uploads/image`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }, // no Content-Type: the browser sets it for files
            body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Upload failed.");
        }

        setPhotoUrl(data.imageUrl);
        setPhotoName(file.name);
    } catch (err) {
        setPhotoError(err.message || "Upload failed. Please try again.");
    } finally {
        setPhotoUploading(false);
    }
}
    async function handleClaim(reportId, notesFromForm) {
    setError("");
    setSuccess("");

    const claimNotes =
        notesFromForm !== undefined
            ? notesFromForm
            : window.prompt(
                "Please provide information that can help verify your ownership of this pet:"
            );

    if (claimNotes === null || !claimNotes.trim()) {
        return false;
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
            throw new Error(data.message || "Failed to submit claim.");
        }

        setSuccess(data.message || "Claim submitted for verification.");
        await loadReports();
        return true;
    } catch (error) {
        console.error("Submit lost and found claim error:", error);
        setError(error.message || "Failed to submit claim.");
        return false;
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
            return true;

        } catch (error) {
            console.error(
                "Mark reunited error:",
                error
            );

            setError(
                error.message ||
                "Failed to mark case as reunited."
            );
            return false;
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

const countClaims = reports.filter((r) => r.claimStatus === "pending").length;
const isOpenReport = (r) => r.status !== "reunited" && r.status !== "rejected";
const countLostOpen = reports.filter((r) => r.reportType === "lost" && isOpenReport(r)).length;
const countFoundOpen = reports.filter((r) => r.reportType === "found" && isOpenReport(r)).length;

const LF_CHIPS = [
    { value: "all", label: "All", count: reports.length },
    { value: "lost", label: "Lost", count: countLost },
    { value: "found", label: "Found", count: countFound },
    ...(canManageReports ? [{ value: "claims", label: "Claims to review", count: countClaims }] : []),
    { value: "reunited", label: "Reunited", count: countReunited },
];

const query = search.trim().toLowerCase();

const visibleReports = reports
    .filter((r) => {
        if (typeFilter === "reunited") return r.status === "reunited";
        if (typeFilter === "claims") return r.claimStatus === "pending";
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
function pickPoint(la, ln) {
    setLat(la.toFixed(6));
    setLng(ln.toFixed(6));
}

async function searchMap() {
    if (!mapSearch.trim()) return;

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(mapSearch)}`
        );
        const data = await res.json();

        if (data[0]) {
            pickPoint(Number(data[0].lat), Number(data[0].lon));
            if (!location.trim()) setLocation(mapSearch.trim());
        } else {
            setError("Place not found on the map. Try a nearby landmark.");
        }
    } catch {
        setError("Map search failed. Click the map to drop a pin instead.");
    }
}

if (showReportForm && canSubmitReport) {
    const isLost = reportType === "lost";

    const contactFields = (
        <>
            <label className="lfr-field lfr-span-2">
    <span>
        Phone Number <em>*</em>{" "}
        <i className="lfr-help" tabIndex={0} data-tip="Shown to staff so they can reach you">?</i>
    </span>

    <div className={`lfr-phone ${phoneInvalid ? "is-invalid" : ""}`}>
        <span className="lfr-phone-code">+63</span>
        <input
            type="tel"
            inputMode="numeric"
            value={contactNumber}
            onChange={(e) => {
                let digits = e.target.value.replace(/\D/g, "");
                if (digits.startsWith("63")) digits = digits.slice(2);
                if (digits.startsWith("0")) digits = digits.slice(1);
                setContactNumber(digits.slice(0, 10));
            }}
            placeholder="9XX XXX XXXX"
            maxLength={10}
            required
        />
    </div>

    {phoneInvalid && (
        <small className="lfr-field-error">
            Enter a 10-digit mobile number starting with 9 (e.g. 917 123 4567).
        </small>
    )}
</label>

            <label className="lfr-field lfr-span-2">
                <span>Reported By</span>
                <input value={user?.name || user?.username || ""} placeholder="Auto-filled from your account" readOnly />
            </label>

            <label className="lfr-field lfr-span-4">
                <span>Notes</span>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </label>
        </>
    );

   function openReport(report, withClaim = false) {
       setViewingReport(report);
       setClaimOpen(withClaim);
       setClaimText("");
       setClaimError("");
   }
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
                    <p>
                        {isLost
                            ? "Describe the pet so people can recognize it. Fields marked * are required."
                            : "Used to match your report with lost pet reports. Fields marked * are required."}
                    </p>

                    <div className="lfr-grid">
                        <label className="lfr-field">
                            <span>
                                Pet Name {!isLost && <small className="lfr-optional">(optional)</small>}{" "}
                                <i className="lfr-help" tabIndex={0} data-tip="">?</i>
                            </span>
                            <input
                                value={petName}
                                onChange={(e) => setPetName(e.target.value)}
                                placeholder={isLost ? "e.g. Brownie" : "Leave blank if unknown"}
                            />
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

                        {isLost && (
                            <>
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
                            </>
                        )}

                        <label className="lfr-field">
                            <span>
                                Size {!isLost && <i className="lfr-help" title="Your best guess is fine">?</i>}
                            </span>
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

                        <div className="lfr-field lfr-span-4">
    <span>Photo</span>

    {photoUrl ? (
        <div className="lfr-photo-done">
            <img src={photoUrl} alt="Pet preview" />
            <div>
                <b>{photoName || "Uploaded photo"}</b>
                <small>Uploaded</small>
            </div>
            <button
                type="button"
                className="lfr-photo-remove"
                onClick={() => {
                    setPhotoUrl("");
                    setPhotoName("");
                }}
            >
                Remove
            </button>
        </div>
    ) : (
        <div
            className={`lfr-drop ${dragOver ? "is-over" : ""}`}
            onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                uploadPhoto(e.dataTransfer.files[0]);
            }}
        >
            <span className="lfr-drop-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
            </span>

            <div className="lfr-drop-text">
                <b>{photoUploading ? "Uploading..." : "Drag and drop a photo here"}</b>
                <small>or click to browse from your device</small>
                <div className="lfr-drop-tags">
                    <span>PNG</span>
                    <span>JPG</span>
                    <span>JPEG</span>
                    <span>WEBP</span>
                    <span>Max 5 MB</span>
                </div>
            </div>

            <label
                htmlFor="lfr-photo-input"
                className={`lfr-drop-btn ${photoUploading ? "is-disabled" : ""}`}
            >
                {photoUploading ? "Uploading..." : "Choose File"}
            </label>
            <input
                id="lfr-photo-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                disabled={photoUploading}
                onChange={(e) => {
                    uploadPhoto(e.target.files[0]);
                    e.target.value = "";
                }}
            />
        </div>
    )}

    {photoError && <small className="lfr-photo-error">{photoError}</small>}
</div>

                        <label className="lfr-field lfr-span-4">
                            <span>Description <em>*</em></span>
                            <input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={
                                    isLost
                                        ? "Markings, collar, behavior or other identifying details..."
                                        : "Markings, collar, condition, and where the pet is now..."
                                }
                                required
                            />
                        </label>
                    </div>
                </section>

                {isLost ? (
                    <section className="lfr-section">
                        <h2>Location &amp; Contact</h2>
                        <p>Where the pet was last seen and how to reach the reporter.</p>

                        <div className="lfr-grid">
                            <label className="lfr-field lfr-span-4">
                                <span>
                                    Last Seen Location <em>*</em>{" "}
                                    <i className="lfr-help" title="Barangay and city is enough">?</i>
                                </span>
                                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Brgy. Lahug, Cebu City" required />
                            </label>

                            {contactFields}
                        </div>
                    </section>
                ) : (
                    <section className="lfr-section">
                        <h2>Found Location</h2>
                        <p>Type where you found the pet, then drop a pin so the owner can see it on the GIS map.</p>

                        <div className="lfr-grid">
                            <label className="lfr-field lfr-span-2">
                                <span>
                                    Location Name <em>*</em>{" "}
                                    <i className="lfr-help" title="A landmark or street name helps">?</i>
                                </span>
                                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Near Ayala Center, Cebu City" required />
                            </label>

                            <label className="lfr-field">
                                <span>Latitude</span>
                                <input value={lat} placeholder="10.3157" readOnly />
                            </label>

                            <label className="lfr-field">
                                <span>Longitude</span>
                                <input value={lng} placeholder="123.8854" readOnly />
                            </label>

                            <div className="lfr-map lfr-span-4">
                                <MapContainer
                                    center={lat && lng ? [Number(lat), Number(lng)] : CEBU_CENTER}
                                    zoom={14}
                                    scrollWheelZoom={false}
                                    style={{ height: "100%", width: "100%" }}
                                >
                                    <TileLayer
                                        attribution="&copy; OpenStreetMap contributors"
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <MapClick onPick={pickPoint} />
                                    <MapFollow lat={Number(lat)} lng={Number(lng)} />
                                    {lat && lng && <Marker position={[Number(lat), Number(lng)]} icon={PIN_ICON} />}
                                </MapContainer>

                                <input
                                    className="lfr-map-search"
                                    value={mapSearch}
                                    onChange={(e) => setMapSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault(); // stops the form from submitting
                                            searchMap();
                                        }
                                    }}
                                    placeholder="🔍 Search a place or click the map..."
                                />
                            </div>

                            {contactFields}
                        </div>
                    </section>
                )}

                <footer className="lfr-foot">
                    <small>Next: your report appears in the Lost &amp; Found list right away.</small>
                    <div>
                        <button type="button" className="lfr-cancel" onClick={() => setShowReportForm(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="lfr-submit" disabled={submitting || photoUploading}>
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
            <section className="lf-hero">
    <div className="lf-hero-text">
        <span className="lf-hero-badge">Lost &amp; Found</span>
        <h1>Help a pet find its way home</h1>
        <p>Spot a pet you recognize, or lost your own? Reports from the community appear here.</p>
    </div>

    <div className="lf-hero-actions">
        <button
            type="button"
            className={`lf-hero-ghost ${onlyMine ? "is-on" : ""}`}
            onClick={() => setOnlyMine(!onlyMine)}
        >
            My reports <span>{countMine}</span>
        </button>

        {canSubmitReport && (
            <button type="button" className="lf-hero-btn" onClick={() => setShowReportForm(true)}>
                + Report a Pet
            </button>
        )}
    </div>
</section>
            

            {error && <div className="lost-found-message error">{error}</div>}
            {success && <div className="lost-found-message success">{success}</div>}

            <section className="lf2-card">
                <div className="lf2-toolbar">
                    <input
                        type="search"
                        className="lf2-search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, breed or location..."
                    />
                    <label className="lf2-select">
                        <span>Species</span>
                        <select value={speciesFilter} onChange={(e) => setSpeciesFilter(e.target.value)}>
                            <option value="all">All species</option>
                            <option value="Dog">Dog</option>
                            <option value="Cat">Cat</option>
                            <option value="Other">Other</option>
                        </select>
                    </label>
                    <label className="lf2-select">
                        <span>Sort</span>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                        </select>
                    </label>
                </div>

                <div className="lf2-chips">
                    {LF_CHIPS.map((chip) => (
                        <button
                            key={chip.value}
                            type="button"
                            className={typeFilter === chip.value ? "is-active" : ""}
                            onClick={() => setTypeFilter(chip.value)}
                        >
                            {chip.label} <span>{chip.count}</span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <p className="lf2-empty">Loading reports...</p>
                ) : visibleReports.length === 0 ? (
                    <p className="lf2-empty">
                        {reports.length === 0 ? "No lost or found reports yet." : "No reports match your filters."}
                    </p>
                ) : (
                    <div className="lf-grid">
    {visibleReports.map((report, index) => {
        const isMine = report.reporterEmail === user?.email;
        const isOpen = report.status !== "reunited" && report.status !== "rejected";
        const canClaimThis =
            canClaimReport && !isMine && isOpen &&
            report.claimStatus !== "pending" && report.claimStatus !== "approved";
        const badge = report.status === "reunited" ? "reunited" : report.reportType;
        const s = String(report.species || "").toLowerCase();
        const emoji = s === "cat" ? "🐱" : s === "dog" ? "🐶" : "🐾";
        const openDetails = (withClaim = false) => {
            setViewingReport(report);
            setClaimOpen(withClaim);
            setClaimText("");
            setClaimError("");
        };

        return (
            <article
                className={`lf-card ${isMine ? "is-mine" : ""}`}
                key={report._id}
                onClick={() => openDetails(false)}
            >
                <div className={`lf-card-media tint-${index % 4}`}>
                    {report.photoUrl ? (
                        <img src={report.photoUrl} alt={report.petName || "Pet"} />
                    ) : (
                        <span className="lf-card-emoji">{emoji}</span>
                    )}

                    <span className={`lf-card-badge is-${badge}`}>{badge}</span>

                    <span className="lf-card-date">
                        {report.dateReported
                            ? new Date(report.dateReported).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })
                            : "No date"}
                    </span>

                    {isMine && <span className="lf-card-mine">Your report</span>}
                </div>

                <div className="lf-card-body">
                    <h3>{report.petName || "Unknown"}</h3>
                    <small>{[report.species, report.breed].filter(Boolean).join(" · ")}</small>
                    <small className="lf-card-loc">📍 {report.location}</small>
                    <p>{String(report.description || "").split(" · ")[0]}</p>

                    {report.claimStatus && report.claimStatus !== "none" && (
                        <small className="lf-card-claim">Claim: {report.claimStatus}</small>
                    )}

                    <div className="lf-card-actions" onClick={(e) => e.stopPropagation()}>
                        {canClaimThis && report.reportType === "found" && (
                            <button type="button" onClick={() => openDetails(true)}>
                                This Is My Pet
                            </button>
                        )}

                        {!isMine && isOpen && report.reportType === "lost" && !canManageReports && (
                            <a
                                className="lf-card-btn"
                                href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(report.reporterEmail)}&su=${encodeURIComponent(
                                    `I've seen ${report.petName || "your pet"} (RescueBase)`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                I've Seen This Pet
                            </a>
                        )}

                        {canManageReports && report.claimStatus === "pending" && (
                            <button type="button" onClick={() => openDetails(false)}>
                                Review Claim
                            </button>
                        )}

                        {canManageReports && report.claimStatus === "approved" && report.status !== "reunited" && (
                            <button type="button" onClick={() => handleMarkReunited(report._id)}>
                                Mark Reunited
                            </button>
                        )}

                        {canDeleteReport && (
                            <button
                                type="button"
                                className="lf-card-icon is-danger"
                                title="Delete"
                                aria-label="Delete report"
                                onClick={() => handleDeleteReport(report._id)}
                            >
                                🗑
                            </button>
                        )}
                    </div>
                </div>
            </article>
        );
    })}
</div>
                )}
            </section>
            {viewingReport && (() => {
    const r = viewingReport;
    const isMine = r.reporterEmail === user?.email;
    const canSeeContact = isMine || canManageReports;
    const [mainText, ...extras] = String(r.description || "").split(" · ");
    const details = extras
        .map((part) => {
            const i = part.indexOf(": ");
            return i === -1 ? null : [part.slice(0, i), part.slice(i + 2)];
        })
        .filter((d) => d && (d[0] !== "Contact" || canSeeContact));
    const s = String(r.species || "").toLowerCase();
    const emoji = s === "cat" ? "🐱" : s === "dog" ? "🐶" : "🐾";
    const badge = r.status === "reunited" ? "reunited" : r.reportType;
    const canMarkReunited =
    canManageReports &&
    r.claimStatus === "approved" &&
    r.status !== "reunited";
    const canClaimThis =
    canClaimReport &&
    !isMine &&
    r.reportType === "found" &&
    r.status !== "reunited" &&
    r.status !== "rejected" &&
    r.claimStatus !== "pending" &&
    r.claimStatus !== "approved";
    return (
        <div className="lf-modal-overlay" onClick={() => setViewingReport(null)}>
            <div
                className="lf-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Details for ${r.petName || "this pet"}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="lf-modal-media tint-0">
                    {r.photoUrl ? (
                        <img src={r.photoUrl} alt={r.petName || "Pet"} />
                    ) : (
                        <span className="lf-card-emoji">{emoji}</span>
                    )}
                    <span className={`lf-card-badge is-${badge}`}>{badge}</span>
                    <button
                        type="button"
                        className="lf-modal-close"
                        onClick={() => setViewingReport(null)}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="lf-modal-body">
                    <h2>{r.petName || "Unknown"}</h2>
                    <small>{[r.species, r.breed].filter(Boolean).join(" · ")}</small>

                    <dl className="lf-modal-facts">
                        <div>
                            <dt>{r.reportType === "lost" ? "Last seen" : "Found at"}</dt>
                            <dd>📍 {r.location}</dd>
                        </div>
                        <div>
                            <dt>{r.reportType === "lost" ? "Date lost" : "Date found"}</dt>
                            <dd>
                                {r.dateReported
                                    ? new Date(r.dateReported).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })
                                    : "—"}
                            </dd>
                        </div>
                        <div>
                            <dt>Status</dt>
                            <dd className="lf-cap">{r.status}</dd>
                        </div>
                        <div>
                            <dt>Reported by</dt>
                            <dd>{isMine ? "You" : r.reporterName || "—"}</dd>
                        </div>
                        {r.claimStatus && r.claimStatus !== "none" && (
                            <div>
                                <dt>Claim</dt>
                                <dd className="lf-cap">{r.claimStatus}</dd>
                            </div>
                        )}
                        {details.map(([key, value]) => {
                            const [pLat, pLng] = value.split(", ");
                            return (
                                <div key={key}>
                                    <dt>{key === "Pin" ? "Map pin" : key}</dt>
                                    <dd>
                                        {key === "Pin" ? (
                                            <a
                                                href={`https://www.openstreetmap.org/?mlat=${pLat}&mlon=${pLng}#map=18/${pLat}/${pLng}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                View on map ↗
                                            </a>
                                        ) : (
                                            value
                                        )}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>

                    <h3>Description</h3>
                    <p>{mainText || "No description."}</p>
                    {canManageReports && r.claimStatus && r.claimStatus !== "none" && (
    <div className="lf-claim-review">
        <h3>
            Ownership claim{" "}
            <span className={`lf-claim-pill is-${r.claimStatus}`}>{r.claimStatus}</span>
        </h3>

        <dl className="lf-modal-facts">
            <div>
                <dt>Claimed by</dt>
                <dd>{r.claimantName || r.claimedByName || r.claimedBy?.name || "—"}</dd>
            </div>
            <div>
                <dt>Email</dt>
                <dd>{r.claimantEmail || r.claimedByEmail || r.claimedBy?.email || "—"}</dd>
            </div>
            <div>
                <dt>Submitted</dt>
                <dd>
                    {r.claimedAt || r.claimDate
                        ? new Date(r.claimedAt || r.claimDate).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                        })
                        : "—"}
                </dd>
            </div>
        </dl>

        <h3>Proof given</h3>
        <p className="lf-claim-proof">{r.claimNotes || "No proof text was saved."}</p>
    </div>
)}
{canManageReports && r.claimStatus === "pending" && (
    <>
        <button
            type="button"
            className="lfr-cancel"
            onClick={async () => {
                await handleReviewClaim(r._id, "rejected");
                setViewingReport(null);
            }}
        >
            Reject Claim
        </button>
        <button
            type="button"
            className="lfr-submit"
            onClick={async () => {
                await handleReviewClaim(r._id, "approved");
                setViewingReport(null);
            }}
        >
            Approve Claim
        </button>
    </>
)}
                    {canClaimThis && claimOpen && (
    <div className="lf-claim">
        <h3>Submit an ownership claim</h3>
        <p>
            Tell the shelter how they can confirm this is your pet. Staff will
            review your claim before the pet is released.
        </p>
        <textarea
            rows={4}
            maxLength={500}
            value={claimText}
            onChange={(e) => {
                setClaimText(e.target.value);
                setClaimError("");
            }}
            placeholder="e.g. Microchip number, vet records, photos of you with the pet, markings only the owner would know..."
        />
        {claimError && <small className="lf-claim-error">{claimError}</small>}
    </div>
)}
                    {error && <div className="lost-found-message error">{error}</div>}

                    <footer className="lf-modal-foot">
    <button type="button" className="lfr-cancel" onClick={() => setViewingReport(null)}>
        Close
    </button>

    {canClaimThis && !claimOpen && (
        <button type="button" className="lfr-submit" onClick={() => setClaimOpen(true)}>
            This Is My Pet
        </button>
    )}

    {canClaimThis && claimOpen && (
        <button
            type="button"
            className="lfr-submit"
            onClick={async () => {
                if (!claimText.trim()) {
                    setClaimError("Please describe how we can verify you're the owner.");
                    return;
                }
                const done = await handleClaim(r._id, claimText);
                if (done) setViewingReport(null);
            }}
        >
            Submit Claim
        </button>
    )}

    {canMarkReunited && (
        <button
            type="button"
            className="lfr-submit"
            onClick={async () => {
                const ok = await askConfirm({
                    title: "Mark this pet as reunited?",
                    message: "The report will show as Reunited for everyone.",
                    confirmLabel: "Mark Reunited",
                });
                if (!ok) return;

                const done = await handleMarkReunited(r._id);
                if (done) setViewingReport(null);
            }}
        >
            Mark Reunited
        </button>
    )}
</footer>
                </div>
            </div>
        </div>
    );
})()}
        </main>
    );
}