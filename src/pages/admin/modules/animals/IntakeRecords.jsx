import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isAdmin } from "../../../../utils/auth";

const CEBU_CENTER = [10.3157, 123.8854];

const AO_PIN = L.divIcon({
    className: "ao-pin",
    html: "<span></span>",
    iconSize: [26, 34],
    iconAnchor: [13, 34],
});

// Coordinates -> "Street, Barangay, City" (OpenStreetMap)
async function lookupAddress(lat, lng) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`
        );
        const data = await res.json();
        const a = data.address || {};
        return [
            a.road || a.pedestrian || a.neighbourhood || data.name,
            a.suburb || a.village || a.quarter || a.hamlet,
            a.city || a.town || a.municipality,
        ]
            .filter(Boolean)
            .filter((part, i, list) => list.indexOf(part) === i)
            .join(", ");
    } catch {
        return "";
    }
}

// Tap the map to move the pin
function PinPicker({ onPick }) {
    useMapEvents({
        click(event) {
            onPick(event.latlng.lat, event.latlng.lng);
        },
    });
    return null;
}

// Saved from a phone? (small screen or a mobile browser)
function isPhoneDevice() {
    const small = typeof window !== "undefined" && window.matchMedia?.("(max-width: 820px)").matches;
    const mobileAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
    return Boolean(small || mobileAgent);
}

function todayISO() {
    const now = new Date();
    return new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function currentUserName() {
    try {
        const user = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");
        return user.name || user.username || "";
    } catch {
        return "";
    }
}


// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

// ---------- Shared UI pieces (stats strip, tabs, search bar, chips) ----------

const ICONS = {
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
        </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    pin: (
        <>
            <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
            <circle cx="12" cy="10" r="2.5" />
        </>
    ),
    paw: (
        <>
            <circle cx="11" cy="4" r="2" />
            <circle cx="18" cy="8" r="2" />
            <circle cx="4" cy="8" r="2" />
            <path d="M8 14c0-2 2-4 4-4s4 2 4 4-1 6-4 6-4-4-4-6z" />
        </>
    ),
    phone: (
        <>
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="M11 18h2" />
        </>
    ),
    swap: <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />,
    home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    camera: (
        <>
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
        </>
    ),
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

function Icon({ name, size = 15 }) {
    return (
        <svg
            className="ao-icon"
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
            {ICONS[name]}
        </svg>
    );
}

function StatsStrip({ highlight, items }) {
    return (
        <div className="ao-strip">
            <div className="ao-strip-cta">
                <div>
                    <b>{highlight.value}</b>
                    <small>{highlight.label}</small>
                </div>
                {highlight.actionLabel && (
                    <button type="button" onClick={highlight.onAction}>
                        {highlight.actionLabel} →
                    </button>
                )}
            </div>

            {items.map((item) => (
                <div className="ao-strip-item" key={item.label}>
                    <div className="ao-strip-label">
                        {item.label}
                    </div>
                    <div className="ao-strip-value">
                        {item.value}
                        {item.note && <em>{item.note}</em>}
                    </div>
                </div>
            ))}
        </div>
    );
}

function Tabs({ tabs, value, onChange }) {
    return (
        <div className="ao-tabs" role="tablist">
            {tabs.map((tab) => (
                <button
                    type="button"
                    key={tab.value}
                    role="tab"
                    aria-selected={value === tab.value}
                    className={value === tab.value ? "active" : ""}
                    onClick={() => onChange(tab.value)}
                >
                    {tab.label}
                    {tab.count > 0 && <i>{tab.count}</i>}
                </button>
            ))}
        </div>
    );
}

function SearchToolbar({
    searchBy,
    onSearchByChange,
    searchByOptions,
    search,
    onSearchChange,
    placeholder,
    filters = [],
    shown,
    total,
    noun,
    onClear,
}) {
    const hasActive =
        search.trim() !== "" ||
        searchBy !== searchByOptions[0].value ||
        filters.some((f) => f.value !== f.options[0].value);

    return (
        <>
            <div className="ao-toolbar">
                <div className="ao-searchbox">
                    <select
                        value={searchBy}
                        onChange={(e) => onSearchByChange(e.target.value)}
                        aria-label="Search by"
                    >
                        {searchByOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <label className="ao-searchbox-input">
                        <Icon name="search" />
                        <input
                            type="search"
                            value={search}
                            placeholder={placeholder}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </label>
                </div>

                {filters.map((filter) => (
                    <select
                        key={filter.label}
                        className="ao-dropdown"
                        value={filter.value}
                        aria-label={filter.label}
                        onChange={(e) => filter.onChange(e.target.value)}
                    >
                        {filter.options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                ))}
            </div>

            <p className="ao-results">
                Showing {shown} of {total} {noun}
                {hasActive && (
                    <button type="button" onClick={onClear}>
                        Clear filters
                    </button>
                )}
            </p>
        </>
    );
}

function ChipGroup({ options, value, onChange, tone = "orange" }) {
    return (
        <div className="ao-chips">
            {options.map((option) => (
                <button
                    type="button"
                    key={option.value}
                    className={`ao-chip ${value === option.value ? `on ${tone}` : ""}`}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

// Case-insensitive match of `term` against selected fields of a record.
function matchesSearch(record, term, searchBy, fieldMap) {
    const needle = term.trim().toLowerCase();
    if (!needle) return true;

    const keys = searchBy === "all" ? Object.keys(fieldMap) : [searchBy];

    return keys.some((key) =>
        String(fieldMap[key](record) || "")
            .toLowerCase()
            .includes(needle)
    );
}

function conditionTone(condition) {
    switch (condition) {
        case "Healthy":
            return "green";
        case "Injured":
        case "Sick":
            return "red";
        case "Under Observation":
            return "blue";
        default:
            return "";
    }
}

function speciesEmoji(type) {
    if (type === "Cat") return "🐱";
    if (type === "Dog") return "🐶";
    return "🐾";
}

function isSameMonth(date, now = new Date()) {
    if (!date) return false;
    const d = new Date(date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api/animals`;
const UPLOAD_URL = `${import.meta.env.VITE_BACKEND_URL}/api/uploads/image`;

const initialForm = {
    animalName: "",
    animalType: "Dog",
    intakeType: "Rescued",
    rescueLocation: "",
    intakeDate: "",
    rescuedBy: "",
    condition: "Healthy",
    notes: "",
    latitude: "",
    longitude: "",
    image: "",
};

// New form: today's date and the signed-in person filled in
function freshForm() {
    return { ...initialForm, intakeDate: todayISO(), rescuedBy: currentUserName() };
}

const SPECIES_OPTIONS = [
    { value: "Dog", label: "Dog" },
    { value: "Cat", label: "Cat" },
    { value: "Other", label: "Other" },
];

const INTAKE_TYPE_OPTIONS = [
    { value: "Rescued", label: "Rescued" },
    { value: "Owner Surrender", label: "Surrendered" },
    { value: "Stray", label: "Stray" },
    { value: "Transferred", label: "Transferred" },
];

const CONDITION_OPTIONS = [
    { value: "Healthy", label: "Healthy" },
    { value: "Injured", label: "Injured" },
    { value: "Sick", label: "Sick" },
    { value: "Under Observation", label: "Under Observation" },
    { value: "Unknown", label: "Unknown" },
];

const SEARCH_FIELDS = {
    name: (r) => r.name,
    location: (r) => r.location,
    rescuedBy: (r) => r.rescuedBy,
    addedBy: (r) => r.createdByName,
};

const SEARCH_BY_OPTIONS = [
    { value: "all", label: "All fields" },
    { value: "name", label: "Animal name" },
    { value: "location", label: "Location" },
    { value: "rescuedBy", label: "Rescued by" },
    { value: "addedBy", label: "Added by" },
];

const DEFAULT_FILTERS = {
    searchBy: "all",
    search: "",
    intakeType: "All",
    condition: "All",
    sort: "newest",
    source: "All",
};

function getHeaders(includeJson = false) {
    const token = localStorage.getItem("token");
    const headers = {};

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (includeJson) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

async function parseResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
        throw new Error(
            data.message || "You do not have permission to perform this action."
        );
    }

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong with the request.");
    }

    return data;
}

function formatDate(date) {
    if (!date) {
        return "Unknown date";
    }

    return new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// The database stores "pending_review"; older records may have no status.
function getStatus(record) {
    const status = record.intakeStatus || "pending_review";
    return status === "pending_review" ? "pending" : status;
}

function getCurrentUserRole() {
    try {
        const user = JSON.parse(localStorage.getItem("rescuebase_user"));
        return user?.role?.toLowerCase() || "";
    } catch {
        return "";
    }
}

export default function IntakeRecords() {
    const [records, setRecords] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(freshForm);
    const [photo, setPhoto] = useState(null);
    const [locating, setLocating] = useState(false);
    const [accuracy, setAccuracy] = useState(null);
    const [openId, setOpenId] = useState(null);

    const [tab, setTab] = useState("pending");
    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [actionId, setActionId] = useState(null);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const formRef = useRef(null);
    const listRef = useRef(null);

    const canManage = ["admin", "staff"].includes(getCurrentUserRole());

    // --------------------------------------------------
    // LOAD INTAKE RECORDS (pending + approved + rejected)
    // --------------------------------------------------

    async function fetchList(url, key) {
        const response = await fetch(url, { method: "GET", headers: getHeaders() });
        const data = await parseResponse(response);
        return data[key] || [];
    }

    async function loadIntakes() {
        setLoading(true);
        setError("");

        const results = await Promise.allSettled([
            fetchList(`${API_BASE_URL}/intakes`, "intakes"),
            fetchList(`${API_BASE_URL}?intakeStatus=approved`, "animals"),
            fetchList(`${API_BASE_URL}?intakeStatus=rejected`, "animals"),
        ]);

        const merged = [];
        const seen = new Set();

        results.forEach((result) => {
            if (result.status !== "fulfilled") return;

            result.value.forEach((record) => {
                if (!seen.has(record._id)) {
                    seen.add(record._id);
                    merged.push(record);
                }
            });
        });

        if (results.every((result) => result.status === "rejected")) {
            setError(results[0].reason?.message || "Failed to load intake records.");
        }

        setRecords(merged);
        setLoading(false);
    }

    useEffect(() => {
        loadIntakes();
    }, []);

    // --------------------------------------------------
    // FORM
    // --------------------------------------------------

    function updateForm(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function resetForm() {
        setForm(freshForm());
        setEditingId(null);
        setPhoto(null);
        setAccuracy(null);
    }

    // Photo preview (freed when the photo changes)
    const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : ""), [photo]);
    useEffect(() => () => {
        if (photoPreview) URL.revokeObjectURL(photoPreview);
    }, [photoPreview]);

    async function uploadPhoto() {
        const formData = new FormData();
        formData.append("image", photo);
        formData.append("folder", "rescuebase/intakes");
        const response = await fetch(UPLOAD_URL, {
            method: "POST",
            headers: getHeaders(),
            body: formData,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.imageUrl) {
            throw new Error(data.message || "Failed to upload the photo.");
        }
        return data.imageUrl;
    }

    // ---------- Location ----------
    async function setPin(lat, lng) {
        setForm((current) => ({
            ...current,
            latitude: Number(lat).toFixed(6),
            longitude: Number(lng).toFixed(6),
        }));
        const place = await lookupAddress(lat, lng);
        if (place) setForm((current) => ({ ...current, rescueLocation: place }));
    }

    function locateMe() {
        if (!navigator.geolocation) {
            setError("This browser can't share its location. Tap the map instead.");
            return;
        }
        setError("");
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                setAccuracy(Math.round(position.coords.accuracy || 0));
                await setPin(position.coords.latitude, position.coords.longitude);
                setLocating(false);
            },
            () => {
                setError("Couldn't get your location. Allow location access, or tap the map.");
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }

    function pickOnMap(lat, lng) {
        setAccuracy(null);
        setPin(lat, lng);
    }

    function clearPin() {
        setAccuracy(null);
        setForm((current) => ({ ...current, latitude: "", longitude: "" }));
    }

    function handleEditRecord(record) {
        setEditingId(record._id);

        setForm({
            animalName: record.name || "",
            animalType: record.type || "Dog",
            intakeType: record.intakeType || "Rescued",
            rescueLocation: record.location || "",
            intakeDate: record.intakeDate ? String(record.intakeDate).slice(0, 10) : "",
            rescuedBy: record.rescuedBy || "",
            condition: record.intakeCondition || "Healthy",
            notes: record.description || "",
            latitude: record.latitude != null ? String(record.latitude) : "",
            longitude: record.longitude != null ? String(record.longitude) : "",
            image: record.image || "",
        });
        setPhoto(null);
        setAccuracy(null);

        setError("");
        setSuccessMessage("");
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!canManage) {
            setError("Only administrators and staff can manage intake records.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            setSuccessMessage("");

            const imageUrl = photo ? await uploadPhoto() : form.image;

            const payload = {
                name: form.animalName.trim(),
                type: form.animalType,
                intakeType: form.intakeType,
                location: form.rescueLocation.trim(),
                intakeDate: form.intakeDate || undefined,
                rescuedBy: form.rescuedBy.trim(),
                intakeCondition: form.condition,
                description: form.notes.trim(),
                latitude: form.latitude ? Number(form.latitude) : null,
                longitude: form.longitude ? Number(form.longitude) : null,
                image: imageUrl || "",
            };

            // Tag new intakes saved from a phone (the source never changes on edit)
            if (!editingId) {
                payload.intakeSource = isPhoneDevice() ? "field" : "desk";
            }

            const endpoint = editingId ? `${API_BASE_URL}/${editingId}` : API_BASE_URL;
            const method = editingId ? "PATCH" : "POST";

            const response = await fetch(endpoint, {
                method,
                headers: getHeaders(true),
                body: JSON.stringify(payload),
            });

            await parseResponse(response);

            setSuccessMessage(
                editingId
                    ? "Intake record updated successfully."
                    : "Intake saved. The animal now has a profile in Animal Profiles."
            );

            resetForm();
            await loadIntakes();
        } catch (err) {
            setError(err.message || "Failed to save intake record.");
        } finally {
            setSubmitting(false);
        }
    }

    // --------------------------------------------------
    // REVIEW ACTIONS
    // --------------------------------------------------

    async function handleApprove(id) {
        if (!canManage) {
            setError("Only administrators and staff can approve intake records.");
            return;
        }

        if (!await askConfirm({ title: "Approve this intake?", confirmLabel: "Approve" })) {
            return;
        }

        try {
            setActionId(id);
            setError("");
            setSuccessMessage("");

            const response = await fetch(`${API_BASE_URL}/${id}/approve-intake`, {
                method: "PATCH",
                headers: getHeaders(true),
            });

            await parseResponse(response);
            setSuccessMessage("Intake approved successfully.");
            await loadIntakes();
        } catch (err) {
            setError(err.message || "Failed to approve intake.");
        } finally {
            setActionId(null);
        }
    }

    async function handleReject(id) {
        if (!canManage) {
            setError("Only administrators and staff can reject intake records.");
            return;
        }

        const reason = window.prompt("Enter the reason for rejecting this intake:");

        if (reason === null) {
            return;
        }

        const trimmedReason = reason.trim();

        if (!trimmedReason) {
            setError("A rejection reason is required.");
            return;
        }

        try {
            setActionId(id);
            setError("");
            setSuccessMessage("");

            const response = await fetch(`${API_BASE_URL}/${id}/reject-intake`, {
                method: "PATCH",
                headers: getHeaders(true),
                body: JSON.stringify({ reason: trimmedReason }),
            });

            await parseResponse(response);
            setSuccessMessage("Intake rejected successfully.");
            await loadIntakes();
        } catch (err) {
            setError(err.message || "Failed to reject intake.");
        } finally {
            setActionId(null);
        }
    }

    async function handleDeleteRecord(id) {
        if (!isAdmin()) {
            setError("Only administrators can delete intake records.");
            return;
        }

        if (!await askConfirm({ title: "Delete this intake record?", message: "This can't be undone.", confirmLabel: "Delete", danger: true })) {
            return;
        }

        try {
            setActionId(id);
            setError("");
            setSuccessMessage("");

            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: "DELETE",
                headers: getHeaders(),
            });

            await parseResponse(response);
            setSuccessMessage("Intake record deleted successfully.");

            if (editingId === id) {
                resetForm();
            }

            await loadIntakes();
        } catch (err) {
            setError(err.message || "Failed to delete intake record.");
        } finally {
            setActionId(null);
        }
    }

    // --------------------------------------------------
    // STATS, TABS, FILTERING
    // --------------------------------------------------

    const counts = useMemo(() => {
        const result = { pending: 0, approved: 0, rejected: 0 };
        records.forEach((record) => {
            result[getStatus(record)] = (result[getStatus(record)] || 0) + 1;
        });
        return result;
    }, [records]);

    const stats = useMemo(
        () => ({
            thisMonth: records.filter((r) => isSameMonth(r.intakeDate || r.createdAt)).length,
            fromPhone: records.filter((r) => r.intakeSource === "field").length,
            topArea: (() => {
                const tally = {};
                records.forEach((r) => {
                    const area = String(r.location || "").split(",")[0].trim();
                    if (area) tally[area] = (tally[area] || 0) + 1;
                });
                const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
                return top ? top[0] : "—";
            })(),
        }),
        [records]
    );

    const tabRecords = useMemo(
        () => (tab === "all" ? records : records.filter((r) => getStatus(r) === tab)),
        [records, tab]
    );

    const filteredRecords = useMemo(() => {
        const list = tabRecords.filter(
            (record) =>
                matchesSearch(record, filters.search, filters.searchBy, SEARCH_FIELDS) &&
                (filters.intakeType === "All" || record.intakeType === filters.intakeType) &&
                (filters.condition === "All" ||
                    (record.intakeCondition || "Unknown") === filters.condition) &&
                (filters.source === "All" ||
                    (filters.source === "field" ? record.intakeSource === "field" : record.intakeSource !== "field"))
        );

        const dateOf = (r) => new Date(r.intakeDate || r.createdAt || 0).getTime();

        return [...list].sort((a, b) => {
            if (filters.sort === "oldest") return dateOf(a) - dateOf(b);
            if (filters.sort === "name") return String(a.name).localeCompare(String(b.name));
            return dateOf(b) - dateOf(a);
        });
    }, [tabRecords, filters]);

    function setFilter(key, value) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    const tabs = [
        { value: "pending", label: "Waiting", count: counts.pending },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "all", label: "All" },
    ];

    const statusTag = {
        pending: { label: "Pending", tone: "orange" },
        approved: { label: "Approved", tone: "green" },
        rejected: { label: "Rejected", tone: "red" },
    };

    return (
        <section className="ao-page">
            {error && <div className="ao-alert error">{error}</div>}
            {successMessage && <div className="ao-alert success">{successMessage}</div>}

            <StatsStrip
                highlight={{
                    value: counts.pending,
                    label:
                        counts.pending === 1
                            ? "Intake waiting for your review"
                            : "Intakes waiting for your review",
                }}
                items={[
                    { icon: "paw", label: "Intakes this month", value: stats.thisMonth },
                    { icon: "phone", label: "From the field (phone)", value: stats.fromPhone },
                    { icon: "pin", label: "Top area", value: stats.topArea },
                ]}
            />

            <div className="ao-layout">
                {/* ---------- FORM ---------- */}
                <section className="ao-card ao-form-card" ref={formRef}>
                    <h2>{editingId ? "Edit Intake" : "Log New Intake"}</h2>
                    <p className="ao-hint">
                        {editingId
                            ? "Update the arrival details, then save."
                            : "Works the same on a phone or a computer. Photo and map pin are optional."}
                    </p>

                    <form className="ao-form" onSubmit={handleSubmit}>
                        <label className="ao-photo-pick">
                            <span className="ao-photo-thumb">
                                {photoPreview || form.image ? (
                                    <img src={photoPreview || form.image} alt="" />
                                ) : (
                                    <Icon name="camera" size={20} />
                                )}
                            </span>
                            <span>
                                <b>{photoPreview || form.image ? "Change photo" : "Add photo"}</b>
                                <small>Optional · opens the camera on a phone</small>
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                hidden
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (file) setPhoto(file);
                                }}
                            />
                        </label>

                        <label className="ao-field">
                            <span>Name or Nickname <span className="ao-req">*</span></span>
                            <input
                                value={form.animalName}
                                onChange={(e) => updateForm("animalName", e.target.value)}
                                placeholder="e.g. Brownie"
                                required
                            />
                        </label>

                        <div className="ao-field">
                            <span>Species <span className="ao-req">*</span></span>
                            <ChipGroup
                                options={SPECIES_OPTIONS}
                                value={form.animalType}
                                onChange={(value) => updateForm("animalType", value)}
                            />
                        </div>

                        <div className="ao-field">
                            <span>How did they arrive? <span className="ao-req">*</span></span>
                            <ChipGroup
                                options={INTAKE_TYPE_OPTIONS}
                                value={form.intakeType}
                                onChange={(value) => updateForm("intakeType", value)}
                            />
                        </div>

                        <div className="ao-row2">
                            <label className="ao-field">
                                <span>Date <span className="ao-req">*</span></span>
                                <input
                                    type="date"
                                    value={form.intakeDate}
                                    onChange={(e) => updateForm("intakeDate", e.target.value)}
                                    required
                                />
                            </label>

                            <label className="ao-field">
                                <span>Rescued By <span className="ao-req">*</span></span>
                                <input
                                    value={form.rescuedBy}
                                    onChange={(e) => updateForm("rescuedBy", e.target.value)}
                                    placeholder="Name"
                                    required
                                />
                            </label>
                        </div>

                        <div className="ao-field">
                            <span>Where? <span className="ao-req">*</span></span>
                            <div className="ao-where">
                                <input
                                    value={form.rescueLocation}
                                    onChange={(e) => updateForm("rescueLocation", e.target.value)}
                                    placeholder="e.g. Brgy. Guadalupe, Cebu City"
                                    required
                                />
                                <button type="button" className="ao-btn" onClick={locateMe} disabled={locating}>
                                    <Icon name="pin" />
                                    {locating ? "Locating..." : "Locate"}
                                </button>
                            </div>
                            <div className="ao-pickmap">
                                <MapContainer
                                    key={form.latitude ? "pinned" : "empty"}
                                    center={form.latitude ? [Number(form.latitude), Number(form.longitude)] : CEBU_CENTER}
                                    zoom={form.latitude ? 17 : 12}
                                    scrollWheelZoom={false}
                                    className="ao-pickmap-map"
                                >
                                    <TileLayer
                                        attribution="&copy; OpenStreetMap"
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <PinPicker onPick={pickOnMap} />
                                    {form.latitude && (
                                        <Marker
                                            position={[Number(form.latitude), Number(form.longitude)]}
                                            icon={AO_PIN}
                                            draggable
                                            eventHandlers={{
                                                dragend: (event) => {
                                                    const point = event.target.getLatLng();
                                                    pickOnMap(point.lat, point.lng);
                                                },
                                            }}
                                        />
                                    )}
                                </MapContainer>
                                <div className="ao-pickmap-note">
                                    {form.latitude ? (
                                        <>
                                            <span>
                                                {accuracy && accuracy > 50
                                                    ? `Approximate (±${accuracy >= 1000 ? `${(accuracy / 1000).toFixed(1)} km` : `${accuracy} m`}). Tap the exact spot.`
                                                    : "Pin saved. Tap or drag to adjust."}
                                            </span>
                                            <button type="button" onClick={clearPin}>Remove pin</button>
                                        </>
                                    ) : (
                                        <span>Optional: tap the map to pin the spot.</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="ao-field">
                            <span>Condition <span className="ao-req">*</span></span>
                            <ChipGroup
                                options={CONDITION_OPTIONS}
                                value={form.condition}
                                tone="green"
                                onChange={(value) => updateForm("condition", value)}
                            />
                        </div>

                        <label className="ao-field">
                            <span>Notes <span className="ao-req">*</span></span>
                            <textarea
                                value={form.notes}
                                onChange={(e) => updateForm("notes", e.target.value)}
                                placeholder="Anything staff should know..."
                                required
                            />
                        </label>

                        <div className="ao-form-actions">
                            <button type="submit" className="ao-btn primary" disabled={submitting}>
                                {submitting
                                    ? "Saving..."
                                    : editingId
                                      ? "Update Intake"
                                      : "Save Intake"}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    className="ao-btn"
                                    onClick={resetForm}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                {/* ---------- LIST ---------- */}
                <section className="ao-card" ref={listRef}>
                    <div className="ao-list-head">
                        <Tabs tabs={tabs} value={tab} onChange={setTab} />
                    </div>

                    <SearchToolbar
                        searchBy={filters.searchBy}
                        onSearchByChange={(value) => setFilter("searchBy", value)}
                        searchByOptions={SEARCH_BY_OPTIONS}
                        search={filters.search}
                        onSearchChange={(value) => setFilter("search", value)}
                        placeholder="Search name, location, or person..."
                        filters={[
                            {
                                label: "Arrival type",
                                value: filters.intakeType,
                                onChange: (value) => setFilter("intakeType", value),
                                options: [
                                    { value: "All", label: "All arrival types" },
                                    ...INTAKE_TYPE_OPTIONS.map((o) => ({
                                        value: o.value,
                                        label: o.value,
                                    })),
                                ],
                            },
                            {
                                label: "Condition",
                                value: filters.condition,
                                onChange: (value) => setFilter("condition", value),
                                options: [
                                    { value: "All", label: "Any condition" },
                                    ...CONDITION_OPTIONS,
                                ],
                            },
                            {
                                label: "Source",
                                value: filters.source,
                                onChange: (value) => setFilter("source", value),
                                options: [
                                    { value: "All", label: "All sources" },
                                    { value: "field", label: "Phone" },
                                    { value: "desk", label: "Computer" },
                                ],
                            },
                            {
                                label: "Sort",
                                value: filters.sort,
                                onChange: (value) => setFilter("sort", value),
                                options: [
                                    { value: "newest", label: "Newest first" },
                                    { value: "oldest", label: "Oldest first" },
                                    { value: "name", label: "Name A–Z" },
                                ],
                            },
                        ]}
                        shown={filteredRecords.length}
                        total={tabRecords.length}
                        noun="intakes"
                        onClear={() => setFilters(DEFAULT_FILTERS)}
                    />

                    {loading ? (
                        <p className="ao-empty">Loading intake records...</p>
                    ) : filteredRecords.length === 0 ? (
                        <p className="ao-empty">
                            {tab === "pending" && tabRecords.length === 0
                                ? "All caught up. No intakes are waiting for review."
                                : "No intake records match your search."}
                        </p>
                    ) : (
                        <div className="ao-list">
                            {filteredRecords.map((record) => {
                                const status = getStatus(record);
                                const isProcessing = actionId === record._id;

                                return (
                                    <article
                                        key={record._id}
                                        className={`ao-item is-clickable ${status === "pending" ? "flag" : ""} ${openId === record._id ? "is-open" : ""}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={openId === record._id}
                                        onClick={() => setOpenId((current) => (current === record._id ? null : record._id))}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") setOpenId((current) => (current === record._id ? null : record._id));
                                        }}
                                    >
                                        <div className="ao-avatar">
                                            {record.image ? (
                                                <img src={record.image} alt="" />
                                            ) : (
                                                speciesEmoji(record.type)
                                            )}
                                        </div>

                                        <div>
                                            <h3>{record.name}</h3>
                                            <div className="ao-meta">
                                                {record.type || "Animal"}
                                                {record.createdByName
                                                    ? ` · Added by ${record.createdByName}`
                                                    : ""}
                                                {" · "}
                                                {formatDate(record.intakeDate || record.createdAt)}
                                            </div>

                                            <div className="ao-tags">
                                                {record.intakeSource === "field" && (
                                                    <span className="ao-tag blue">
                                                        <Icon name="phone" size={11} />Phone
                                                    </span>
                                                )}
                                                {tab === "all" && (
                                                    <span className={`ao-tag ${statusTag[status]?.tone || ""}`}>
                                                        {statusTag[status]?.label || status}
                                                    </span>
                                                )}
                                                {record.intakeType && (
                                                    <span className="ao-tag orange">
                                                        {record.intakeType}
                                                    </span>
                                                )}
                                                <span
                                                    className={`ao-tag ${conditionTone(record.intakeCondition)}`}
                                                >
                                                    {record.intakeCondition || "Unknown"}
                                                </span>
                                                {record.location && (
                                                    <span className="ao-tag"><Icon name="pin" size={11} />{record.location}</span>
                                                )}
                                                {record.rescuedBy && (
                                                    <span className="ao-tag">Rescued by {record.rescuedBy}</span>
                                                )}
                                            </div>

                                            {record.description && (
                                                <p className="ao-note">"{record.description}"</p>
                                            )}

                                            {record.rejectionReason && (
                                                <p className="ao-note reject">
                                                    Rejected: {record.rejectionReason}
                                                </p>
                                            )}
                                        </div>

                                        <div className="ao-actions" onClick={(event) => event.stopPropagation()}>
                                            {status === "pending" && canManage && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="ao-btn sm ok"
                                                        onClick={() => handleApprove(record._id)}
                                                        disabled={isProcessing}
                                                    >
                                                        {isProcessing ? "Processing..." : "Approve"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="ao-btn sm danger"
                                                        onClick={() => handleReject(record._id)}
                                                        disabled={isProcessing}
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}

                                            {canManage && (
                                                <button
                                                    type="button"
                                                    className="ao-btn sm"
                                                    onClick={() => handleEditRecord(record)}
                                                    disabled={isProcessing}
                                                >
                                                    Edit
                                                </button>
                                            )}

                                            {isAdmin() && (
                                                <button
                                                    type="button"
                                                    className="ao-btn sm danger"
                                                    onClick={() => handleDeleteRecord(record._id)}
                                                    disabled={isProcessing}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>

                                        {openId === record._id && (
                                            <div className="ao-item-map" onClick={(event) => event.stopPropagation()}>
                                                {record.latitude != null && record.longitude != null ? (
                                                    <MapContainer
                                                        center={[Number(record.latitude), Number(record.longitude)]}
                                                        zoom={16}
                                                        scrollWheelZoom={false}
                                                        className="ao-item-map-view"
                                                    >
                                                        <TileLayer
                                                            attribution="&copy; OpenStreetMap"
                                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                        />
                                                        <Marker position={[Number(record.latitude), Number(record.longitude)]} icon={AO_PIN} />
                                                    </MapContainer>
                                                ) : (
                                                    <p className="ao-item-nomap">No map pin was saved for this intake.</p>
                                                )}
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
}
