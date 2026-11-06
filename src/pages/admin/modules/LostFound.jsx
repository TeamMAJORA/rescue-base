import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { searchCebuPlaces } from "../../../utils/cebuPlaces";


// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

const API = import.meta.env.VITE_BACKEND_URL;

const MATCH_FACTOR_LABELS = {
    species: "Species",
    breed: "Breed",
    colour: "Colour",
    size: "Size",
    sex: "Sex",
    description: "Description",
};

// similarity 0..1 -> tag text and style
function describeMatchFactor(similarity) {
    if (similarity >= 0.8) return { text: "match", tone: "is-good" };
    if (similarity >= 0.4) return { text: "partly", tone: "is-mid" };
    return { text: "low", tone: "is-low" };
}

function kilometersBetween(first, second) {
    const a = first?.coordinates;
    const b = second?.coordinates;
    if (!a?.latitude || !a?.longitude || !b?.latitude || !b?.longitude) return null;
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const dLat = toRadians(b.latitude - a.latitude);
    const dLng = toRadians(b.longitude - a.longitude);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function reportDate(report) {
    return report?.eventDate || report?.dateReported || report?.createdAt || null;
}
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
    const [viewMode, setViewMode] = useState("grid"); // "grid" (cards, default) | "list" (table)
    const [typeFilter, setTypeFilter] = useState("all");
    const [onlyMine, setOnlyMine] = useState(false);
    const [possibleMatches, setPossibleMatches] = useState(null);
    const [possibleMatchesTotal, setPossibleMatchesTotal] = useState(0);
    const [decidingMatchId, setDecidingMatchId] = useState("");
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
    const [mapResults, setMapResults] = useState([]);
    const [mapSearchOpen, setMapSearchOpen] = useState(false);
    const [mapSearching, setMapSearching] = useState(false);
    const [locating, setLocating] = useState(false);
    const [viewingReport, setViewingReport] = useState(null);
    const [claimOpen, setClaimOpen] = useState(false);
    const [claimText, setClaimText] = useState("");
    const [claimContactNumber, setClaimContactNumber] = useState("");
    const [claimProofPhotoUrl, setClaimProofPhotoUrl] = useState("");
    const [claimProofUploading, setClaimProofUploading] = useState(false);
    const [claimError, setClaimError] = useState("");
    const [mySuggestions, setMySuggestions] = useState([]);
    const [photoName, setPhotoName] = useState("");
    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoError, setPhotoError] = useState("");
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
    async function loadMySuggestions() {
        try {
            const response = await fetch(`${API}/api/lost-found/matches/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to load suggested matches.");
            }

            setMySuggestions(data.suggestions || []);
        } catch (error) {
            setError(error.message || "Failed to load suggested matches.");
        }
    }

    async function dismissSuggestedMatch(matchId) {
        try {
            const response = await fetch(`${API}/api/lost-found/matches/${matchId}/dismiss`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to dismiss suggestion.");
            }

            setMySuggestions((current) => current.filter((suggestion) => suggestion.matchId !== matchId));
        } catch (error) {
            setError(error.message || "Failed to dismiss suggestion.");
        }
    }
    
    async function loadPossibleMatches() {
        if (!token) return;

        try {
            const response = await fetch(`${API}/api/lost-found/matches?limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to load possible matches.");
            }

            setPossibleMatches(data.matches || []);
            setPossibleMatchesTotal(Number(data.pagination?.total) || (data.matches || []).length);
        } catch (error) {
            setPossibleMatches([]);
            setError(error.message || "Failed to load possible matches.");
        }
    }

    async function decidePossibleMatch(matchId, decision) {
        if (decision === "confirm") {
            const confirmed = await askConfirm({
                title: "Confirm this match?",
                message: "Both reports will be marked as matched.",
                confirmLabel: "Confirm match",
            });
            if (!confirmed) return;
        }

        try {
            setDecidingMatchId(matchId);
            setError("");
            setSuccess("");

            const response = await fetch(`${API}/api/lost-found/matches/${matchId}/decision`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ decision }),
            });
            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(data.message || "Could not save the decision.");
            }

            setSuccess(decision === "confirm" ? "Match confirmed." : "Marked as not a match.");
            await Promise.all([loadReports(), loadPossibleMatches()]);
        } catch (error) {
            setError(error.message || "Could not save the decision.");
        } finally {
            setDecidingMatchId("");
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
        
        if (reportType === "found" && !photoUrl) {
            setError("Please add a photo so the owner can recognize the pet.");
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
                          colour: color,  
                          size,
                          sex: gender,
                          description: [
                          description.trim(),
                          color.trim() && `Color: ${color.trim()}`,
                          reportType === "lost" && age && `Age: ${age} ${ageUnit}`,
                          gender && `Gender: ${gender}`,
                          size && `Size: ${size}`,
                          contactNumber && `Contact: +63 ${contactNumber}`,
                          notes.trim() && `Notes: ${notes.trim()}`,
                          ].filter(Boolean).join(" · "),
                          location: location.trim(),
                          dateReported:
                          dateReported ||
                          new Date().toISOString(),
                          photoUrl: photoUrl.trim(),
                          latitude: lat || undefined,
                          longitude: lng || undefined,
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
// Validates and uploads one image; returns its URL or throws a readable error.
async function uploadLostFoundImage(file) {
    const okTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!okTypes.includes(file.type)) {
        throw new Error("Please choose a PNG, JPG, JPEG or WEBP image.");
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image is too large. Max 5 MB.");
    }

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

    return data.imageUrl;
}

async function uploadPhoto(file) {
    setPhotoError("");
    if (!file) return;

    try {
        setPhotoUploading(true);
        setPhotoUrl(await uploadLostFoundImage(file));
        setPhotoName(file.name);
    } catch (err) {
        setPhotoError(err.message || "Upload failed. Please try again.");
    } finally {
        setPhotoUploading(false);
    }
}

async function uploadClaimProofPhoto(file) {
    setClaimError("");
    if (!file) return;

    try {
        setClaimProofUploading(true);
        setClaimProofPhotoUrl(await uploadLostFoundImage(file));
    } catch (err) {
        setClaimError(err.message || "Upload failed. Please try again.");
    } finally {
        setClaimProofUploading(false);
    }
}

// "I found this pet": open the Found form prefilled from a lost report.
function startFoundReportFromLostReport(lostReport) {
    setReportType("found");
    setPetName(lostReport.petName || "");
    setSpecies(lostReport.species || "");
    setBreed(lostReport.breed || "");
    setColor(lostReport.colour || "");
    setSize(lostReport.size || "");
    setGender(lostReport.sex || "");
    setDescription("");
    setLocation("");
    setDateReported("");
    setPhotoUrl("");
    setPhotoName("");
    setLat("");
    setLng("");
    setNotes(`Responding to the lost report for ${lostReport.petName || `a ${String(lostReport.species || "pet").toLowerCase()}`}.`);
    setViewingReport(null);
    setShowReportForm(true);
}
    async function handleClaim(reportId) {
    setError("");
    setSuccess("");

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
                    claimNotes: claimText.trim(),
                    claimContactNumber,
                    claimProofPhotoUrl,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to submit claim.");
        }

        setSuccess(data.message || "Claim submitted for verification.");
        setClaimText("");
        setClaimContactNumber("");
        setClaimProofPhotoUrl("");
        await loadReports();
        await loadMySuggestions();
        return true;
    } catch (error) {
        console.error("Submit lost and found claim error:", error);
        setError(error.message || "Failed to submit claim.");
        return false;
    }
}

    async function handleCancelClaim(reportId) {
        setError("");
        setSuccess("");

        try {
            const response = await fetch(`${API}/api/lost-found/reports/${reportId}/claim/cancel`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to cancel claim.");
            }

            setSuccess(data.message || "Your claim was cancelled.");
            await loadReports();
            await loadMySuggestions();
            return true;
        } catch (error) {
            setError(error.message || "Failed to cancel claim.");
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
            const userRole = String(user.role || "").toLowerCase();
            if (userRole === "admin" || userRole === "staff") {
                loadPossibleMatches();
            } else {
                loadMySuggestions();
            }
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
    ...(canManageReports
        ? [
              { value: "claims", label: "To review", count: countClaims },
              { value: "matches", label: "Possible matches", count: possibleMatchesTotal },
          ]
        : []),
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
// Shared by the grid and list views
function describeReport(report) {
    const isMine = report.reporterEmail === user?.email;
    const isOpen = report.status !== "reunited" && report.status !== "rejected";
    const canClaimThis =
        canClaimReport && !isMine && isOpen &&
        report.claimStatus !== "pending" && report.claimStatus !== "approved";
    const species = String(report.species || "").toLowerCase();
    const emoji = species === "cat" ? "🐱" : species === "dog" ? "🐶" : "🐾";

    let statusKey = "open";
    let statusLabel = "Open";
    if (report.status === "reunited") {
        statusKey = "reunited";
        statusLabel = "Reunited";
    } else if (report.status === "rejected") {
        statusKey = "rejected";
        statusLabel = "Closed";
    } else if (report.claimStatus === "pending") {
        statusKey = "claim-pending";
        statusLabel = "Claim pending";
    } else if (report.claimStatus === "approved") {
        statusKey = "claim-approved";
        statusLabel = "Claim approved";
    }

    const dateText = report.dateReported
        ? new Date(report.dateReported).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";

    return { isMine, isOpen, canClaimThis, emoji, statusKey, statusLabel, dateText };
}

function openReportDetails(report, withClaim = false) {
    setViewingReport(report);
    setClaimOpen(withClaim);
    setClaimText("");
    setClaimError("");
}

function renderReportActions(report, { isMine, isOpen, canClaimThis }) {
    return (
        <div className="lf2-row-actions" onClick={(e) => e.stopPropagation()}>
            {canClaimThis && report.reportType === "found" && (
                <button type="button" className="lf2-mini is-dark" onClick={() => openReportDetails(report, true)}>
                    This is my pet
                </button>
            )}

            {!isMine && isOpen && report.reportType === "lost" && !canManageReports && (
                <button type="button" className="lf2-mini" onClick={() => startFoundReportFromLostReport(report)}>
                    I found this pet
                </button>
            )}

            {canManageReports && report.claimStatus === "pending" && (
                <button type="button" className="lf2-mini is-dark" onClick={() => openReportDetails(report)}>
                    Review claim
                </button>
            )}

            {canManageReports && report.claimStatus === "approved" && report.status !== "reunited" && (
                <button type="button" className="lf2-mini is-dark" onClick={() => handleMarkReunited(report._id)}>
                    Mark reunited
                </button>
            )}

            <button type="button" className="lf2-link" onClick={() => openReportDetails(report)}>
                View
            </button>

            {canDeleteReport && (
                <button
                    type="button"
                    className="lf2-icon"
                    title="Delete"
                    aria-label="Delete report"
                    onClick={() => handleDeleteReport(report._id)}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                    </svg>
                </button>
            )}
        </div>
    );
}

useEffect(() => {
    const query = mapSearch.trim();
    if (query.length < 3) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
        setMapSearching(true);
        try {
            setMapResults(await searchCebuPlaces(query, controller.signal));
        } catch (err) {
            if (err.name !== "AbortError") setMapResults([]);
        } finally {
            setMapSearching(false);
        }
    }, 400);

    return () => {
        clearTimeout(timer);
        controller.abort();
    };
}, [mapSearch]);

// Fill the location box from a pin (only if the user hasn't typed one)
async function fillLocationFromPin(la, ln) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${la}&lon=${ln}`
        );
        const data = await res.json();
        const a = data.address || {};
        const place = [
            a.road || a.neighbourhood || data.name,
            a.suburb || a.village || a.quarter,
            a.city || a.town || a.municipality,
        ]
            .filter(Boolean)
            .filter((part, i, list) => list.indexOf(part) === i)
            .join(", ");
        if (place) setLocation((current) => (current.trim() ? current : place));
    } catch {
        // Address lookup is a nice-to-have; the pin is already saved
    }
}

function pickOnMap(la, ln) {
    pickPoint(la, ln);
    fillLocationFromPin(la, ln);
}

function pickMapResult(place) {
    pickPoint(place.latitude, place.longitude);
    setMapSearch(place.name);
    setMapSearchOpen(false);
    if (!location.trim()) setLocation([place.name, place.area].filter(Boolean).join(", "));
}

function pickPoint(la, ln) {
    setLat(la.toFixed(6));
    setLng(ln.toFixed(6));
}


if (showReportForm && canSubmitReport) {
    const isLost = reportType === "lost";

   function openReport(report, withClaim = false) {
       setViewingReport(report);
       setClaimOpen(withClaim);
       setClaimText("");
       setClaimError("");
   }
    function pinMyLocation() {
        if (!navigator.geolocation) {
            setError("Your browser can't share your location. Tap the map instead.");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocating(false);
                pickOnMap(position.coords.latitude, position.coords.longitude);
                setSuccess("");
                setError("");
            },
            () => {
                setLocating(false);
                setError("Couldn't get your location. Allow location access, or tap the map to drop a pin.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }

    return (
        <main className="lfr-page lfr2">
            <form className="lfr2-card" onSubmit={handleSubmitReport}>
                <div className="lfr2-head">
                    <div>
                        <h3>Report a pet</h3>
                        <p>
                            Fields marked <em>*</em> are required.
                        </p>
                    </div>

                    <div className="lfr2-seg" role="radiogroup" aria-label="Report type">
                        <button type="button" role="radio" aria-checked={isLost} className={isLost ? "on" : ""} onClick={() => setReportType("lost")}>
                            Lost pet
                        </button>
                        <button type="button" role="radio" aria-checked={!isLost} className={!isLost ? "on" : ""} onClick={() => setReportType("found")}>
                            Found pet
                        </button>
                    </div>
                </div>

                {error && <div className="lost-found-message error">{error}</div>}

                <section className="lfr2-sec">
                    <h4>The pet</h4>
                    <p>{isLost ? "What your pet looks like, so people can recognize it." : "What it looks like, so the owner can recognize it."}</p>

                    <div className="lfr2-grid">
                        <label className="lfr2-field">
                            <span>
                                Pet name {!isLost && <small>(if known)</small>}
                            </span>
                            <input value={petName} onChange={(e) => setPetName(e.target.value)} placeholder={isLost ? "e.g. Brownie" : "Leave blank if unknown"} />
                        </label>

                        <label className="lfr2-field">
                            <span>
                                Species <em>*</em>
                            </span>
                            <select value={species} onChange={(e) => setSpecies(e.target.value)} required>
                                <option value="">Select</option>
                                <option value="Dog">Dog</option>
                                <option value="Cat">Cat</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>

                        <label className="lfr2-field">
                            <span>Breed</span>
                            <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Aspin" />
                        </label>

                        <label className="lfr2-field">
                            <span>Color</span>
                            <select value={color} onChange={(e) => setColor(e.target.value)}>
                                  <option value="">Select</option>
                                  {["Black", "White", "Brown", "Tan", "Gray", "Cream", "Golden", "Orange", "Red", "Mixed", "Other"].map((colourOption) => (
                                      <option key={colourOption} value={colourOption}>{colourOption}</option>
                                  ))}
                            </select>
                        </label>

                        {isLost && (
                            <>
                                <label className="lfr2-field">
                                    <span>Age</span>
                                    <div className="lfr2-age">
                                        <input type="number" min="0" max={ageUnit === "Months" ? 1200 : 100} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 2" />
                                        <select value={ageUnit} onChange={(e) => setAgeUnit(e.target.value)} aria-label="Age unit">
                                            <option value="Years">Years</option>
                                            <option value="Months">Months</option>
                                        </select>
                                    </div>
                                </label>
                            </>
                        )}
                        <label className="lfr2-field">
                            <span>Sex</span>
                            <select value={gender} onChange={(e) => setGender(e.target.value)}>
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Unknown">Unknown</option>
                            </select>
                        </label>

                        <label className="lfr2-field">
                            <span>Size</span>
                            <select value={size} onChange={(e) => setSize(e.target.value)}>
                                <option value="">Select</option>
                                <option value="Small">Small</option>
                                <option value="Medium">Medium</option>
                                <option value="Large">Large</option>
                            </select>
                        </label>

                        <label className="lfr2-field">
                            <span>
                                {isLost ? "Date lost" : "Date found"} <em>*</em>
                            </span>
                            <input type="date" value={dateReported} onChange={(e) => setDateReported(e.target.value)} required />
                        </label>

                        <div className="lfr2-field lfr2-span-4">
                            <span>Photo {!isLost && <em>*</em>}</span>
                            <div className="lfr2-photo">
                                {photoUrl && <img src={photoUrl} alt="Pet preview" />}
                                <label htmlFor="lfr-photo-input" className={`lfr2-photo-btn${photoUploading ? " is-disabled" : ""}`}>
                                    {photoUploading ? "Uploading..." : photoUrl ? "Change photo" : "Choose photo"}
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
                                <small>{photoUrl ? photoName || "Photo added" : "PNG, JPG or WEBP · max 5 MB"}</small>
                                {photoUrl && (
                                    <button
                                        type="button"
                                        className="lfr2-link"
                                        onClick={() => {
                                            setPhotoUrl("");
                                            setPhotoName("");
                                        }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            {photoError && <small className="lfr2-error">{photoError}</small>}
                        </div>

                        <label className="lfr2-field lfr2-span-4">
                            <span>
                                Description <em>*</em>
                            </span>
                            <textarea
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={isLost ? "Markings, collar, behavior or other identifying details..." : "Markings, collar, condition, and where the pet is now..."}
                                required
                            />
                        </label>
                    </div>
                </section>

                <section className="lfr2-sec">
                    <h4>Where &amp; contact</h4>
                    <p>
                        {isLost ? "Where your pet was last seen." : "Where you found the pet."} Tap the map to drop a pin. It shows on the GIS map.
                    </p>

                    <div className="lfr2-two">
                        <div className="lfr2-col">
                            <label className="lfr2-field">
                                <span>
                                    {isLost ? "Last seen location" : "Location name"} <em>*</em>
                                </span>
                                <input
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder={isLost ? "e.g. Brgy. Lahug, Cebu City" : "e.g. Near Ayala Center, Cebu City"}
                                    required
                                />
                            </label>

                            <div className="lfr2-map">
                                <MapContainer
                                    center={lat && lng ? [Number(lat), Number(lng)] : CEBU_CENTER}
                                    zoom={14}
                                    scrollWheelZoom={false}
                                    style={{ height: "100%", width: "100%" }}
                                >
                                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <MapClick onPick={pickOnMap} />
                                    <MapFollow lat={Number(lat)} lng={Number(lng)} />
                                    {lat && lng && <Marker position={[Number(lat), Number(lng)]} icon={PIN_ICON} />}
                                </MapContainer>

                                <button
                                    type="button"
                                    className={`lfr2-locate${locating ? " is-busy" : ""}`}
                                    onClick={pinMyLocation}
                                    disabled={locating}
                                    title="Pin my current location"
                                    aria-label="Pin my current location"
                                >
                                    <img src="/gis/icon-find-nearest.svg" alt="" />
                                </button>

                                <div className="lfr2-map-search">
                                    <input
                                        type="search"
                                        value={mapSearch}
                                        aria-label="Search a place"
                                        onChange={(e) => {
                                            setMapSearch(e.target.value);
                                            setMapSearchOpen(true);
                                            if (e.target.value.trim().length < 3) setMapResults([]);
                                        }}
                                        onFocus={() => setMapSearchOpen(true)}
                                        onBlur={() => setTimeout(() => setMapSearchOpen(false), 150)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault(); // stops the form from submitting
                                                if (mapResults[0]) pickMapResult(mapResults[0]);
                                            }
                                            if (e.key === "Escape") setMapSearchOpen(false);
                                        }}
                                        placeholder="Search a place in Cebu..."
                                    />
                                    {mapSearchOpen && mapSearch.trim().length >= 3 && (
                                        <ul className="gm-map-results">
                                            {mapSearching && mapResults.length === 0 && <li className="is-note">Searching...</li>}
                                            {!mapSearching && mapResults.length === 0 && <li className="is-note">No places found in Cebu.</li>}
                                            {mapResults.map((place) => (
                                                <li key={place.id}>
                                                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickMapResult(place)}>
                                                        <b>{place.name}</b>
                                                        {place.area && <small>{place.area}</small>}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <small className="lfr2-coord">
                                {lat && lng ? `Pinned at ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : "No pin yet"}
                                {" · "}
                                <button type="button" className="lfr2-link" onClick={pinMyLocation} disabled={locating}>
                                    {locating ? "Getting your location..." : "Use my location"}
                                </button>
                                {lat && lng && (
                                    <>
                                        {" · "}
                                        <button
                                            type="button"
                                            className="lfr2-link"
                                            onClick={() => {
                                                setLat("");
                                                setLng("");
                                            }}
                                        >
                                            Clear pin
                                        </button>
                                    </>
                                )}
                            </small>
                        </div>

                        <div className="lfr2-col">
                            <label className="lfr2-field">
                                <span>
                                    Phone number <em>*</em>
                                </span>
                                <div className={`lfr2-phone ${phoneInvalid ? "is-invalid" : ""}`}>
                                    <b>+63</b>
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
                                        required
                                    />
                                </div>
                                {phoneInvalid && <small className="lfr2-error">Enter a 10-digit mobile number starting with 9 (e.g. 917 123 4567).</small>}
                            </label>

                            <label className="lfr2-field">
                                <span>Reported by</span>
                                <input className="is-readonly" value={user?.name || user?.username || ""} readOnly />
                            </label>

                            <label className="lfr2-field">
                                <span>Notes</span>
                                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                            </label>
                        </div>
                    </div>
                </section>

                <footer className="lfr2-foot">
                    <div>
                        <button type="button" className="lfr2-btn" onClick={() => setShowReportForm(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="lfr2-btn is-primary" disabled={submitting || photoUploading}>
                            {submitting ? "Submitting..." : "Submit report"}
                        </button>
                    </div>
                </footer>
            </form>
        </main>
    );
}
    

    return (
        <main className="lost-found-page">
            <div className="lf2-actions">
                <button
                    type="button"
                    className={`lf2-btn ${onlyMine ? "is-on" : ""}`}
                    onClick={() => setOnlyMine(!onlyMine)}
                >
                    My reports <span>{countMine}</span>
                </button>

                {canSubmitReport && (
                    <button type="button" className="lf2-btn is-primary" onClick={() => setShowReportForm(true)}>
                        + Report a pet
                    </button>
                )}
            </div>

            <div className="um-strip">
                <div className="um-strip-total">
                    <b>{reports.length}</b>
                    <small>Total reports</small>
                </div>
                <div>
                    <small>Lost (open)</small>
                    <b>{countLostOpen}</b>
                </div>
                <div>
                    <small>Found (open)</small>
                    <b>{countFoundOpen}</b>
                </div>
                <div>
                    <small>Reunited</small>
                    <b>{countReunited}</b>
                </div>
            </div>

            {error && <div className="lost-found-message error">{error}</div>}
            {success && <div className="lost-found-message success">{success}</div>}

            {mySuggestions.length > 0 && (
                <section className="lf2-card lf-suggest-panel">
                    <h3>Possible matches for your reports</h3>
                    <small className="lf-match-note">
                        Suggested by species, breed, colour, size, sex, distance and dates. Always verify before claiming.
                    </small>

                    <div className="lf-suggest-grid">
                        {mySuggestions.map(({ matchId, score, isConfirmedByStaff, myReport, matchedReport }) => {
                            const matchedSpecies = String(matchedReport.species || "").toLowerCase();

                            return (
                                <div className="lf-match" key={matchId}>
                                    <button
                                        type="button"
                                        className="lf-match-open"
                                        onClick={() => {
                                            setViewingReport(matchedReport);
                                            setClaimOpen(false);
                                        }}
                                    >
                                        <span className="lf-match-photo">
                                            {matchedReport.photoUrl ? (
                                                <img src={matchedReport.photoUrl} alt="" />
                                            ) : matchedSpecies === "cat" ? "🐱" : matchedSpecies === "dog" ? "🐶" : "🐾"}
                                        </span>

                                        <span className="lf-match-info">
                                            <b>
                                                {matchedReport.reportType === "found" ? "Found: " : "Lost: "}
                                                {matchedReport.petName || "Unknown"}
                                            </b>
                                            <small>
                                                {[matchedReport.breed, matchedReport.location && `📍 ${matchedReport.location}`]
                                                    .filter(Boolean)
                                                    .join(" · ")}
                                            </small>
                                            <small>For your report: {myReport.petName || myReport.species}</small>
                                        </span>

                                        <span className="lf-match-tag">
                                            {isConfirmedByStaff ? "Confirmed by staff" : `${Math.floor(score)}%`}
                                        </span>
                                    </button>
                                    {!isConfirmedByStaff && ( 
                                        <button
                                            type="button"
                                            className="lf-match-dismiss"
                                            onClick={() => dismissSuggestedMatch(matchId)}
                                        >
                                            {myReport.reportType === "lost" ? "Not my pet" : "Not a match"}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="lf2-card">
                <div className="lf2-toolbar">
                    <input
                        type="search"
                        className="pet-list-search"
                        aria-label="Search reports"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, breed or location..."
                    />
                    <select
                        className="pet-list-select"
                        aria-label="Species"
                        value={speciesFilter}
                        onChange={(e) => setSpeciesFilter(e.target.value)}
                    >
                        <option value="all">Species: All</option>
                        <option value="Dog">Species: Dogs</option>
                        <option value="Cat">Species: Cats</option>
                    </select>
                    <select
                        className="pet-list-select"
                        aria-label="Sort reports"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="newest">Sort: Newest</option>
                        <option value="oldest">Sort: Oldest</option>
                    </select>

                    <div className="admin-view-toggle">
                        <button
                            type="button"
                            className={viewMode === "list" ? "active" : ""}
                            onClick={() => setViewMode("list")}
                            title="List view"
                            aria-label="List view"
                            aria-pressed={viewMode === "list"}
                        >
                            <img src={viewMode === "list" ? "/icons/list-white.svg" : "/icons/list-brown.svg"} alt="" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className={viewMode === "grid" ? "active" : ""}
                            onClick={() => setViewMode("grid")}
                            title="Grid view"
                            aria-label="Grid view"
                            aria-pressed={viewMode === "grid"}
                        >
                            <img src={viewMode === "grid" ? "/icons/grid-white.svg" : "/icons/grid-brown.svg"} alt="" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div className="lf2-tabs" role="tablist">
                    {LF_CHIPS.map((chip) => (
                        <button
                            key={chip.value}
                            type="button"
                            role="tab"
                            aria-selected={typeFilter === chip.value}
                            className={typeFilter === chip.value ? "is-active" : ""}
                            onClick={() => setTypeFilter(chip.value)}
                        >
                            {chip.label} <span>{chip.count}</span>
                        </button>
                    ))}
                </div>

                {typeFilter === "matches" ? (
                    <div className="lfm-list">
                        <p className="lfm-intro">
                            Suggested by the system from species, breed, colour, size, sex, distance and dates. Check both reports before confirming.
                        </p>
                        {possibleMatches === null ? (
                            <p className="lf2-empty">Loading possible matches...</p>
                        ) : possibleMatches.length === 0 ? (
                            <p className="lf2-empty">No possible matches right now.</p>
                        ) : (
                            possibleMatches.map((match) => {
                                const lostReport = match.reportA?.reportType === "found" ? match.reportB : match.reportA;
                                const foundReport = lostReport === match.reportA ? match.reportB : match.reportA;
                                const kilometers = kilometersBetween(lostReport, foundReport);
                                const lostDate = reportDate(lostReport);
                                const foundDate = reportDate(foundReport);
                                const daysApart =
                                    lostDate && foundDate
                                        ? Math.round(Math.abs(new Date(foundDate) - new Date(lostDate)) / 86400000)
                                        : null;
                                const isDeciding = decidingMatchId === match._id;

                                const renderSide = (report) => {
                                    if (!report) return <div className="lfm-side is-missing">Report removed</div>;
                                    const s = String(report.species || "").toLowerCase();
                                    const date = reportDate(report);
                                    return (
                                        <button
                                            type="button"
                                            className="lfm-side"
                                            title="Open report"
                                            onClick={() => {
                                                setViewingReport(report);
                                                setClaimOpen(false);
                                            }}
                                        >
                                            {report.photoUrl ? (
                                                <img src={report.photoUrl} alt="" />
                                            ) : (
                                                <span className="lfm-thumb" aria-hidden="true">
                                                    {s === "cat" ? "🐱" : s === "dog" ? "🐶" : "🐾"}
                                                </span>
                                            )}
                                            <span className="lfm-info">
                                                <span className={`lfm-type is-${report.reportType}`}>
                                                    {report.reportType === "found" ? "Found" : "Lost"}
                                                </span>
                                                <b>{report.petName || `Unnamed ${s || "pet"}`}</b>
                                                <small>
                                                    {[report.species, report.breed, report.colour || report.color, report.size, report.sex]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </small>
                                                <small>
                                                    {[
                                                        report.location,
                                                        date &&
                                                            new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </small>
                                            </span>
                                        </button>
                                    );
                                };

                                return (
                                    <article className="lfm-card" key={match._id}>
                                        <div className="lfm-pair">
                                            {renderSide(lostReport)}
                                            <div className="lfm-score">
                                                <strong>{Math.round(match.score)}%</strong>
                                                <small>match score</small>
                                                <small>
                                                    {[
                                                        kilometers !== null && `${kilometers.toFixed(1)} km apart`,
                                                        daysApart !== null && `${daysApart} day${daysApart === 1 ? "" : "s"}`,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </small>
                                            </div>
                                            {renderSide(foundReport)}
                                        </div>
                                        <div className="lfm-foot">
                                            <div className="lfm-factors">
                                                {Object.entries(MATCH_FACTOR_LABELS).map(([key, label]) => {
                                                    const similarity = match.factors?.[key];
                                                    if (similarity === null || similarity === undefined || !Number.isFinite(similarity)) return null;
                                                    const factor = describeMatchFactor(similarity);
                                                    return (
                                                        <span key={key} className={`lfm-factor ${factor.tone}`}>
                                                            {label} {factor.text}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                            <div className="lfm-actions">
                                                <button
                                                    type="button"
                                                    className="lfm-btn"
                                                    disabled={isDeciding}
                                                    onClick={() => decidePossibleMatch(match._id, "not_a_match")}
                                                >
                                                    Not a match
                                                </button>
                                                <button
                                                    type="button"
                                                    className="lfm-btn is-primary"
                                                    disabled={isDeciding || !lostReport || !foundReport}
                                                    onClick={() => decidePossibleMatch(match._id, "confirm")}
                                                >
                                                    {isDeciding ? "Saving..." : "Confirm match"}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>
                ) : loading ? (
                    <p className="lf2-empty">Loading reports...</p>
                ) : visibleReports.length === 0 ? (
                    <p className="lf2-empty">
                        {reports.length === 0 ? "No lost or found reports yet." : "No reports match your filters."}
                    </p>
                ) : viewMode === "grid" ? (
                    <div className="lf-grid">
                        {visibleReports.map((report, index) => {
                            const details = describeReport(report);
                            const badge = report.status === "reunited" ? "reunited" : report.reportType;

                            return (
                                <article
                                    key={report._id}
                                    className={`lf-card${details.isMine ? " is-mine" : ""}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openReportDetails(report)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") openReportDetails(report);
                                    }}
                                >
                                    <div className={`lf-card-media tint-${index % 4}`}>
                                        {report.photoUrl ? (
                                            <img src={report.photoUrl} alt="" />
                                        ) : (
                                            <span className="lf-card-emoji" aria-hidden="true">{details.emoji}</span>
                                        )}
                                        <span className={`lf-card-badge is-${badge}`}>{badge}</span>
                                        <span className="lf-card-date">{details.dateText}</span>
                                        {details.isMine && <span className="lf-card-mine">Your report</span>}
                                    </div>

                                    <div className="lf-card-body">
                                        <h3>{report.petName || "Unknown"}</h3>
                                        <small>{[report.species, report.breed].filter(Boolean).join(" · ")}</small>
                                        <small>📍 {report.location || "—"}</small>
                                        <span className={`lf2-pill is-${details.statusKey}`}>{details.statusLabel}</span>
                                        {renderReportActions(report, details)}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="lf2-table-wrap">
                        <table className="lf2-table">
                            <thead>
                                <tr>
                                    <th>Pet</th>
                                    <th>Type</th>
                                    <th>Last seen / found at</th>
                                    <th>Reported by</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th className="lf2-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleReports.map((report) => {
                                    const details = describeReport(report);

                                    return (
                                        <tr key={report._id} onClick={() => openReportDetails(report)}>
                                            <td>
                                                <div className="lf2-pet">
                                                    {report.photoUrl ? (
                                                        <img src={report.photoUrl} alt="" />
                                                    ) : (
                                                        <span className="lf2-thumb" aria-hidden="true">{details.emoji}</span>
                                                    )}
                                                    <div>
                                                        <b>{report.petName || "Unknown"}</b>
                                                        <small>
                                                            {[report.species, report.breed].filter(Boolean).join(" · ")}
                                                            {details.isMine ? " · Your report" : ""}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`lf2-pill is-${report.reportType}`}>
                                                    {report.reportType === "found" ? "Found" : "Lost"}
                                                </span>
                                            </td>
                                            <td>{report.location || "—"}</td>
                                            <td>
                                                <b className="lf2-name">{report.reporterName || report.reporterEmail || "—"}</b>
                                            </td>
                                            <td>
                                                <span className={`lf2-pill is-${details.statusKey}`}>{details.statusLabel}</span>
                                            </td>
                                            <td className="lf2-date">{details.dateText}</td>
                                            <td>{renderReportActions(report, details)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && reports.length > 0 && typeFilter !== "matches" && (
                    <p className="lf2-foot">
                        Showing {visibleReports.length} of {reports.length}
                    </p>
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
    const canReportFoundForThis =
      canSubmitReport &&
      !canManageReports &&
      !isMine &&
      r.reportType === "lost" &&
      r.status !== "reunited";
    const isMyPendingClaim = r.claimStatus === "pending" && r.claimedByEmail === user?.email;
    const canSeeSuggestions = isMine && !canManageReports && r.status !== "reunited";
    const suggestedMatches = canSeeSuggestions
      ? mySuggestions.filter(({ myReport }) => myReport._id === r._id)
      : [];
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
                    {canSeeSuggestions && (
    <div className="lf-matches">
        <h3>{r.reportType === "lost" ? "Possible matches" : "Possible owners"}</h3>

        {suggestedMatches.length === 0 ? (
            <p className="lf-match-empty">No matching reports yet. Check back later.</p>
        ) : (
            <div className="lf-match-list">
                {suggestedMatches.map(({ matchId, matchedReport, score, isConfirmedByStaff }) => (
                    <div className="lf-match" key={matchId}>
                        <button
                            type="button"
                            className="lf-match-open"
                            onClick={() => {
                                setViewingReport(matchedReport);
                                setClaimOpen(false);
                                setClaimText("");
                                setClaimError("");
                            }}
                        >
                            <span className="lf-match-photo">
                                {matchedReport.photoUrl ? <img src={matchedReport.photoUrl} alt="" /> : emoji}
                            </span>

                            <span className="lf-match-info">
                                <b>{matchedReport.petName || "Unknown"}</b>
                                <small>
                                    {[matchedReport.breed, matchedReport.location && `📍 ${matchedReport.location}`]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </small>
                                <small>
                                    {matchedReport.reportType === "found" ? "Found " : "Lost "}
                                    {matchedReport.dateReported
                                        ? new Date(matchedReport.dateReported).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })
                                        : "—"}
                                </small>
                            </span>

                            <span className="lf-match-tag">
                                {isConfirmedByStaff ? "Confirmed by staff" : `${Math.floor(score)}%`}
                            </span>
                        </button>

                        {isMine && !isConfirmedByStaff && (
                            <button
                                type="button"
                                className="lf-match-dismiss"
                                onClick={() => dismissSuggestedMatch(matchId)}
                            >
                                {r.reportType === "lost" ? "Not my pet" : "Not a match"}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}

        <small className="lf-match-note">
            Suggested by species, breed, colour, size, sex, distance and dates. Always verify before claiming.
        </small>
    </div>
)}
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
                  <dt>Mobile</dt>
                  <dd>{r.claimContactNumber ? `+63 ${r.claimContactNumber}` : "—"}</dd>
            </div>
            <div>
                <dt>Submitted</dt>
                <dd>
                    {r.claimedAt
                        ? new Date(r.claimedAt).toLocaleString("en-US", {
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
        
        {r.claimProofPhotoUrl && (
            <a href={r.claimProofPhotoUrl} target="_blank" rel="noreferrer">
                <img className="lf-claim-proof-photo" src={r.claimProofPhotoUrl} alt="Proof of ownership" />
            </a>
        )}

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
        <label className="lfr2-field">
            <span>Proof of ownership <em>*</em></span>
            <textarea
                rows={4}
                maxLength={500}
                value={claimText}
                onChange={(e) => {
                    setClaimText(e.target.value);
                    setClaimError("");
                }}
                placeholder="Marks or scars, collar, the name it answers to, when and where it was lost..."
            />
            <small>At least 20 characters ({claimText.trim().length} so far)</small>
        </label>

        <label className="lfr2-field">
            <span>Mobile number <em>*</em></span>
            <div className="lfr2-phone">
                <b>+63</b>
                <input
                    type="tel"
                    inputMode="numeric"
                    value={claimContactNumber}
                    onChange={(e) => {
                        let digits = e.target.value.replace(/\D/g, "");
                        if (digits.startsWith("63")) digits = digits.slice(2);
                        if (digits.startsWith("0")) digits = digits.slice(1);
                        setClaimContactNumber(digits.slice(0, 10));
                        setClaimError("");
                    }}
                    placeholder="9XX XXX XXXX"
                />
            </div>
        </label>

        <div className="lfr2-field">
            <span>Proof photo <small>(optional: you with the pet, or its vet card)</small></span>
            <div className="lfr2-photo">
                {claimProofPhotoUrl && <img src={claimProofPhotoUrl} alt="Proof preview" />}
                <label htmlFor="lf-claim-proof-input" className={`lfr2-photo-btn${claimProofUploading ? " is-disabled" : ""}`}>
                    {claimProofUploading ? "Uploading..." : claimProofPhotoUrl ? "Change photo" : "Choose photo"}
                </label>
                <input
                    id="lf-claim-proof-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    disabled={claimProofUploading}
                    onChange={(e) => {
                        uploadClaimProofPhoto(e.target.files[0]);
                        e.target.value = "";
                    }}
                />
            </div>
        </div>

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
    {canReportFoundForThis && (
        <button type="button" className="lfr-submit" onClick={() => startFoundReportFromLostReport(r)}>
            I Found This Pet
        </button>
    )}
    {isMyPendingClaim && (
        <button
            type="button"
            className="lfr-cancel"
            onClick={async () => {
                const confirmed = await askConfirm({
                    title: "Cancel your claim?",
                    message: "The report will reopen so it can be claimed again.",
                    confirmLabel: "Cancel claim",
                });
                if (!confirmed) return;

                const done = await handleCancelClaim(r._id);
                if (done) setViewingReport(null);
            }}
        >
            Cancel My Claim
        </button>
    )}
    {canClaimThis && claimOpen && (
        <button
            type="button"
            className="lfr-submit"
            onClick={async () => {
                if (claimText.trim().length < 20) {
                    setClaimError("Please describe your proof of ownership in at least 20 characters.");
                    return;
                }
                if (!/^9\d{9}$/.test(claimContactNumber)) {
                    setClaimError("Enter a 10-digit mobile number starting with 9 (e.g. 917 123 4567).");
                    return;
                }
                const done = await handleClaim(r._id);
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