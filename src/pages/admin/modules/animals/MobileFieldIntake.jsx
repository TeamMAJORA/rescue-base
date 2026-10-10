import { useEffect, useMemo, useRef, useState } from "react";

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
                        <Icon name={item.icon} />
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

function isToday(date, now = new Date()) {
    if (!date) return false;
    return new Date(date).toDateString() === now.toDateString();
}

function mostCommon(values) {
    const counts = {};
    let best = null;

    values.filter(Boolean).forEach((value) => {
        counts[value] = (counts[value] || 0) + 1;
        if (!best || counts[value] > counts[best]) best = value;
    });

    return best ? { value: best, count: counts[best] } : null;
}

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api/animals`;
const UPLOAD_URL = `${import.meta.env.VITE_BACKEND_URL}/api/uploads/image`;

const INITIAL_FORM = {
    animalName: "",
    animalType: "Dog",
    intakeType: "Rescued",
    condition: "Healthy",
    rescueLocation: "",
    latitude: "",
    longitude: "",
    notes: "",
};

const SPECIES = [
    { value: "Dog", emoji: "🐶" },
    { value: "Cat", emoji: "🐱" },
    { value: "Other", emoji: "🐾" },
];

const INTAKE_TYPE_OPTIONS = [
    { value: "Rescued", label: "Rescued" },
    { value: "Stray", label: "Stray" },
    { value: "Owner Surrender", label: "Surrendered" },
    { value: "Transferred", label: "Transferred" },
];

const CONDITION_OPTIONS = [
    { value: "Healthy", label: "Healthy" },
    { value: "Injured", label: "Injured" },
    { value: "Sick", label: "Sick" },
    { value: "Under Observation", label: "Under Observation" },
    { value: "Unknown", label: "Unsure" },
];

const SEARCH_FIELDS = {
    name: (r) => r.name,
    location: (r) => r.location,
    person: (r) => `${r.rescuedBy || ""} ${r.createdByName || ""}`,
};

const SEARCH_BY_OPTIONS = [
    { value: "all", label: "All fields" },
    { value: "name", label: "Animal name" },
    { value: "location", label: "Location" },
    { value: "person", label: "Submitted by" },
];

const DEFAULT_FILTERS = {
    searchBy: "all",
    search: "",
    species: "All",
    condition: "All",
};

function getToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken")
    );
}

function getCurrentUser() {
    try {
        const storedUser =
            localStorage.getItem("user") ||
            localStorage.getItem("currentUser") ||
            localStorage.getItem("rescuebase_user");

        return storedUser ? JSON.parse(storedUser) : null;
    } catch {
        return null;
    }
}

function getStatus(record) {
    const status = record.intakeStatus || "pending_review";
    return status === "pending_review" ? "pending" : status;
}

function timeAgo(date) {
    if (!date) return "";
    const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
    const days = Math.round(hours / 24);
    if (days === 1) return "Yesterday";
    return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MobileFieldIntake() {
    const [form, setForm] = useState(INITIAL_FORM);
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [submissions, setSubmissions] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [listUnavailable, setListUnavailable] = useState(false);
    const [tab, setTab] = useState("pending");
    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    const listRef = useRef(null);

    // --------------------------------------------------
    // RECENT SUBMISSIONS
    // --------------------------------------------------

    async function loadSubmissions() {
        setListLoading(true);
        const headers = { Authorization: `Bearer ${getToken()}` };

        const results = await Promise.allSettled([
            fetch(`${API_BASE_URL}/intakes`, { headers }).then((r) =>
                r.ok ? r.json() : Promise.reject(r.status)
            ),
            fetch(`${API_BASE_URL}?intakeStatus=approved`, { headers }).then((r) =>
                r.ok ? r.json() : Promise.reject(r.status)
            ),
        ]);

        const pending = results[0].status === "fulfilled" ? results[0].value.intakes || [] : [];
        const approved = results[1].status === "fulfilled" ? results[1].value.animals || [] : [];

        setListUnavailable(results[0].status === "rejected");
        setSubmissions(
            [...pending, ...approved].sort(
                (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            )
        );
        setListLoading(false);
    }

    useEffect(() => {
        loadSubmissions();
    }, []);

    // Free the preview image memory when the photo changes.
    useEffect(() => {
        if (!photo) {
            setPhotoPreview("");
            return undefined;
        }
        const url = URL.createObjectURL(photo);
        setPhotoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photo]);

    // --------------------------------------------------
    // FORM
    // --------------------------------------------------

    function updateField(name, value) {
        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function getCurrentLocation() {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by this browser.");
            return;
        }

        setError("");
        setLocating(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setForm((previous) => ({
                    ...previous,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6),
                }));
                setLocating(false);
            },
            () => {
                setError("Unable to retrieve location. Please allow location access.");
                setLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }

    async function uploadPhoto(token) {
        const formData = new FormData();
        formData.append("image", photo);

        const response = await fetch(UPLOAD_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to upload the photo.");
        }

        return data.imageUrl;
    }

    async function handleSubmit(e) {
        e.preventDefault();

        setLoading(true);
        setError("");
        setMessage("");

        const token = getToken();
        const currentUser = getCurrentUser();

        const volunteerName =
            currentUser?.name || currentUser?.username || currentUser?.fullName || "";
        const volunteerEmail = currentUser?.email || "";

        if (!token) {
            setError("Session expired. Please log in again.");
            setLoading(false);
            return;
        }

        if (!form.animalName.trim()) {
            setError("Animal name is required.");
            setLoading(false);
            return;
        }

        try {
            const imageUrl = photo ? await uploadPhoto(token) : "";

            const payload = {
                name: form.animalName.trim(),
                type: form.animalType,
                intakeType: form.intakeType,
                intakeCondition: form.condition,
                location: form.rescueLocation.trim(),
                rescuedBy: volunteerName,
                description: form.notes.trim(),
                latitude: form.latitude ? Number(form.latitude) : null,
                longitude: form.longitude ? Number(form.longitude) : null,
                image: imageUrl,
            };

            if (volunteerEmail) {
                payload.createdByEmail = volunteerEmail;
            }

            const response = await fetch(API_BASE_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || "Failed to submit field intake.");
            }

            setMessage("Field intake submitted successfully.");
            setForm(INITIAL_FORM);
            setPhoto(null);
            await loadSubmissions();
        } catch (submitError) {
            setError(submitError.message || "Something went wrong while submitting.");
        } finally {
            setLoading(false);
        }
    }

    // --------------------------------------------------
    // STATS, TABS, FILTERING
    // --------------------------------------------------

    const pendingCount = submissions.filter((s) => getStatus(s) === "pending").length;

    const stats = useMemo(
        () => ({
            today: submissions.filter((s) => isToday(s.createdAt)).length,
            approvedThisMonth: submissions.filter(
                (s) => getStatus(s) === "approved" && isSameMonth(s.createdAt)
            ).length,
            topArea: mostCommon(submissions.map((s) => s.location)),
        }),
        [submissions]
    );

    const tabSubmissions = useMemo(
        () => (tab === "all" ? submissions : submissions.filter((s) => getStatus(s) === tab)),
        [submissions, tab]
    );

    const filteredSubmissions = useMemo(
        () =>
            tabSubmissions.filter(
                (s) =>
                    matchesSearch(s, filters.search, filters.searchBy, SEARCH_FIELDS) &&
                    (filters.species === "All" || s.type === filters.species) &&
                    (filters.condition === "All" ||
                        (s.intakeCondition || "Unknown") === filters.condition)
            ),
        [tabSubmissions, filters]
    );

    function setFilter(key, value) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    const tabs = [
        { value: "pending", label: "Pending", count: pendingCount },
        { value: "approved", label: "Approved" },
        { value: "all", label: "All" },
    ];

    const hasLocation = form.latitude && form.longitude;

    return (
        <section className="ao-page">
            {message && <div className="ao-alert success">{message}</div>}
            {error && <div className="ao-alert error">{error}</div>}

            <StatsStrip
                highlight={{
                    value: pendingCount,
                    label:
                        pendingCount === 1
                            ? "Field entry waiting for staff review"
                            : "Field entries waiting for staff review",
                    actionLabel: pendingCount > 0 ? "Review now" : "",
                    onAction: () => {
                        setTab("pending");
                        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    },
                }}
                items={[
                    { icon: "phone", label: "Entries today", value: stats.today },
                    { icon: "check", label: "Approved this month", value: stats.approvedThisMonth },
                    {
                        icon: "pin",
                        label: "Top area",
                        value: stats.topArea ? stats.topArea.value : "—",
                        note: stats.topArea
                            ? `${stats.topArea.count} report${stats.topArea.count === 1 ? "" : "s"}`
                            : "",
                    },
                ]}
            />

            <div className="ao-layout">
                {/* ---------- FORM ---------- */}
                <section className="ao-card ao-form-card">
                    <h2>Quick Field Entry</h2>
                    <p className="ao-hint">Only the essentials. Staff can complete the rest later.</p>

                    <form className="ao-form" onSubmit={handleSubmit}>
                        <label className="ao-photo">
                            {photoPreview ? (
                                <>
                                    <img className="ao-photo-preview" src={photoPreview} alt="Selected" />
                                    <span>Tap to change photo</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="camera" size={30} />
                                    <b>Take or upload a photo</b>
                                    <span>Tap to open camera</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                            />
                        </label>

                        <div className="ao-field">
                            Species
                            <div className="ao-species">
                                {SPECIES.map((s) => (
                                    <button
                                        type="button"
                                        key={s.value}
                                        className={form.animalType === s.value ? "on" : ""}
                                        onClick={() => updateField("animalType", s.value)}
                                    >
                                        <span>{s.emoji}</span>
                                        {s.value}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="ao-field">
                            Name or Nickname
                            <input
                                value={form.animalName}
                                onChange={(e) => updateField("animalName", e.target.value)}
                                placeholder="e.g. Brownie"
                                required
                            />
                        </label>

                        <div className="ao-field">
                            How did you find them?
                            <ChipGroup
                                options={INTAKE_TYPE_OPTIONS}
                                value={form.intakeType}
                                onChange={(value) => updateField("intakeType", value)}
                            />
                        </div>

                        <label className="ao-field">
                            Where?
                            <input
                                value={form.rescueLocation}
                                onChange={(e) => updateField("rescueLocation", e.target.value)}
                                placeholder="e.g. Lahug, Cebu City"
                            />
                        </label>

                        {hasLocation ? (
                            <div className="ao-location">
                                <Icon name="pin" />
                                GPS captured ({form.latitude}, {form.longitude})
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="ao-btn"
                                onClick={getCurrentLocation}
                                disabled={loading || locating}
                            >
                                <Icon name="pin" />
                                {locating ? "Getting location..." : "Use my current location"}
                            </button>
                        )}

                        <div className="ao-field">
                            Condition
                            <ChipGroup
                                options={CONDITION_OPTIONS}
                                value={form.condition}
                                tone="green"
                                onChange={(value) => updateField("condition", value)}
                            />
                        </div>

                        <label className="ao-field">
                            What did you see?
                            <textarea
                                value={form.notes}
                                onChange={(e) => updateField("notes", e.target.value)}
                                placeholder="e.g. Limping, near the jeepney terminal."
                            />
                        </label>

                        <button type="submit" className="ao-btn primary block" disabled={loading}>
                            {loading ? "Submitting..." : "Submit Field Intake"}
                        </button>
                    </form>
                </section>

                {/* ---------- RECENT SUBMISSIONS ---------- */}
                <section className="ao-card" ref={listRef}>
                    <div className="ao-list-head">
                        <h2>Recent Field Submissions</h2>
                        <Tabs tabs={tabs} value={tab} onChange={setTab} />
                    </div>

                    <SearchToolbar
                        searchBy={filters.searchBy}
                        onSearchByChange={(value) => setFilter("searchBy", value)}
                        searchByOptions={SEARCH_BY_OPTIONS}
                        search={filters.search}
                        onSearchChange={(value) => setFilter("search", value)}
                        placeholder="Search name, area, or person..."
                        filters={[
                            {
                                label: "Species",
                                value: filters.species,
                                onChange: (value) => setFilter("species", value),
                                options: [
                                    { value: "All", label: "All species" },
                                    { value: "Dog", label: "Dog" },
                                    { value: "Cat", label: "Cat" },
                                    { value: "Other", label: "Other" },
                                ],
                            },
                            {
                                label: "Condition",
                                value: filters.condition,
                                onChange: (value) => setFilter("condition", value),
                                options: [
                                    { value: "All", label: "Any condition" },
                                    ...CONDITION_OPTIONS.map((o) => ({
                                        value: o.value,
                                        label: o.value,
                                    })),
                                ],
                            },
                        ]}
                        shown={filteredSubmissions.length}
                        total={tabSubmissions.length}
                        noun="entries"
                        onClear={() => setFilters(DEFAULT_FILTERS)}
                    />

                    {listLoading ? (
                        <p className="ao-empty">Loading submissions...</p>
                    ) : filteredSubmissions.length === 0 ? (
                        <p className="ao-empty">
                            {listUnavailable && tab === "pending"
                                ? "Pending entries are only visible to staff and admins."
                                : "No field entries match your search."}
                        </p>
                    ) : (
                        <div className="ao-list">
                            {filteredSubmissions.map((s) => {
                                const status = getStatus(s);
                                const hasCoords = s.latitude != null && s.longitude != null;

                                return (
                                    <article
                                        key={s._id}
                                        className={`ao-item ${status === "pending" ? "flag" : ""}`}
                                    >
                                        <div className="ao-avatar">
                                            {s.image ? <img src={s.image} alt="" /> : speciesEmoji(s.type)}
                                        </div>

                                        <div>
                                            <h3>{s.name}</h3>
                                            <div className="ao-meta">
                                                {s.rescuedBy || s.createdByName || "Unknown"} · {timeAgo(s.createdAt)}
                                            </div>
                                            <div className="ao-tags">
                                                <span className={`ao-tag ${conditionTone(s.intakeCondition)}`}>
                                                    {s.intakeCondition || "Unknown"}
                                                </span>
                                                {s.location && <span className="ao-tag"><Icon name="pin" size={11} />{s.location}</span>}
                                                <span className={`ao-tag ${status === "pending" ? "orange" : "green"}`}>
                                                    {status === "pending" ? "Pending" : "Approved"}
                                                </span>
                                            </div>
                                            {s.description && <p className="ao-note">"{s.description}"</p>}
                                        </div>

                                        <div className="ao-actions">
                                            {hasCoords && (
                                                <a
                                                    className="ao-btn sm"
                                                    href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    View on Map
                                                </a>
                                            )}
                                        </div>
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
