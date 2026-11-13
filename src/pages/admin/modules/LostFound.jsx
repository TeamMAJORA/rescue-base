import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { searchCebuPlaces } from "../../../utils/cebuPlaces";
import { DateField, startOfToday, toDayValue } from "../../../components/system/MonthCalendar";
import PetTypeIcon from "../../../components/system/PetTypeIcon";


// Lost/found dates: up to 5 years back, never in the future
function earliestReportDay() {
    const today = startOfToday();
    return new Date(today.getFullYear() - 5, 0, 1);
}

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

export default function LostFoundPage({ setPage, openReportId, onOpenReportHandled }) {
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
    // Admin "Select" mode: pick several reports and delete them together
    const [isSelectingReports, setIsSelectingReports] = useState(false);
    // Fixed "now" for the "x days ago" labels (avoids calling Date.now() while rendering)
    const [pageOpenedAt] = useState(() => Date.now());
    const [selectedReportIds, setSelectedReportIds] = useState([]);
    const [typeFilter, setTypeFilter] = useState("all");
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
    // "ownership" = This is my pet (found report); "found" = I found this pet (lost report)
    const [claimMode, setClaimMode] = useState("ownership");
    const [foundLocation, setFoundLocation] = useState("");
    const [foundDate, setFoundDate] = useState("");
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

    // Staff review claims; the server refuses claims from staff and admin
    const canClaimReport = [
        "adopter",
        "foster",
        "volunteer",
    ].includes(role);

    const canManageReports = isAdmin || isStaff;
    // Selecting several reports to delete at once is admin-only; single deletes use report.canDelete
    const canBulkDelete = isAdmin;
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
            "ngrok-skip-browser-warning": "true",
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
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
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
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
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
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
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
                    "ngrok-skip-browser-warning": "true",
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

        if (!dateReported) {
            setError(`Please pick the date the pet was ${reportType === "lost" ? "lost" : "found"}.`);
            return;
        }

        if (dateReported > toDayValue(startOfToday())) {
            setError("The date can't be in the future.");
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
                        "ngrok-skip-browser-warning": "true",
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
                          notes.trim() && `Notes: ${notes.trim()}`,
                          ].filter(Boolean).join(" · "),
                          location: location.trim(),
                          dateReported,
                          photoUrl: photoUrl.trim(),
                          contactNumber,
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
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" }, // no Content-Type: the browser sets it for files
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
                    "ngrok-skip-browser-warning": "true",
                },
                body: JSON.stringify({
                    claimType: claimMode,
                    claimNotes: claimText.trim(),
                    claimContactNumber,
                    claimProofPhotoUrl,
                    ...(claimMode === "found" ? { foundLocation: foundLocation.trim(), foundDate } : {}),
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
        setFoundLocation("");
        setFoundDate("");
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
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
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

    // Returns the updated report, or null when the review failed
    async function handleReviewClaim(
        reportId,
        claimId,
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
                        "ngrok-skip-browser-warning": "true",
                    },
                    body: JSON.stringify({
                        claimId,
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
            return data.report;

        } catch (error) {
            console.error(
                "Review lost and found claim error:",
                error
            );

            setError(
                error.message ||
                "Failed to review claim."
            );
            return null;
        }
    }

    // The person who decides opened the report: its claims stop showing as "New"
    async function markClaimsSeen(reportId) {
        try {
            const response = await fetch(`${API}/api/lost-found/reports/${reportId}/claims/seen`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || "Could not update the report.");

            setReports((current) => current.map((report) => (report._id === reportId ? data.report : report)));
        } catch (error) {
            console.error("Mark claims seen error:", error);
        }
    }

    function stopSelectingReports() {
        setIsSelectingReports(false);
        setSelectedReportIds([]);
    }

    function toggleSelectedReport(reportId) {
        setSelectedReportIds((current) =>
            current.includes(reportId) ? current.filter((id) => id !== reportId) : [...current, reportId]
        );
    }

    async function handleDeleteSelectedReports() {
        const count = selectedReportIds.length;
        if (count === 0) return;

        const confirmed = await askConfirm({
            title: `Delete ${count} report${count === 1 ? "" : "s"}?`,
            message: "This can't be undone.",
            confirmLabel: "Delete",
            danger: true,
        });
        if (!confirmed) return;

        setError("");
        setSuccess("");

        const results = await Promise.allSettled(
            selectedReportIds.map((reportId) =>
                fetch(`${API}/api/lost-found/reports/${reportId}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
                }).then((response) => {
                    if (!response.ok) throw new Error(`Failed to delete report ${reportId}`);
                })
            )
        );

        const failedCount = results.filter((result) => result.status === "rejected").length;
        const deletedCount = count - failedCount;

        if (failedCount > 0) {
            setError(`${failedCount} report${failedCount === 1 ? "" : "s"} could not be deleted.`);
        }
        if (deletedCount > 0) {
            setSuccess(`${deletedCount} report${deletedCount === 1 ? "" : "s"} deleted.`);
        }

        stopSelectingReports();
        await loadReports();
    }

    async function handleDeleteReport(reportId) {
        const confirmed = await askConfirm({ title: "Delete this lost and found report?", message: "This can't be undone.", confirmLabel: "Delete", danger: true });

        if (!confirmed) {
            return false;
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
                        "ngrok-skip-browser-warning": "true",
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
            return true;
        } catch (error) {
            console.error(
                "Delete lost and found report error:",
                error
            );

            setError(
                error.message ||
                "Failed to delete report."
            );
            return false;
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
const countMine = reports.filter((r) => r.isMine).length;
// Claims waiting on this user's decision (staff: shelter intake listings)
const needsMyDecision = (r) => r.canReviewClaims && r.pendingClaimCount > 0;
const countClaims = reports.filter(needsMyDecision).length;
const countNewClaims = reports.reduce((total, r) => total + (r.newClaimCount || 0), 0);
const isOpenReport = (r) => r.status !== "reunited" && r.status !== "rejected";
const countLostOpen = reports.filter((r) => r.reportType === "lost" && isOpenReport(r)).length;
const countFoundOpen = reports.filter((r) => r.reportType === "found" && isOpenReport(r)).length;

const LF_CHIPS = [
    { value: "all", label: "All", count: reports.length },
    { value: "lost", label: "Lost", count: countLost },
    { value: "found", label: "Found", count: countFound },
    ...(canManageReports ? [] : [{ value: "mine", label: "My Reports", count: countMine, newCount: countNewClaims }]),
    ...(canManageReports
        ? [
              { value: "claims", label: "To review", count: countClaims, newCount: countNewClaims },
              { value: "matches", label: "Possible matches", count: possibleMatchesTotal },
          ]
        : []),
    { value: "reunited", label: "Reunited", count: countReunited },
];

const query = search.trim().toLowerCase();

const visibleReports = reports
    .filter((r) => {
        if (typeFilter === "reunited") return r.status === "reunited";
        if (typeFilter === "claims") return needsMyDecision(r);
        if (typeFilter === "mine") return r.isMine;
        if (typeFilter !== "all") return r.reportType === typeFilter;
        return true;
    })
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
// Possible-match count per report id (staff: from the matches list; users: from their suggestions)
const possibleMatchCountByReportId = {};
if (canManageReports) {
    (possibleMatches || []).forEach((match) => {
        [match.reportA?._id, match.reportB?._id].filter(Boolean).forEach((reportId) => {
            possibleMatchCountByReportId[reportId] = (possibleMatchCountByReportId[reportId] || 0) + 1;
        });
    });
} else {
    mySuggestions.forEach((suggestion) => {
        const reportId = suggestion.myReport?._id;
        if (reportId) possibleMatchCountByReportId[reportId] = (possibleMatchCountByReportId[reportId] || 0) + 1;
    });
}

// One small tag on a card, only when something needs attention
function getCardFlag(report, details) {
    if (report.newClaimCount > 0) {
        return { tone: "new", text: `${report.newClaimCount} new claim${report.newClaimCount === 1 ? "" : "s"}` };
    }
    if (needsMyDecision(report)) {
        return { tone: "claim", text: `${report.pendingClaimCount} claim${report.pendingClaimCount === 1 ? "" : "s"} to review` };
    }
    const matchCount = possibleMatchCountByReportId[report._id] || 0;
    if (matchCount > 0 && details.isOpen) {
        return { tone: "match", text: `${matchCount} possible match${matchCount === 1 ? "" : "es"}` };
    }
    if (report.myClaimStatus === "pending") {
        return { tone: "claim", text: report.myClaimType === "found" ? "You said you found it" : "Claim sent" };
    }
    if (details.isMine) {
        return { tone: "mine", text: "Your report" };
    }
    return null;
}

function timeAgo(value) {
    if (!value) return "No date";
    const date = new Date(value);
    const days = Math.floor((pageOpenedAt - date.getTime()) / 86400000);
    if (days <= 0) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Shared by the grid and list views
function describeReport(report) {
    const isMine = report.isMine;
    const isOpen = report.status !== "reunited" && report.status !== "rejected";
    const canClaimThis =
        canClaimReport && !isMine && isOpen &&
        report.claimStatus !== "approved" && report.myClaimStatus !== "pending";
    const canSayFound = canClaimThis && report.reportType === "lost";
    const species = String(report.species || "").toLowerCase();
    const speciesIcon = <PetTypeIcon type={species} />;

    let statusKey = "open";
    let statusLabel = "Open";
    if (report.status === "reunited") {
        statusKey = "reunited";
        statusLabel = "Reunited";
    } else if (report.status === "rejected") {
        statusKey = "rejected";
        statusLabel = "Closed";
    } else if (report.myClaimStatus === "pending") {
        statusKey = "claim-pending";
        statusLabel = report.myClaimType === "found" ? "Sent to the owner" : "Your claim: under review";
    } else if (report.claimStatus === "pending") {
        statusKey = "claim-pending";
        statusLabel = `${report.pendingClaimCount} claim${report.pendingClaimCount === 1 ? "" : "s"} under review`;
    } else if (report.claimStatus === "approved") {
        statusKey = "claim-approved";
        statusLabel = "Claim approved";
    }

    const dateText = report.dateReported
        ? new Date(report.dateReported).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";

    return { isMine, isOpen, canClaimThis, canSayFound, speciesIcon, statusKey, statusLabel, dateText };
}

// Opened from a GIS map pin: show that report once the list has loaded
useEffect(() => {
    if (!openReportId || loading) return;
    const reportFromMap = reports.find((report) => report._id === openReportId);
    if (reportFromMap) openReportDetails(reportFromMap);
    onOpenReportHandled?.();
}, [openReportId, loading, reports]); // eslint-disable-line react-hooks/exhaustive-deps

// claimType: open the "This is my pet" / "I found this pet" form straight away
function openReportDetails(report, claimType = null) {
    setViewingReport(report);
    setClaimOpen(Boolean(claimType));
    setClaimMode(claimType || (report.reportType === "lost" ? "found" : "ownership"));
    setClaimText("");
    setClaimError("");
    setFoundLocation("");
    setFoundDate("");
    if (report.newClaimCount > 0) markClaimsSeen(report._id);
}

function renderReportActions(report, { canClaimThis, canSayFound }) {
    return (
        <div className="lf2-row-actions" onClick={(e) => e.stopPropagation()}>
            {canClaimThis && report.reportType === "found" && (
                <button type="button" className="lf2-mini is-dark" onClick={() => openReportDetails(report, "ownership")}>
                    This is my pet
                </button>
            )}

            {canSayFound && (
                <button type="button" className="lf2-mini" onClick={() => openReportDetails(report, "found")}>
                    I found this pet
                </button>
            )}

            {needsMyDecision(report) && (
                <button type="button" className="lf2-mini is-dark" onClick={() => openReportDetails(report)}>
                    {report.pendingClaimCount > 1 ? `Review claims (${report.pendingClaimCount})` : "Review claim"}
                </button>
            )}

            <button type="button" className="lf2-link" onClick={() => openReportDetails(report)}>
                View
            </button>

            {report.canDelete && (
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

                        <div className="lfr2-field">
                            <span>
                                {isLost ? "Date lost" : "Date found"} <em>*</em>
                            </span>
                            <DateField
                                value={dateReported}
                                onChange={setDateReported}
                                minDate={earliestReportDay()}
                                maxDate={startOfToday()}
                                ariaLabel={isLost ? "Date lost" : "Date found"}
                            />
                        </div>

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
                                            ) : <PetTypeIcon type={matchedSpecies} />}
                                        </span>

                                        <span className="lf-match-info">
                                            <b>
                                                {matchedReport.reportType === "found" ? "Found: " : "Lost: "}
                                                {matchedReport.petName || "Unknown"}
                                            </b>
                                            <small>
                                                {[matchedReport.breed, matchedReport.location]
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

                <div className="lf-tabs-row">
                    <div className="lf2-tabs" role="tablist">
                        {LF_CHIPS.map((chip) => (
                            <button
                                key={chip.value}
                                type="button"
                                role="tab"
                                aria-selected={typeFilter === chip.value}
                                className={typeFilter === chip.value ? "is-active" : ""}
                                onClick={() => {
                                    setTypeFilter(chip.value);
                                    stopSelectingReports();
                                }}
                            >
                                {chip.label} <span>{chip.count}</span>
                                {chip.newCount > 0 && (
                                    <em className="lf2-tab-new" title="New claims on your reports">
                                        {chip.newCount} new
                                    </em>
                                )}
                            </button>
                        ))}
                    </div>

                    {canBulkDelete && viewMode === "grid" && typeFilter !== "matches" && visibleReports.length > 0 && (
                        isSelectingReports ? (
                            <div className="lf-select-bar">
                                <b>{selectedReportIds.length} selected</b>
                                <button
                                    type="button"
                                    className="lf-select-link"
                                    onClick={() => setSelectedReportIds(visibleReports.map((report) => report._id))}
                                >
                                    Select all
                                </button>
                                <button type="button" className="lf-select-btn" onClick={stopSelectingReports}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="lf-select-btn is-danger"
                                    disabled={selectedReportIds.length === 0}
                                    onClick={handleDeleteSelectedReports}
                                >
                                    Delete ({selectedReportIds.length})
                                </button>
                            </div>
                        ) : (
                            <button type="button" className="lf-select-btn" onClick={() => setIsSelectingReports(true)}>
                                Select
                            </button>
                        )
                    )}
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
                                                    <PetTypeIcon type={s} />
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
                            const isSelected = selectedReportIds.includes(report._id);
                            const cardFlag = getCardFlag(report, details);
                            const openOrSelect = () =>
                                isSelectingReports ? toggleSelectedReport(report._id) : openReportDetails(report);

                            return (
                                <article
                                    key={report._id}
                                    className={`lf-card${details.isMine ? " is-mine" : ""}${isSelected ? " is-selected" : ""}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={isSelectingReports ? isSelected : undefined}
                                    onClick={openOrSelect}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            openOrSelect();
                                        }
                                    }}
                                >
                                    <div className={`lf-card-thumb tint-${index % 4}`}>
                                        {report.photoUrl ? (
                                            <img className="lf-card-photo" src={report.photoUrl} alt="" />
                                        ) : (
                                            <img className="lf-card-placeholder" src="/icons/sidebar/brown paw.svg" alt="" aria-hidden="true" />
                                        )}
                                    </div>

                                    <div className="lf-card-info">
                                        <div className="lf-card-title">
                                            <h3>{report.petName || "Unknown"}</h3>
                                            <span className={`lf-card-badge is-${badge}`}>{badge}</span>
                                        </div>
                                        <small className="lf-card-sub">
                                            {[report.species, report.breed].filter(Boolean).join(" · ") || "Unknown species"}
                                        </small>
                                        <div className="lf-card-meta">
                                            <span>
                                                <img src="/icons/pawPin.svg" alt="" aria-hidden="true" />
                                                {report.location || "No location"}
                                            </span>
                                            <span>
                                                <img src="/icons/Clock.svg" alt="" aria-hidden="true" />
                                                {timeAgo(report.dateReported || report.createdAt)}
                                            </span>
                                        </div>
                                        {cardFlag && <span className={`lf-card-flag is-${cardFlag.tone}`}>{cardFlag.text}</span>}
                                    </div>

                                    {isSelectingReports && (
                                        <span className={`lf-card-check${isSelected ? " is-on" : ""}`} aria-hidden="true">
                                            {isSelected && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M5 12l5 5L20 7" />
                                                </svg>
                                            )}
                                        </span>
                                    )}

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
                                                        <span className="lf2-thumb" aria-hidden="true">{details.speciesIcon}</span>
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
                                                <b className="lf2-name">{report.reporterName || "—"}</b>
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
    const isMine = r.isMine;
    const [mainText, ...extras] = String(r.description || "").split(" · ");
    const details = extras
        .map((part) => {
            const i = part.indexOf(": ");
            return i === -1 ? null : [part.slice(0, i), part.slice(i + 2)];
        })
        .filter(Boolean);
    const s = String(r.species || "").toLowerCase();
    const speciesIcon = <PetTypeIcon type={s} />;
    const badge = r.status === "reunited" ? "reunited" : r.reportType;
    const { canClaimThis: canClaimAny } = describeReport(r);
    // "This is my pet" on found reports, "I found this pet" on lost reports
    const canClaimThis = canClaimAny && r.reportType === "found";
    const canSayFoundForThis = canClaimAny && r.reportType === "lost";
    const isMyPendingClaim = r.myClaimStatus === "pending";
    const visibleClaims = r.claims || [];
    const ownershipClaims = visibleClaims.filter((claim) => claim.claimType !== "found");
    const foundClaims = visibleClaims.filter((claim) => claim.claimType === "found");
    const otherPendingClaimCount = r.otherPendingClaimCount || 0;
    const decidedBy = r.linkedAnimal ? "shelter staff" : "the finder";
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
                        <span className="lf-card-emoji">{speciesIcon}</span>
                    )}
                    <span className={`lf-card-badge is-${badge}`}>{badge}</span>
                </div>
                <button
                    type="button"
                    className="lf-modal-close"
                    onClick={() => setViewingReport(null)}
                    aria-label="Close"
                >
                    ×
                </button>

                <div className="lf-modal-body">
                    <h2>{r.petName || "Unknown"}</h2>
                    <small>{[r.species, r.breed].filter(Boolean).join(" · ")}</small>

                    <dl className="lf-modal-facts">
                        <div>
                            <dt>{r.reportType === "lost" ? "Last seen" : "Found at"}</dt>
                            <dd><img className="inline-icon" src="/icons/strayMap-brown.svg" alt="" /> {r.location}</dd>
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
                        {r.reporterContactNumber && (
                            <div>
                                <dt>Contact</dt>
                                <dd>+63 {r.reporterContactNumber}</dd>
                            </div>
                        )}
                        {r.claimStatus === "pending" && (
                            <div>
                                <dt>Claims</dt>
                                <dd>{r.pendingClaimCount} under review</dd>
                            </div>
                        )}
                        {r.claimStatus === "approved" && (
                            <div>
                                <dt>Claim</dt>
                                <dd>Approved</dd>
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
                                {matchedReport.photoUrl ? <img src={matchedReport.photoUrl} alt="" /> : speciesIcon}
                            </span>

                            <span className="lf-match-info">
                                <b>{matchedReport.petName || "Unknown"}</b>
                                <small>
                                    {[matchedReport.breed, matchedReport.location]
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
    {!r.canReviewClaims && !isMine && otherPendingClaimCount > 0 && r.reportType === "found" && r.claimStatus === "pending" && (
        <p className="lf-claim-indicator">
            {otherPendingClaimCount === 1 ? "Someone else has" : `${otherPendingClaimCount} other people have`} claimed
            this pet and {decidedBy} {otherPendingClaimCount === 1 ? "is" : "are"} reviewing.
            {canClaimThis ? " If it is yours, you can still submit your own claim." : ""}
        </p>
    )}
    {[
        { claims: ownershipClaims, type: "ownership" },
        { claims: foundClaims, type: "found" },
    ].map(({ claims, type }) =>
        claims.length > 0 && (
            <div className="lf-claims" key={type}>
                <h3>
                    {r.canReviewClaims || canManageReports
                        ? type === "found" ? "Found claims" : "Ownership claims"
                        : type === "found" ? "You said you found this pet" : "Your claim"}
                    {claims.length > 1 ? ` (${claims.length})` : ""}
                </h3>
                {r.canReviewClaims && r.claimStatus !== "approved" && (
                    <p>
                        {type === "found"
                            ? "These people say they found your pet. Check the photo, contact them, then approve the right one."
                            : r.linkedAnimal
                                ? "Check each owner's proof before releasing the shelter animal."
                                : "These people say the pet you found is theirs. Contact them, then approve the real owner."}
                    </p>
                )}
                {r.canReviewClaims && r.claimStatus === "approved" && (
                    <p>A claim was approved. Contact them to arrange the handover.</p>
                )}
                {!r.canReviewClaims && canManageReports && (
                    <p className="lf-claim-readonly">The finder decides these claims. Staff can only decide shelter intake listings.</p>
                )}

                {claims.map((claim) => {
                    const isNew = r.canReviewClaims && claim.status === "pending" && !claim.seenByReviewerAt;
                    const formatDay = (value) =>
                        value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

                    return (
                        <div className={`lf-claim-review${isNew ? " is-new" : ""}`} key={claim._id}>
                            <h3>
                                {claim.claimantName}{" "}
                                <span className={`lf-claim-pill is-${claim.status}`}>{claim.status}</span>
                                {isNew && <span className="lf-claim-pill is-new">New</span>}
                            </h3>

                            <dl className="lf-modal-facts">
                                <div>
                                    <dt>Email</dt>
                                    <dd>{claim.claimantEmail || "—"}</dd>
                                </div>
                                <div>
                                    <dt>Mobile</dt>
                                    <dd>{claim.contactNumber ? `+63 ${claim.contactNumber}` : "—"}</dd>
                                </div>
                                {type === "found" && (
                                    <>
                                        <div>
                                            <dt>Found at</dt>
                                            <dd><img className="inline-icon" src="/icons/strayMap-brown.svg" alt="" /> {claim.foundLocation || "—"}</dd>
                                        </div>
                                        <div>
                                            <dt>Date found</dt>
                                            <dd>{formatDay(claim.foundDate)}</dd>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <dt>Submitted</dt>
                                    <dd>
                                        {claim.claimedAt
                                            ? new Date(claim.claimedAt).toLocaleString("en-US", {
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

                            <h3>{type === "found" ? "What they found" : "Proof given"}</h3>
                            <p className="lf-claim-proof">{claim.proofNotes || "No details were saved."}</p>

                            {claim.proofPhotoUrl && (
                                <a href={claim.proofPhotoUrl} target="_blank" rel="noreferrer">
                                    <img
                                        className="lf-claim-proof-photo"
                                        src={claim.proofPhotoUrl}
                                        alt={type === "found" ? `Pet found by ${claim.claimantName}` : `Proof of ownership from ${claim.claimantName}`}
                                    />
                                </a>
                            )}

                            {r.canReviewClaims && claim.status === "pending" && (
                                <div className="lf-claim-review-actions">
                                    <button
                                        type="button"
                                        className="lfr-cancel"
                                        onClick={async () => {
                                            const updated = await handleReviewClaim(r._id, claim._id, "rejected");
                                            if (updated) setViewingReport(updated.claimStatus === "pending" ? updated : null);
                                        }}
                                    >
                                        Reject
                                    </button>
                                    <button
                                        type="button"
                                        className="lfr-submit"
                                        onClick={async () => {
                                            const otherPending = r.pendingClaimCount - 1;
                                            const confirmed = await askConfirm({
                                                title: `Approve ${claim.claimantName}'s ${type === "found" ? "found claim" : "claim"}?`,
                                                message:
                                                    "The case will be marked as reunited." +
                                                    (otherPending > 0
                                                        ? ` The other ${otherPending} pending claim${otherPending === 1 ? "" : "s"} will be rejected and notified.`
                                                        : ""),
                                                confirmLabel: "Approve",
                                            });
                                            if (!confirmed) return;
                                            const updated = await handleReviewClaim(r._id, claim._id, "approved");
                                            if (updated) setViewingReport(null);
                                        }}
                                    >
                                        Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )
    )}
    {claimOpen && (canClaimThis || canSayFoundForThis) && (
    <div className="lf-claim">
        <h3>{claimMode === "found" ? "I found this pet" : "Submit an ownership claim"}</h3>
        <p>
            {claimMode === "found"
                ? "Only the owner will see your name, mobile number, photo and details. They'll contact you if it's their pet. This doesn't create a new report."
                : r.linkedAnimal
                    ? "Tell the shelter how they can confirm this is your pet. Staff will review your claim before the pet is released."
                    : "The finder will see your name, mobile number and proof, and decides whether to approve your claim."}
        </p>

        {claimMode === "found" && (
            <>
                <label className="lfr2-field">
                    <span>Where did you find it? <em>*</em></span>
                    <input
                        value={foundLocation}
                        maxLength={200}
                        onChange={(e) => {
                            setFoundLocation(e.target.value);
                            setClaimError("");
                        }}
                        placeholder="e.g. Near Ayala Center, Cebu City"
                    />
                </label>
                <div className="lfr2-field">
                    <span>Date found <em>*</em></span>
                    <DateField
                        value={foundDate}
                        onChange={(day) => {
                            setFoundDate(day);
                            setClaimError("");
                        }}
                        minDate={earliestReportDay()}
                        maxDate={startOfToday()}
                        ariaLabel="Date found"
                        floating={false}
                    />
                </div>
            </>
        )}

        <label className="lfr2-field">
            <span>{claimMode === "found" ? "Describe the pet and how you found it" : "Proof of ownership"} <em>*</em></span>
            <textarea
                rows={4}
                maxLength={500}
                value={claimText}
                onChange={(e) => {
                    setClaimText(e.target.value);
                    setClaimError("");
                }}
                placeholder={
                    claimMode === "found"
                        ? "Collar, markings, how it behaves, where it is now..."
                        : "Marks or scars, collar, the name it answers to, when and where it was lost..."
                }
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
            <span>
                {claimMode === "found" ? (
                    <>Photo of the pet <em>*</em></>
                ) : (
                    <>Proof photo <small>(optional: you with the pet, or its vet card)</small></>
                )}
            </span>
            <div className="lfr2-photo">
                {claimProofPhotoUrl && <img src={claimProofPhotoUrl} alt="Photo preview" />}
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
    {r.canDelete && (
        <button
            type="button"
            className="lfr-delete"
            onClick={async () => {
                const deleted = await handleDeleteReport(r._id);
                if (deleted) setViewingReport(null);
            }}
        >
            Delete report
        </button>
    )}

    <button type="button" className="lfr-cancel" onClick={() => setViewingReport(null)}>
        Close
    </button>

    {!claimOpen && (canClaimThis || canSayFoundForThis) && (
        <button
            type="button"
            className="lfr-submit"
            onClick={() => {
                setClaimMode(canSayFoundForThis ? "found" : "ownership");
                setClaimOpen(true);
            }}
        >
            {canSayFoundForThis ? "I Found This Pet" : "This Is My Pet"}
        </button>
    )}
    {isMyPendingClaim && (
        <button
            type="button"
            className="lfr-cancel"
            onClick={async () => {
                const confirmed = await askConfirm({
                    title: r.myClaimType === "found" ? "Take back your found claim?" : "Cancel your claim?",
                    message: `It will be withdrawn and ${r.linkedAnimal ? "shelter staff" : "the reporter"} will no longer see it as pending.`,
                    confirmLabel: "Withdraw",
                });
                if (!confirmed) return;

                const done = await handleCancelClaim(r._id);
                if (done) setViewingReport(null);
            }}
        >
            {r.myClaimType === "found" ? "Withdraw" : "Cancel My Claim"}
        </button>
    )}
    {claimOpen && (canClaimThis || canSayFoundForThis) && (
        <button
            type="button"
            className="lfr-submit"
            disabled={claimProofUploading}
            onClick={async () => {
                if (claimMode === "found") {
                    if (!foundLocation.trim()) return setClaimError("Please say where you found the pet.");
                    if (!foundDate) return setClaimError("Please pick the date you found the pet.");
                    if (!claimProofPhotoUrl) return setClaimError("Please add a photo so the owner can recognise their pet.");
                }
                if (claimText.trim().length < 20) {
                    setClaimError(
                        claimMode === "found"
                            ? "Please describe the pet and how you found it in at least 20 characters."
                            : "Please describe your proof of ownership in at least 20 characters."
                    );
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
            {claimMode === "found" ? "Send to Owner" : "Submit Claim"}
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