import { useEffect, useMemo, useState } from "react";

// Care Updates — weekly care report for the foster's active pet
// (replaces the old "Weekly Updates" + "Foster Updates" pages)

const API = import.meta.env.VITE_BACKEND_URL;

const OTHER = "__other";

const HEALTH_OPTIONS = ["Excellent", "Good", "Fair", "Needs Attention"];
const APPETITE_OPTIONS = ["Excellent", "Normal", "Poor"];
const BEHAVIOR_OPTIONS = ["Playful", "Calm", "Shy", "Aggressive"];

const initialForm = {
    healthStatus: "",
    healthOther: "",
    appetite: "",
    appetiteOther: "",
    behavior: "",
    behaviorOther: "",
    weight: "",
    medication: false,
    exercise: false,
    note: "",
};

function healthTone(value) {
    if (value === "Excellent" || value === "Good") return "green";
    if (value === "Fair") return "orange";
    if (value === "Needs Attention") return "red";
    return "";
}

// ---------- Shared UI pieces (stats strip, tabs, search bar) ----------

const ICONS = {
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
        </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    list: <path d="M4 6h16M4 12h16M4 18h10" />,
    paw: (
        <>
            <circle cx="11" cy="4" r="2" />
            <circle cx="18" cy="8" r="2" />
            <circle cx="4" cy="8" r="2" />
            <path d="M8 14c0-2 2-4 4-4s4 2 4 4-1 6-4 6-4-4-4-6z" />
        </>
    ),
    bell: (
        <>
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    calendar: (
        <>
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M8 2v4M16 2v4M3 10h18" />
        </>
    ),
    alert: (
        <>
            <path d="M12 3 2 21h20z" />
            <path d="M12 10v4M12 17.5v.01" />
        </>
    ),
    camera: (
        <>
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
        </>
    ),
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

function daysBetween(from, to = new Date()) {
    const a = new Date(from);
    const b = new Date(to);
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 86400000);
}

function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function relativeDay(value) {
    const days = daysBetween(value);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    return `${days} days ago`;
}

async function uploadPhoto(file, token) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API}/api/uploads/image`, {
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

// Dropdown with an "Other (type your own)" option that reveals a text box
function SelectWithOther({ label, options, value, other, onChange, onOtherChange }) {
    return (
        <label className="ao-field">
            <span>{label} <span className="ao-req">*</span></span>
            <select value={value} onChange={(e) => onChange(e.target.value)} required>
                <option value="">Select {label.toLowerCase()}</option>
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
                <option value={OTHER}>Other (type your own)</option>
            </select>
            {value === OTHER && (
                <input
                    value={other}
                    onChange={(e) => onOtherChange(e.target.value)}
                    placeholder={`Describe ${label.toLowerCase()}...`}
                    required
                />
            )}
        </label>
    );
}


// Shown when the foster has no active assignment, so the page layout still appears
const EMPTY_ASSIGNMENT = {
    _id: "",
    petName: "your foster pet",
    updates: [],
    medicalRequests: [],
    behaviorEvaluation: null,
};

export default function WeeklyUpdates({ assignment: assignedPet, refreshAssignment, onDirtyChange }) {
    const hasAssignment = Boolean(assignedPet);
    const assignment = assignedPet || EMPTY_ASSIGNMENT;
    const NO_ASSIGNMENT_TEXT = "Once the shelter assigns you a pet, you can send weekly care updates here.";

    const savedUser = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");
    const token = localStorage.getItem("token");

    const [form, setForm] = useState(initialForm);
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("success");

    const [search, setSearch] = useState("");
    const [healthFilter, setHealthFilter] = useState("All");
    const [sort, setSort] = useState("newest");

    const isDirty =
        Boolean(photo) ||
        Object.keys(initialForm).some(
            (key) => String(form[key] ?? "") !== String(initialForm[key] ?? "")
        );

    // Tell the dashboard when there are unsaved changes (for the "Leave this form?" popup)
    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty]);

    useEffect(() => () => onDirtyChange?.(false), []);

    useEffect(() => {
        if (!photo) {
            setPhotoPreview("");
            return undefined;
        }
        const url = URL.createObjectURL(photo);
        setPhotoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photo]);

    function updateField(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
    }

    const updates = useMemo(
        () =>
            [...(assignment?.updates || [])].sort(
                (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            ),
        [assignment]
    );


    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setLoading(true);
            setMessage("");

            const photoUrl = photo ? await uploadPhoto(photo, token) : "";

            const pick = (value, other) => (value === OTHER ? other.trim() : value);

            const response = await fetch(
                `${API}/api/foster/assignments/${assignment._id}/updates`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        healthStatus: pick(form.healthStatus, form.healthOther),
                        appetite: pick(form.appetite, form.appetiteOther),
                        behavior: pick(form.behavior, form.behaviorOther),
                        weight: form.weight,
                        medication: form.medication,
                        exercise: form.exercise,
                        note: form.note.trim(),
                        photoUrl,
                        submittedBy: savedUser.username || savedUser.name || "Foster User",
                        submittedByEmail: savedUser.email || "",
                    }),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Unable to submit the update.");
            }

            setForm(initialForm);
            setPhoto(null);
            setMessage("Care update sent to the shelter.");
            setMessageType("success");
            await refreshAssignment?.();
        } catch (error) {
            setMessage(error.message || "Server error.");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    }

    // ---------- Stats ----------
    const lastUpdate = updates[0]?.createdAt || null;
    const sinceLast = lastUpdate ? daysBetween(lastUpdate) : null;
    const dueDate = new Date(lastUpdate || assignment.startDate || assignment.createdAt || Date.now());
    dueDate.setDate(dueDate.getDate() + 7);
    const dueIn = -daysBetween(dueDate);
    const dueNote =
        dueIn > 1 ? `in ${dueIn} days` : dueIn === 1 ? "tomorrow" : dueIn === 0 ? "today" : `${-dueIn} days overdue`;

    // ---------- History filtering ----------
    const healthOptions = [...new Set(updates.map((u) => u.healthStatus).filter(Boolean))];

    const filtered = updates
        .filter(
            (u) =>
                String(u.note || "").toLowerCase().includes(search.trim().toLowerCase()) &&
                (healthFilter === "All" || u.healthStatus === healthFilter)
        )
        .sort((a, b) =>
            sort === "oldest"
                ? new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
                : new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );

    const groups = [];
    filtered.forEach((update) => {
        const label = daysBetween(update.createdAt) <= 7 ? "This week" : "Earlier";
        const last = groups[groups.length - 1];
        if (last && last.label === label) last.items.push(update);
        else groups.push({ label, items: [update] });
    });

    const hasFilters = search.trim() || healthFilter !== "All" || sort !== "newest";

    return (
        <section className="ao-page">
            {!hasAssignment && (
                <div className="ao-banner orange">
                    <svg className="ao-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4M12 16v.01" />
                    </svg>
                    <div>
                        <b>No foster pet assigned yet</b>
                        {NO_ASSIGNMENT_TEXT}
                    </div>
                </div>
            )}
            <StatsStrip
                highlight={{
                    value:
                        sinceLast === null
                            ? "—"
                            : sinceLast === 0
                              ? "Today"
                              : `${sinceLast} day${sinceLast === 1 ? "" : "s"}`,
                    label: sinceLast === null ? "No updates sent yet" : "since your last update",
                }}
                items={[
                    { icon: "list", label: "Updates submitted", value: updates.length },
                    { icon: "paw", label: "Pets in your care", value: hasAssignment ? 1 : 0 },
                    {
                        icon: "bell",
                        label: "Next update due",
                        value: hasAssignment
                            ? dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "—",
                        note: hasAssignment ? dueNote : "",
                    },
                ]}
            />

            {message && <div className={`ao-alert ${messageType}`}>{message}</div>}

            <div className="ao-layout">
                {/* ---------- FORM ---------- */}
                <section className="ao-card">
                    <h2>Weekly Care Update</h2>
                    <p className="ao-hint">Tell the shelter how {assignment.petName} is doing this week.</p>

                    <form className="ao-form" onSubmit={handleSubmit}>
                        <fieldset className="ao-fieldset" disabled={!hasAssignment}>
                        <SelectWithOther
                            label="Overall Health"
                            options={HEALTH_OPTIONS}
                            value={form.healthStatus}
                            other={form.healthOther}
                            onChange={(v) => updateField("healthStatus", v)}
                            onOtherChange={(v) => updateField("healthOther", v)}
                        />
                        <SelectWithOther
                            label="Appetite"
                            options={APPETITE_OPTIONS}
                            value={form.appetite}
                            other={form.appetiteOther}
                            onChange={(v) => updateField("appetite", v)}
                            onOtherChange={(v) => updateField("appetiteOther", v)}
                        />
                        <SelectWithOther
                            label="Behavior"
                            options={BEHAVIOR_OPTIONS}
                            value={form.behavior}
                            other={form.behaviorOther}
                            onChange={(v) => updateField("behavior", v)}
                            onOtherChange={(v) => updateField("behaviorOther", v)}
                        />

                        <label className="ao-field">
                            <span>Weight (kg) <span className="ao-req">*</span></span>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="150"
                                value={form.weight}
                                onChange={(e) => updateField("weight", e.target.value)}
                                placeholder="e.g. 4.2"
                                required
                            />
                        </label>

                        <div className="ao-field">
                            <span>This week</span>
                            <div className="ao-toggles">
                                {[
                                    { key: "medication", label: "Medication given" },
                                    { key: "exercise", label: "Exercise completed" },
                                ].map((t) => (
                                    <button
                                        type="button"
                                        key={t.key}
                                        className={`ao-toggle${form[t.key] ? " on" : ""}`}
                                        aria-pressed={form[t.key]}
                                        onClick={() => updateField(t.key, !form[t.key])}
                                    >
                                        <i />
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="ao-photo">
                            {photoPreview ? (
                                <>
                                    <img className="ao-photo-preview" src={photoPreview} alt="Selected" />
                                    <span>Tap to change photo</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="camera" size={26} />
                                    <b>Add a photo</b>
                                    <span>Optional · tap to upload</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                            />
                        </label>

                        <label className="ao-field">
                            <span>Progress Notes <span className="ao-req">*</span></span>
                            <textarea
                                value={form.note}
                                onChange={(e) => updateField("note", e.target.value)}
                                placeholder="Condition, appetite, behavior, anything the shelter should know..."
                                required
                            />
                        </label>

                        <button type="submit" className="ao-btn primary block" disabled={loading}>
                            {loading ? "Sending..." : "Submit Update"}
                        </button>
                    </fieldset>
                    </form>
                </section>

                {/* ---------- HISTORY ---------- */}
                <section className="ao-card">
                    <div className="ao-list-head">
                        <h2>Update History</h2>
                    </div>

                    <div className="ao-toolbar">
                        <div className="ao-searchbox">
                            <label className="ao-searchbox-input">
                                <Icon name="search" />
                                <input
                                    type="search"
                                    value={search}
                                    placeholder="Search notes..."
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </label>
                        </div>
                        <select
                            className="ao-dropdown"
                            value={healthFilter}
                            onChange={(e) => setHealthFilter(e.target.value)}
                            aria-label="Health"
                        >
                            <option value="All">Any health</option>
                            {healthOptions.map((h) => (
                                <option key={h} value={h}>
                                    {h}
                                </option>
                            ))}
                        </select>
                        <select
                            className="ao-dropdown"
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            aria-label="Sort"
                        >
                            <option value="newest">Newest first</option>
                            <option value="oldest">Oldest first</option>
                        </select>
                    </div>

                    <p className="ao-results">
                        Showing {filtered.length} of {updates.length} updates
                        {hasFilters && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setHealthFilter("All");
                                    setSort("newest");
                                }}
                            >
                                Clear filters
                            </button>
                        )}
                    </p>

                    {updates.length === 0 ? (
                        <p className="ao-empty">No care updates sent yet.</p>
                    ) : filtered.length === 0 ? (
                        <p className="ao-empty">No updates match your search.</p>
                    ) : (
                        groups.map((group) => (
                            <div key={group.label}>
                                <h4 className="ao-group-title ao-day">{group.label}</h4>
                                <div className="ao-list">
                                    {group.items.map((update) => (
                                        <article className="ao-update" key={update._id}>
                                            <div>
                                                <h3>{formatDate(update.createdAt)}</h3>
                                                <div className="ao-tags">
                                                    {update.healthStatus && (
                                                        <span className={`ao-tag ${healthTone(update.healthStatus)}`}>
                                                            {update.healthStatus} health
                                                        </span>
                                                    )}
                                                    {update.appetite && (
                                                        <span className={`ao-tag ${update.appetite === "Poor" ? "red" : ""}`}>
                                                            {update.appetite} appetite
                                                        </span>
                                                    )}
                                                    {update.behavior && <span className="ao-tag">{update.behavior}</span>}
                                                    {update.weight != null && (
                                                        <span className="ao-tag">{update.weight} kg</span>
                                                    )}
                                                    {update.medication && <span className="ao-tag green">Medication given</span>}
                                                    {update.exercise && <span className="ao-tag green">Exercise completed</span>}
                                                </div>
                                                <p className="ao-med-notes">{update.note}</p>
                                            </div>
                                            {update.photoUrl ? (
                                                <a href={update.photoUrl} target="_blank" rel="noreferrer">
                                                    <img className="ao-update-photo" src={update.photoUrl} alt="Care update" />
                                                </a>
                                            ) : (
                                                <div className="ao-update-photo none">No photo</div>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </section>
            </div>
        </section>
    );
}
