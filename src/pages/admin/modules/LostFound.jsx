import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
<<<<<<< HEAD
=======
import { searchCebuPlaces } from "../../../utils/cebuPlaces";
import { DateField, startOfToday, toDayValue } from "../../../components/system/MonthCalendar";
import PetTypeIcon from "../../../components/system/PetTypeIcon";
import { askConfirm } from "../../../utils/dialogs";
import { formatDate, formatDateTime } from "../../../utils/formatDate";
import LoadingState from "../../../components/system/LoadingState";
import Icon from "../../../components/system/Icon";
import NumberInput from "../../../components/system/NumberInput";
import PhoneInput from "../../../components/system/PhoneInput";
import RequiredValue from "../../../components/system/RequiredValue";
import FormTracker from "../../../components/system/FormTracker";
import { readFormDraft, useFormDraft } from "../../../utils/useFormDraft";
import { formatTime } from "../../../utils/formatDate";
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe


// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

const API = import.meta.env.VITE_BACKEND_URL;

// A new report, step by step: what happened, then the pet, then how to reach the reporter
const REPORT_STEPS = [
    { key: "what", label: "What happened" },
    { key: "pet", label: "The pet" },
    { key: "contact", label: "Contact" },
];

const EMPTY_REPORT = {
    reportType: "lost",
    petName: "",
    species: "",
    breed: "",
    description: "",
    location: "",
    dateReported: "",
    photoUrl: "",
    photoName: "",
    color: "",
    age: "",
    ageUnit: "Years",
    gender: "",
    size: "",
    contactNumber: "",
    notes: "",
    lat: "",
    lng: "",
};

function storedUserEmail() {
    try {
        return JSON.parse(localStorage.getItem("rescuebase_user") || "{}").email || "guest";
    } catch {
        return "guest";
    }
}

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

// Place search limited to Cebu (mainland, Mactan and nearby islands)
async function searchCebuPlaces(query, signal) {
    const params = new URLSearchParams({
        format: "jsonv2",
        q: query,
        limit: "6",
        countrycodes: "ph",
        viewbox: "123.25,11.35,124.25,9.40",
        bounded: "1",
        addressdetails: "1",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
    const data = await response.json();

    return (Array.isArray(data) ? data : []).map((item) => {
        const a = item.address || {};
        const name = item.name || String(item.display_name || "").split(",")[0];
        const area = [a.suburb || a.village || a.neighbourhood || a.quarter, a.city || a.town || a.municipality]
            .filter(Boolean)
            .filter((part) => part !== name)
            .join(", ");

        return {
            id: String(item.place_id),
            name,
            area: area || String(item.display_name || "").split(",").slice(1, 3).join(",").trim(),
            latitude: Number(item.lat),
            longitude: Number(item.lon),
        };
    });
}

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
const MATCH_IGNORED_LOCATION_WORDS = new Set(["city", "near", "the", "brgy", "barangay", "street", "and"]);
const DISMISSED_MATCHES_STORAGE_KEY = "rb_lost_found_dismissed_matches";

function getMeaningfulLocationWords(locationText) {
    return String(locationText || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 2 && !MATCH_IGNORED_LOCATION_WORDS.has(word));
}

// Reads extra details saved inside the description, e.g. "Color: brown"
function readDescriptionDetail(report, detailName) {
    const detailPart = String(report.description || "")
        .split(" · ")
        .find((part) => part.startsWith(`${detailName}: `));
    return detailPart ? detailPart.slice(detailName.length + 2).trim().toLowerCase() : "";
}

function findPossibleMatches(report, allReports, maximumResults = 4) {
    const reportSpecies = String(report.species || "").toLowerCase();
    const reportLocationWords = new Set(getMeaningfulLocationWords(report.location));
    const reportColor = readDescriptionDetail(report, "Color");
    const reportSize = readDescriptionDetail(report, "Size");

    return allReports
        .filter(
            (candidate) =>
                candidate._id !== report._id &&
                candidate.reportType !== report.reportType &&
                candidate.reporterEmail !== report.reporterEmail &&
                candidate.status !== "reunited" &&
                candidate.status !== "rejected" &&
                String(candidate.species || "").toLowerCase() === reportSpecies
        )
        .filter((candidate) => {
            const lostReport = report.reportType === "lost" ? report : candidate;
            const foundReport = report.reportType === "lost" ? candidate : report;
            if (!lostReport.dateReported || !foundReport.dateReported) return true;
            return new Date(foundReport.dateReported) >= new Date(lostReport.dateReported);
        })
        .map((candidate) => {
            let matchScore = 0;

            if (getMeaningfulLocationWords(candidate.location).some((word) => reportLocationWords.has(word))) {
                matchScore += 2;
            }
            if (report.breed && candidate.breed && report.breed.trim().toLowerCase() === candidate.breed.trim().toLowerCase()) {
                matchScore += 1;
            }
            const candidateColor = readDescriptionDetail(candidate, "Color");
            if (reportColor && candidateColor && (reportColor.includes(candidateColor) || candidateColor.includes(reportColor))) {
                matchScore += 1;
            }
            const candidateSize = readDescriptionDetail(candidate, "Size");
            if (reportSize && candidateSize && reportSize === candidateSize) {
                matchScore += 1;
            }

            return { matchedReport: candidate, matchScore };
        })
        .sort((first, second) => second.matchScore - first.matchScore)
        .slice(0, maximumResults);
}

export default function LostFoundPage({ setPage }) {
    const [user, setUser] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState("");
    const [speciesFilter, setSpeciesFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
<<<<<<< HEAD
=======
    // Admin "Select" mode: pick several reports and delete them together
    const [isSelectingReports, setIsSelectingReports] = useState(false);
    // Fixed "now" for the "x days ago" labels (avoids calling Date.now() while rendering)
    const [pageOpenedAt] = useState(() => Date.now());
    const [selectedReportIds, setSelectedReportIds] = useState([]);
>>>>>>> 3eb14fb9d48a9e2e66f5eabff2a5dfebe0d6b0e5
    const [typeFilter, setTypeFilter] = useState("all");
    const [onlyMine, setOnlyMine] = useState(false);
    const [possibleMatches, setPossibleMatches] = useState(null);
    const [possibleMatchesTotal, setPossibleMatchesTotal] = useState(0);
    const [decidingMatchId, setDecidingMatchId] = useState("");
    const [showReportForm, setShowReportForm] = useState(false);
    const [mapSearch, setMapSearch] = useState(""); 
    const [mapResults, setMapResults] = useState([]);
    const [mapSearchOpen, setMapSearchOpen] = useState(false);
    const [mapSearching, setMapSearching] = useState(false);
    const [locating, setLocating] = useState(false);
    const [viewingReport, setViewingReport] = useState(null);
    const [claimOpen, setClaimOpen] = useState(false);
    const [claimText, setClaimText] = useState("");
    const [claimError, setClaimError] = useState("");
<<<<<<< HEAD
    const [dismissedMatchKeys, setDismissedMatchKeys] = useState(() => {
    try {
        return JSON.parse(localStorage.getItem(DISMISSED_MATCHES_STORAGE_KEY)) || [];
    } catch {
        return [];
    }
});

function dismissSuggestedMatch(reportId, matchedReportId) {
    const updatedDismissedKeys = [...dismissedMatchKeys, `${reportId}:${matchedReportId}`];
    setDismissedMatchKeys(updatedDismissedKeys);
    try {
        localStorage.setItem(DISMISSED_MATCHES_STORAGE_KEY, JSON.stringify(updatedDismissedKeys));
    } catch {
        // Storage blocked: the match stays hidden until the page reloads
    }
}
    const [photoName, setPhotoName] = useState("");
=======
    const [mySuggestions, setMySuggestions] = useState([]);
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoError, setPhotoError] = useState("");

    // The report being written: one object, saved on this device as a draft while typing
    const reportDraftKey = `rescuebase_lostfound_draft_${storedUserEmail()}`;
    const [reportForm, setReportForm] = useState(() => ({ ...EMPTY_REPORT, ...readFormDraft(reportDraftKey) }));
    const {
        reportType, petName, species, breed, description, location, dateReported, photoUrl, photoName,
        color, age, ageUnit, gender, size, contactNumber, notes, lat, lng,
    } = reportForm;
    const hasReportProgress = Object.keys(EMPTY_REPORT).some(
        (name) => name !== "reportType" && name !== "ageUnit" && reportForm[name] !== EMPTY_REPORT[name]
    );
    const { draftSavedAt: reportDraftSavedAt, clearDraft: clearReportDraft } =
        useFormDraft(reportDraftKey, reportForm, hasReportProgress);
    const [reportStep, setReportStep] = useState(0);
    const [reportStepDirection, setReportStepDirection] = useState("forward");
    const reportStepHeading = useRef(null);

    // value can be a function of the current value, like a useState setter
    function updateReport(name, value) {
        setReportForm((current) => ({
            ...current,
            [name]: typeof value === "function" ? value(current[name]) : value,
        }));
    }

    function goToReportStep(index) {
        setReportStepDirection(index > reportStep ? "forward" : "back");
        setReportStep(index);
    }

    // A new step: bring the card's top into view and move focus to the step's heading
    useEffect(() => {
        const heading = reportStepHeading.current;
        if (!heading) return;
        heading.focus({ preventScroll: true });
        heading.closest(".lfr2-card")?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, [reportStep]);

    function discardReportDraft() {
        setReportForm(EMPTY_REPORT);
        clearReportDraft();
        setPhotoError("");
        setMapSearch("");
        goToReportStep(0);
    }
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

<<<<<<< HEAD
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
=======
        // Steps 1–2: the browser has checked this step's fields; move on
        if (reportStep < REPORT_STEPS.length - 1) {
            goToReportStep(reportStep + 1);
            return;
        }
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe

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

            setReportForm(EMPTY_REPORT);
            clearReportDraft();
            setReportStep(0);
            setPhotoError("");
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
<<<<<<< HEAD

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
=======
        updateReport("photoUrl", await uploadLostFoundImage(file));
        updateReport("photoName", file.name);
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
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
            const userRole = String(user.role || "").toLowerCase();
            if (userRole === "admin" || userRole === "staff") {
                loadPossibleMatches();
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
<<<<<<< HEAD
=======
    ...(canManageReports ? [] : [{ value: "mine", label: "My reports", count: countMine, newCount: countNewClaims }]),
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
    ...(canManageReports
        ? [
<<<<<<< HEAD
              { value: "claims", label: "To review", count: countClaims },
              { value: "matches", label: "Possible matches", count: possibleMatchesTotal },
=======
              { value: "claims", label: "To review", count: countClaims, newCount: countNewClaims },
>>>>>>> 3eb14fb9d48a9e2e66f5eabff2a5dfebe0d6b0e5
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
<<<<<<< HEAD
=======
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
    return formatDate(date, { withYear: false });
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
        ? formatDate(report.dateReported)
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

>>>>>>> 3eb14fb9d48a9e2e66f5eabff2a5dfebe0d6b0e5
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
        if (place) updateReport("location", (current) => (current.trim() ? current : place));
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
    if (!location.trim()) updateReport("location", [place.name, place.area].filter(Boolean).join(", "));
}

function pickPoint(la, ln) {
    updateReport("lat", la.toFixed(6));
    updateReport("lng", ln.toFixed(6));
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
                            Fields marked <span className="required-mark">*</span> are required.
                        </p>
                    </div>
                </div>

                <FormTracker
                    steps={REPORT_STEPS.map((step, index) => ({ ...step, done: index < reportStep }))}
                    currentIndex={reportStep}
                    onSelect={goToReportStep}
                    canSelect={(index) => index < reportStep}
                    label="Report progress"
                />

                {error && <div className="lost-found-message error">{error}</div>}

                <div key={reportStep} className={`lfr2-step rb-drill-${reportStepDirection}`}>
                {reportStep === 0 && (
                <section className="lfr2-sec">
                    <h4 ref={reportStepHeading} tabIndex={-1}>What happened?</h4>
                    <p>
                        {isLost ? "When and where your pet was last seen." : "When and where you found the pet."} Tap the map to drop a pin. It shows on the GIS map.
                    </p>

                    <div className="lfr2-what">
                        <div className="lfr2-seg" role="radiogroup" aria-label="Report type">
                            <button type="button" role="radio" aria-checked={isLost} className={isLost ? "on" : ""} onClick={() => updateReport("reportType", "lost")}>
                                Lost pet
                            </button>
                            <button type="button" role="radio" aria-checked={!isLost} className={!isLost ? "on" : ""} onClick={() => updateReport("reportType", "found")}>
                                Found pet
                            </button>
                        </div>

                        <div className="lfr2-field">
                            <span>
                                {isLost ? "Date lost" : "Date found"} <span className="required-mark">*</span>
                            </span>
                            <DateField
                                value={dateReported}
                                onChange={(day) => updateReport("dateReported", day)}
                                minDate={earliestReportDay()}
                                maxDate={startOfToday()}
                                ariaLabel={isLost ? "Date lost" : "Date found"}
                                required
                                requiredMessage={`Pick the date the pet was ${isLost ? "lost" : "found"}.`}
                            />
                        </div>
                    </div>

                    <div className="lfr2-col">
                        <label className="lfr2-field">
                            <span>
                                {isLost ? "Last seen location" : "Location name"} <span className="required-mark">*</span>
                            </span>
                            <input
                                value={location}
                                onChange={(e) => updateReport("location", e.target.value)}
                                placeholder={isLost ? "e.g. Brgy. Lahug, Cebu City" : "e.g. Near Ayala Center, Cebu City"}
                                data-required-message={isLost ? "Enter where the pet was last seen." : "Enter where you found the pet."}
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
                                    placeholder="Search a place in Cebu…"
                                />
                                {mapSearchOpen && mapSearch.trim().length >= 3 && (
                                    <ul className="gm-map-results">
                                        {mapSearching && mapResults.length === 0 && <li className="is-note">Searching…</li>}
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
                                {locating ? "Getting your location…" : "Use my location"}
                            </button>
                            {lat && lng && (
                                <>
                                    {" · "}
                                    <button
                                        type="button"
                                        className="lfr2-link"
                                        onClick={() => {
                                            updateReport("lat", "");
                                            updateReport("lng", "");
                                        }}
                                    >
                                        Clear pin
                                    </button>
                                </>
                            )}
                        </small>
                    </div>
                </section>
                )}

                {reportStep === 1 && (
                <section className="lfr2-sec">
                    <h4 ref={reportStepHeading} tabIndex={-1}>The pet</h4>
                    <p>{isLost ? "What your pet looks like, so people can recognize it." : "What it looks like, so the owner can recognize it."}</p>

                    <div className="lfr2-grid">
                        <label className="lfr2-field">
                            <span>
                                Pet name {!isLost && <small>(if known)</small>}
                            </span>
                            <input value={petName} onChange={(e) => updateReport("petName", e.target.value)} placeholder={isLost ? "e.g. Brownie" : "Leave blank if unknown"} />
                        </label>

                        <label className="lfr2-field">
                            <span>
                                Species <span className="required-mark">*</span>
                            </span>
                            <select value={species} onChange={(e) => updateReport("species", e.target.value)} required>
                                <option value="">Select</option>
                                <option value="Dog">Dog</option>
                                <option value="Cat">Cat</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>

                        <label className="lfr2-field">
                            <span>Breed</span>
                            <input value={breed} onChange={(e) => updateReport("breed", e.target.value)} placeholder="e.g. Aspin" />
                        </label>

                        <label className="lfr2-field">
                            <span>Color</span>
<<<<<<< HEAD
                            <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Brown and white" />
=======
                            <select value={color} onChange={(e) => updateReport("color", e.target.value)}>
                                  <option value="">Select</option>
                                  {["Black", "White", "Brown", "Tan", "Gray", "Cream", "Golden", "Orange", "Red", "Mixed", "Other"].map((colourOption) => (
                                      <option key={colourOption} value={colourOption}>{colourOption}</option>
                                  ))}
                            </select>
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
                        </label>

                        {isLost && (
                            <>
                                <label className="lfr2-field">
                                    <span>Age</span>
                                    <div className="lfr2-age">
                                        <NumberInput min="0" max={ageUnit === "Months" ? 1200 : 100} value={age} onChange={(e) => updateReport("age", e.target.value)} placeholder="e.g. 2" />
                                        <select value={ageUnit} onChange={(e) => updateReport("ageUnit", e.target.value)} aria-label="Age unit">
                                            <option value="Years">Years</option>
                                            <option value="Months">Months</option>
                                        </select>
                                    </div>
                                </label>

                                <label className="lfr2-field">
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
<<<<<<< HEAD
=======
                        <label className="lfr2-field">
                            <span>Sex</span>
                            <select value={gender} onChange={(e) => updateReport("gender", e.target.value)}>
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Unknown">Unknown</option>
                            </select>
                        </label>
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe

                        <label className="lfr2-field">
                            <span>Size</span>
                            <select value={size} onChange={(e) => updateReport("size", e.target.value)}>
                                <option value="">Select</option>
                                <option value="Small">Small</option>
                                <option value="Medium">Medium</option>
                                <option value="Large">Large</option>
                            </select>
                        </label>

<<<<<<< HEAD
                        <label className="lfr2-field">
                            <span>
                                {isLost ? "Date lost" : "Date found"} <em>*</em>
                            </span>
                            <input type="date" value={dateReported} onChange={(e) => setDateReported(e.target.value)} required />
                        </label>

                        <div className={`lfr2-field ${isLost ? "lfr2-span-4" : "lfr2-span-2"}`}>
                            <span>Photo</span>
=======
                        <div className="lfr2-field lfr2-span-4">
                            <span>Photo {!isLost && <span className="required-mark">*</span>}</span>
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
                            <div className="lfr2-photo">
                                {photoUrl && <img src={photoUrl} alt="Pet preview" />}
                                <label htmlFor="lfr-photo-input" className={`lfr2-photo-btn${photoUploading ? " is-disabled" : ""}`}>
                                    {photoUploading ? "Uploading…" : photoUrl ? "Change photo" : "Choose photo"}
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
                                        className="lfr2-link is-danger"
                                        onClick={() => {
                                            updateReport("photoUrl", "");
                                            updateReport("photoName", "");
                                        }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            {!isLost && <RequiredValue value={photoUrl} message="Add a photo so the owner can recognize the pet." />}
                            {photoError && <small className="lfr2-error">{photoError}</small>}
                        </div>

                        <label className="lfr2-field lfr2-span-4">
                            <span>
                                Description <span className="required-mark">*</span>
                            </span>
                            <textarea
                                rows={2}
                                value={description}
                                onChange={(e) => updateReport("description", e.target.value)}
                                data-required-message="Describe the pet so people can recognize it."
                                placeholder={isLost ? "Markings, collar, behavior or other identifying details…" : "Markings, collar, condition, and where the pet is now…"}
                                required
                            />
                        </label>
                    </div>
                </section>
                )}

                {reportStep === 2 && (
                <section className="lfr2-sec">
                    <h4 ref={reportStepHeading} tabIndex={-1}>Contact</h4>
                    <p>How people can reach you about this {isLost ? "lost" : "found"} pet.</p>

                    <div className="lfr2-col lfr2-contact">
                        <label className="lfr2-field">
                            <span>
                                Phone number <span className="required-mark">*</span>
                            </span>
                            <PhoneInput
                                value={contactNumber}
                                onDigitsChange={(digits) => updateReport("contactNumber", digits)}
                                data-required-message="Enter a phone number people can call or text."
                                required
                            />
                        </label>

                        <label className="lfr2-field">
                            <span>Reported by</span>
                            <input className="is-readonly" value={user?.name || user?.username || ""} readOnly />
                        </label>

<<<<<<< HEAD
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
                                        maxLength={10}
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
=======
                        <label className="lfr2-field">
                            <span>Notes</span>
                            <textarea rows={3} value={notes} onChange={(e) => updateReport("notes", e.target.value)} placeholder="Optional" />
                        </label>
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
                    </div>
                </section>
                )}
                </div>

                <footer className="lfr2-foot">
                    {hasReportProgress && reportDraftSavedAt && (
                        <small className="form-draft-note">
                            <Icon name="check" /> Draft saved at {formatTime(reportDraftSavedAt)}
                            {" · "}
                            <button type="button" className="lfr2-link" onClick={discardReportDraft}>
                                Start over
                            </button>
                        </small>
                    )}
                    <div>
                        {reportStep === 0 ? (
                            <button type="button" className="lfr2-btn" onClick={() => setShowReportForm(false)}>
                                Cancel
                            </button>
                        ) : (
                            <button type="button" className="lfr2-btn" onClick={() => goToReportStep(reportStep - 1)}>
                                <Icon name="arrow-left" /> Back
                            </button>
                        )}
                        {reportStep < REPORT_STEPS.length - 1 ? (
                            <button type="submit" className="lfr2-btn is-primary" disabled={photoUploading}>
                                Next <Icon name="arrow-right" />
                            </button>
                        ) : (
                            <button type="submit" className="lfr2-btn is-primary" disabled={submitting || photoUploading}>
                                {submitting ? "Submitting…" : "Submit report"}
                            </button>
                        )}
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

            <section className="lf2-card">
                <div className="lf2-toolbar">
                    <input
                        type="search"
                        className="lf2-search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, breed or location…"
                    />
<<<<<<< HEAD
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
=======
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

                    {canBulkDelete && visibleReports.length > 0 && (
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
>>>>>>> 3eb14fb9d48a9e2e66f5eabff2a5dfebe0d6b0e5
                </div>

                {loading ? (
                    <LoadingState label="Loading reports…" />
                ) : visibleReports.length === 0 ? (
                    <p className="lf2-empty">
                        {reports.length === 0 ? "No lost or found reports yet." : "No reports match your filters."}
                    </p>
                ) : (
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
                )}

                {!loading && reports.length > 0 && (
                    <p className="lf2-foot">
                        Showing {visibleReports.length} of {reports.length}
                    </p>
                )}
            </section>

            {canManageReports && (
                <section className="lf2-card lfm-panel">
                    <h3>
                        Possible matches <span className="lfm-panel-count">{possibleMatchesTotal}</span>
                    </h3>
                    <div className="lfm-list">
                        <p className="lfm-intro">
                            Suggested by the system from species, breed, colour, size, sex, distance and dates. Check both reports before confirming.
                        </p>
                        {possibleMatches === null ? (
                            <LoadingState label="Loading possible matches…" />
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
                                                    {isDeciding ? "Saving…" : "Confirm match"}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>
<<<<<<< HEAD
                ) : loading ? (
                    <LoadingState label="Loading reports…" />
                ) : visibleReports.length === 0 ? (
                    <p className="lf2-empty">
                        {reports.length === 0 ? "No lost or found reports yet." : "No reports match your filters."}
                    </p>
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
                                    const isMine = report.reporterEmail === user?.email;
                                    const isOpen = report.status !== "reunited" && report.status !== "rejected";
                                    const canClaimThis =
                                        canClaimReport && !isMine && isOpen &&
                                        report.claimStatus !== "pending" && report.claimStatus !== "approved";
                                    const s = String(report.species || "").toLowerCase();
                                    const emoji = s === "cat" ? "🐱" : s === "dog" ? "🐶" : "🐾";
                                    const openDetails = (withClaim = false) => {
                                        setViewingReport(report);
                                        setClaimOpen(withClaim);
                                        setClaimText("");
                                        setClaimError("");
                                    };

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

                                    return (
                                        <tr key={report._id} onClick={() => openDetails(false)}>
                                            <td>
                                                <div className="lf2-pet">
                                                    {report.photoUrl ? (
                                                        <img src={report.photoUrl} alt="" />
                                                    ) : (
                                                        <span className="lf2-thumb" aria-hidden="true">{emoji}</span>
                                                    )}
                                                    <div>
                                                        <b>{report.petName || "Unknown"}</b>
                                                        <small>
                                                            {[report.species, report.breed].filter(Boolean).join(" · ")}
                                                            {isMine ? " · Your report" : ""}
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
                                                <span className={`lf2-pill is-${statusKey}`}>{statusLabel}</span>
                                            </td>
                                            <td className="lf2-date">
                                                {report.dateReported
                                                    ? new Date(report.dateReported).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })
                                                    : "—"}
                                            </td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="lf2-row-actions">
                                                    {canClaimThis && report.reportType === "found" && (
                                                        <button type="button" className="lf2-mini is-dark" onClick={() => openDetails(true)}>
                                                            This is my pet
                                                        </button>
                                                    )}

                                                    {!isMine && isOpen && report.reportType === "lost" && !canManageReports && (
                                                        <a
                                                            className="lf2-mini"
                                                            href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(report.reporterEmail)}&su=${encodeURIComponent(
                                                                `I've seen ${report.petName || "your pet"} (RescueBase)`
                                                            )}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            I've seen this pet
                                                        </a>
                                                    )}

                                                    {canManageReports && report.claimStatus === "pending" && (
                                                        <button type="button" className="lf2-mini is-dark" onClick={() => openDetails(false)}>
                                                            Review claim
                                                        </button>
                                                    )}

                                                    {canManageReports && report.claimStatus === "approved" && report.status !== "reunited" && (
                                                        <button type="button" className="lf2-mini is-dark" onClick={() => handleMarkReunited(report._id)}>
                                                            Mark reunited
                                                        </button>
                                                    )}

                                                    <button type="button" className="lf2-link" onClick={() => openDetails(false)}>
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
                                            </td>
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
=======
                </section>
            )}
>>>>>>> 3eb14fb9d48a9e2e66f5eabff2a5dfebe0d6b0e5
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
    const canSeeSuggestions = (isMine || canManageReports) && r.status !== "reunited";
const suggestedMatches = canSeeSuggestions
    ? findPossibleMatches(r, reports).filter(
        ({ matchedReport }) => !dismissedMatchKeys.includes(`${r._id}:${matchedReport._id}`)
    )
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
<<<<<<< HEAD
=======
                <button
                    type="button"
                    className="lf-modal-close"
                    onClick={() => setViewingReport(null)}
                    aria-label="Close"
                >
                    <Icon name="close" />
                </button>
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe

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
                {suggestedMatches.map(({ matchedReport, matchScore }) => (
                    <div className="lf-match" key={matchedReport._id}>
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

                            {matchScore >= 3 && <span className="lf-match-tag">Strong match</span>}
                        </button>

                        {isMine && (
                            <button
                                type="button"
                                className="lf-match-dismiss"
                                onClick={() => dismissSuggestedMatch(r._id, matchedReport._id)}
                            >
                                {r.reportType === "lost" ? "Not my pet" : "Not a match"}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}

        <small className="lf-match-note">
            Suggested by species, dates, location, breed, color and size. Always verify before claiming.
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
<<<<<<< HEAD
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
=======
        )
    )}
    {claimOpen && (canClaimThis || canSayFoundForThis) && (
    <form
        id="lf-claim-form"
        className="lf-claim"
        onSubmit={async (event) => {
            event.preventDefault();
            const done = await handleClaim(r._id);
            if (done) setViewingReport(null);
        }}
    >
        <h3>{claimMode === "found" ? "I found this pet" : "Submit an ownership claim"}</h3>
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
        <p>
            Tell the shelter how they can confirm this is your pet. Staff will
            review your claim before the pet is released.
        </p>
<<<<<<< HEAD
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
=======

        {claimMode === "found" && (
            <>
                <label className="lfr2-field">
                    <span>Where did you find it? <span className="required-mark">*</span></span>
                    <input
                        value={foundLocation}
                        maxLength={200}
                        onChange={(e) => {
                            setFoundLocation(e.target.value);
                            setClaimError("");
                        }}
                        placeholder="e.g. Near Ayala Center, Cebu City"
                        data-required-message="Enter where you found the pet."
                        required
                    />
                </label>
                <div className="lfr2-field">
                    <span>Date found <span className="required-mark">*</span></span>
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
                        required
                        requiredMessage="Pick the date you found the pet."
                    />
                </div>
            </>
        )}

        <label className="lfr2-field">
            <span>{claimMode === "found" ? "Describe the pet and how you found it" : "Proof of ownership"} <span className="required-mark">*</span></span>
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
                        ? "Collar, markings, how it behaves, where it is now…"
                        : "Marks or scars, collar, the name it answers to, when and where it was lost…"
                }
                minLength={20}
                data-required-message={claimMode === "found" ? "Describe the pet and how you found it." : "Describe your proof of ownership."}
                required
            />
            <small>At least 20 characters ({claimText.trim().length} so far)</small>
        </label>

        <label className="lfr2-field">
            <span>Mobile number <span className="required-mark">*</span></span>
            <PhoneInput
                value={claimContactNumber}
                onDigitsChange={(digits) => {
                    setClaimContactNumber(digits);
                    setClaimError("");
                }}
                data-required-message="Enter a mobile number the other person can reach."
                required
            />
        </label>

        <div className="lfr2-field">
            <span>
                {claimMode === "found" ? (
                    <>Photo of the pet <span className="required-mark">*</span></>
                ) : (
                    <>Proof photo <small>(optional: you with the pet, or its vet card)</small></>
                )}
            </span>
            <div className="lfr2-photo">
                {claimProofPhotoUrl && <img src={claimProofPhotoUrl} alt="Photo preview" />}
                <label htmlFor="lf-claim-proof-input" className={`lfr2-photo-btn${claimProofUploading ? " is-disabled" : ""}`}>
                    {claimProofUploading ? "Uploading…" : claimProofPhotoUrl ? "Change photo" : "Choose photo"}
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
            {claimMode === "found" && (
                <RequiredValue value={claimProofPhotoUrl} message="Add a photo so the owner can recognize their pet." />
            )}
        </div>

>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
        {claimError && <small className="lf-claim-error">{claimError}</small>}
    </form>
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
<<<<<<< HEAD
            Submit Claim
=======
            {canSayFoundForThis ? "I found this pet" : "This is my pet"}
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
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
<<<<<<< HEAD
            Mark Reunited
        </button>
    )}
=======
            {r.myClaimType === "found" ? "Withdraw" : "Cancel my claim"}
        </button>
    )}
    {claimOpen && (canClaimThis || canSayFoundForThis) && (
        <button
            type="submit"
            form="lf-claim-form"
            className="lfr-submit"
            disabled={claimProofUploading}
        >
            {claimMode === "found" ? "Send to owner" : "Submit claim"}
        </button>
    )}

>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
</footer>
                </div>
            </div>
        </div>
    );
})()}
        </main>
    );
}