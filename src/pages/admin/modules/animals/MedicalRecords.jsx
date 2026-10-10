import { useEffect, useMemo, useRef, useState } from "react";
import { isAdmin } from "../../../../utils/auth";
import InfoTip from "../../../../components/system/InfoTip";

// NOTE: medical records are still kept in the browser only (no backend yet),
// so they reset when the page is refreshed — same behavior as before.

const API_ANIMALS = `${import.meta.env.VITE_BACKEND_URL}/api/animals`;

// Vaccines are recorded in Vaccination Records, not here
const RECORD_TYPES = ["Checkup", "Treatment", "Surgery", "Deworming"];

const TYPE_STYLE = {
    Checkup: { tone: "blue", icon: "pulse" },
    Treatment: { tone: "orange", icon: "pill" },
    Surgery: { tone: "red", icon: "tool" },
    Deworming: { tone: "green", icon: "worm" },
};

const starterRecords = [
    {
        id: 1,
        animalName: "Max",
        recordType: "Vaccine",
        vetName: "Dr. Santos",
        recordDate: "2026-06-20",
        notes: "Anti-rabies vaccine completed.",
    },
    {
        id: 2,
        animalName: "Luna",
        recordType: "Checkup",
        vetName: "Dr. Reyes",
        recordDate: "2026-06-22",
        notes: "General checkup. Healthy condition.",
    },
];

const SEARCH_FIELDS = {
    animal: (r) => r.animalName,
    vet: (r) => r.vetName,
    notes: (r) => r.notes,
};

const SEARCH_BY_OPTIONS = [
    { value: "all", label: "All fields" },
    { value: "animal", label: "Animal name" },
    { value: "vet", label: "Veterinarian" },
    { value: "notes", label: "Notes" },
];

const DEFAULT_FILTERS = {
    searchBy: "all",
    search: "",
    range: "any",
    sort: "newest",
};

// ---------- Date helpers ----------

function todayLocal() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

function parseLocal(value) {
    return value ? new Date(`${value}T00:00:00`) : null;
}

// "2026-06-25" → "Jun 25, 2026"; empty → "—"
function formatRecordDate(value) {
    if (!value) return "—";

    const date = parseLocal(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function daysAgo(value) {
    const date = parseLocal(value);
    if (!date) return null;
    return Math.round((parseLocal(todayLocal()) - date) / 86400000);
}

function relativeText(value) {
    const days = daysAgo(value);
    if (days === null) return "";
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days > 1 && days < 7) return `${days} days ago`;
    return "";
}

function inRange(value, range) {
    if (range === "any") return true;
    const days = daysAgo(value);
    if (days === null) return false;
    if (range === "7d") return days <= 7;
    if (range === "30d") return days <= 30;
    if (range === "month") {
        const d = parseLocal(value);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
}

// Groups for the history feed
function groupLabel(value) {
    const days = daysAgo(value);
    if (days === null) return "No date";
    if (days <= 7) return "This week";
    const d = parseLocal(value);
    const now = new Date();
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        return "Earlier this month";
    }
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ---------- Shared UI pieces (stats strip, tabs, search bar) ----------

const ICONS = {
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
        </>
    ),
    pulse: <path d="M4 12h4l2-5 4 10 2-5h4" />,
    pill: (
        <>
            <rect x="3" y="8" width="18" height="8" rx="4" />
            <path d="M12 8v8" />
        </>
    ),
    tool: (
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    ),
    worm: <path d="M7 20c-2 0-3-1.5-3-3s1-3 3-3h10c2 0 3-1.5 3-3s-1-3-3-3H9" />,
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

// ---------- Page ----------

export default function MedicalRecords({ lockedAnimal = null }) {
    const blankForm = {
        animalName: lockedAnimal?.name || "",
        recordType: "Checkup",
        vetName: "",
        recordDate: "",
        notes: "",
    };

    const [records, setRecords] = useState(starterRecords);
    const [editingId, setEditingId] = useState(null);
    const [recordForm, setRecordForm] = useState(blankForm);
    const [animalNames, setAnimalNames] = useState([]);
    const [tab, setTab] = useState("All");
    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    const formRef = useRef(null);

    // Existing animals for the Animal dropdown
    useEffect(() => {
        if (lockedAnimal) return;
        fetch(API_ANIMALS)
            .then((response) => response.json())
            .then((data) =>
                setAnimalNames(
                    [...new Set((data.animals || []).map((a) => a.name).filter(Boolean))].sort()
                )
            )
            .catch(() => setAnimalNames([]));
    }, [lockedAnimal]);

    function updateField(name, value) {
        setRecordForm((current) => ({ ...current, [name]: value }));
    }

    function resetForm() {
        setEditingId(null);
        setRecordForm(blankForm);
    }

    function handleAddRecord(e) {
        e.preventDefault();

        if (editingId) {
            setRecords((current) =>
                current.map((record) =>
                    record.id === editingId ? { ...record, ...recordForm } : record
                )
            );
        } else {
            setRecords((current) => [{ id: Date.now(), ...recordForm }, ...current]);
        }

        resetForm();
    }

    function handleEditRecord(record) {
        setEditingId(record.id);

        setRecordForm({
            animalName: record.animalName,
            recordType: record.recordType,
            vetName: record.vetName,
            recordDate: record.recordDate,
            notes: record.notes,
        });

        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function handleDeleteRecord(id) {
        if (!isAdmin()) {
            alert("Only administrators can delete medical records.");
            return;
        }

        if (!window.confirm("Delete this medical record?")) return;

        setRecords((current) => current.filter((record) => record.id !== id));

        if (editingId === id) resetForm();
    }

    // ---------- Stats, tabs, filtering ----------

    const scoped = useMemo(
        () =>
            lockedAnimal
                ? records.filter((r) => r.animalName === lockedAnimal.name)
                : records,
        [records, lockedAnimal]
    );

    const counts = useMemo(() => {
        const result = {};
        scoped.forEach((r) => {
            result[r.recordType] = (result[r.recordType] || 0) + 1;
        });
        return result;
    }, [scoped]);

    const thisMonth = useMemo(
        () => scoped.filter((r) => inRange(r.recordDate, "month")).length,
        [scoped]
    );

    const tabRecords = useMemo(
        () => (tab === "All" ? scoped : scoped.filter((r) => r.recordType === tab)),
        [scoped, tab]
    );

    const filteredRecords = useMemo(() => {
        const list = tabRecords.filter(
            (r) =>
                matchesSearch(r, filters.search, filters.searchBy, SEARCH_FIELDS) &&
                inRange(r.recordDate, filters.range)
        );

        const time = (r) => (r.recordDate ? parseLocal(r.recordDate).getTime() : 0);

        return [...list].sort((a, b) => {
            if (filters.sort === "oldest") return time(a) - time(b);
            if (filters.sort === "name") return a.animalName.localeCompare(b.animalName);
            return time(b) - time(a);
        });
    }, [tabRecords, filters]);

    // Date groups only make sense when the list is sorted by date
    const groups = useMemo(() => {
        if (filters.sort === "name") return [{ label: "", items: filteredRecords }];

        const result = [];
        filteredRecords.forEach((record) => {
            const label = groupLabel(record.recordDate);
            const last = result[result.length - 1];
            if (last && last.label === label) last.items.push(record);
            else result.push({ label, items: [record] });
        });
        return result;
    }, [filteredRecords, filters.sort]);

    function setFilter(key, value) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    const tabs = [{ value: "All", label: "All" }, ...RECORD_TYPES.map((t) => ({ value: t, label: t }))];
    if (counts.Vaccine) tabs.push({ value: "Vaccine", label: "Vaccine (old)" });

    return (
        <section className={`ao-page${lockedAnimal ? " ao-embedded" : ""}`}>
            {!lockedAnimal && (
                <StatsStrip
                    highlight={{
                        value: thisMonth,
                        label: thisMonth === 1 ? "Medical record this month" : "Medical records this month",
                    }}
                    items={[
                        { icon: "pulse", label: "Checkups", value: counts.Checkup || 0 },
                        { icon: "pill", label: "Treatments", value: counts.Treatment || 0 },
                        { icon: "tool", label: "Surgeries", value: counts.Surgery || 0 },
                    ]}
                />
            )}

            <div className="ao-layout">
                {/* ---------- FORM ---------- */}
                <section className="ao-card ao-form-card" ref={formRef}>
                    <h2>{editingId ? "Edit Medical Record" : "Add Medical Record"}</h2>
                    <p className="ao-hint">
                        Checkups, treatments, surgeries and deworming. Vaccines go in Vaccination Records.
                    </p>

                    <form className="ao-form" onSubmit={handleAddRecord}>
                        <label className="ao-field">
                            <span>Animal <span className="ao-req">*</span></span>
                            {lockedAnimal ? (
                                <input type="text" value={recordForm.animalName} readOnly />
                            ) : (
                                <select
                                    value={recordForm.animalName}
                                    onChange={(e) => updateField("animalName", e.target.value)}
                                    required
                                >
                                    <option value="">Select an animal</option>
                                    {animalNames.map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                                    {/* Keep older records editable if the animal is no longer listed */}
                                    {recordForm.animalName && !animalNames.includes(recordForm.animalName) && (
                                        <option value={recordForm.animalName}>
                                            {recordForm.animalName} (not in Animal Profiles)
                                        </option>
                                    )}
                                </select>
                            )}
                        </label>

                        <label className="ao-field">
                            <span className="ao-label-tip">
                                <span>Record Type <span className="ao-req">*</span></span>
                                <InfoTip text="Checkup: routine exam. Treatment: medicine or care for an illness or injury. Surgery: any operation, including spay/neuter. Deworming: parasite treatment. Vaccines go in Vaccination Records." />
                            </span>
                            <select
                                value={recordForm.recordType}
                                onChange={(e) => updateField("recordType", e.target.value)}
                                required
                            >
                                {RECORD_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                                {/* Keep older types (e.g. "Vaccine") selectable when editing */}
                                {recordForm.recordType && !RECORD_TYPES.includes(recordForm.recordType) && (
                                    <option value={recordForm.recordType}>{recordForm.recordType}</option>
                                )}
                            </select>
                        </label>

                        <div className="ao-row2">
                            <label className="ao-field">
                                <span>Veterinarian <span className="ao-req">*</span></span>
                                <input
                                    type="text"
                                    value={recordForm.vetName}
                                    onChange={(e) => updateField("vetName", e.target.value)}
                                    placeholder="e.g. Dr. Santos"
                                    required
                                />
                            </label>

                            <label className="ao-field">
                                <span>Date <span className="ao-req">*</span></span>
                                <input
                                    type="date"
                                    value={recordForm.recordDate}
                                    max={todayLocal()}
                                    onChange={(e) => updateField("recordDate", e.target.value)}
                                    required
                                />
                            </label>
                        </div>

                        <label className="ao-field">
                            <span>Notes <span className="ao-req">*</span></span>
                            <textarea
                                value={recordForm.notes}
                                onChange={(e) => updateField("notes", e.target.value)}
                                placeholder="Write medical details here..."
                                required
                            />
                        </label>

                        <div className="ao-form-actions">
                            <button type="submit" className="ao-btn primary">
                                {editingId ? "Update Medical Record" : "Save Medical Record"}
                            </button>
                            {editingId && (
                                <button type="button" className="ao-btn" onClick={resetForm}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                {/* ---------- HISTORY ---------- */}
                <section className="ao-card">
                    <div className="ao-list-head">
                        {lockedAnimal && <h2>Medical Records</h2>}
                        <Tabs tabs={tabs} value={tab} onChange={setTab} />
                    </div>

                    <SearchToolbar
                        searchBy={filters.searchBy}
                        onSearchByChange={(value) => setFilter("searchBy", value)}
                        searchByOptions={SEARCH_BY_OPTIONS}
                        search={filters.search}
                        onSearchChange={(value) => setFilter("search", value)}
                        placeholder="Search animal, vet, or notes..."
                        filters={[
                            {
                                label: "Date range",
                                value: filters.range,
                                onChange: (value) => setFilter("range", value),
                                options: [
                                    { value: "any", label: "Any date" },
                                    { value: "7d", label: "Last 7 days" },
                                    { value: "30d", label: "Last 30 days" },
                                    { value: "month", label: "This month" },
                                ],
                            },
                            {
                                label: "Sort",
                                value: filters.sort,
                                onChange: (value) => setFilter("sort", value),
                                options: [
                                    { value: "newest", label: "Newest first" },
                                    { value: "oldest", label: "Oldest first" },
                                    { value: "name", label: "Animal A–Z" },
                                ],
                            },
                        ]}
                        shown={filteredRecords.length}
                        total={tabRecords.length}
                        noun="records"
                        onClear={() => setFilters(DEFAULT_FILTERS)}
                    />

                    {filteredRecords.length === 0 ? (
                        <p className="ao-empty">
                            {scoped.length === 0
                                ? "No medical records added yet."
                                : "No medical records match your search."}
                        </p>
                    ) : (
                        groups.map((group) => (
                            <div key={group.label || "all"}>
                                {group.label && <h4 className="ao-group-title ao-day">{group.label}</h4>}
                                <div className="ao-list">
                                    {group.items.map((record) => {
                                        const style = TYPE_STYLE[record.recordType] || { tone: "", icon: "pulse" };
                                        const rel = relativeText(record.recordDate);

                                        return (
                                            <article key={record.id} className="ao-item ao-med-item">
                                                <div className={`ao-avatar ao-type-${style.tone}`}>
                                                    <Icon name={style.icon} size={20} />
                                                </div>

                                                <div>
                                                    <h3>
                                                        {!lockedAnimal && record.animalName}
                                                        <span className={`ao-tag ${style.tone} ao-type-badge`}>
                                                            {record.recordType}
                                                        </span>
                                                    </h3>
                                                    <div className="ao-meta">
                                                        {record.vetName || "No vet recorded"} ·{" "}
                                                        {formatRecordDate(record.recordDate)}
                                                        {rel ? ` · ${rel}` : ""}
                                                    </div>
                                                    {record.notes && <p className="ao-med-notes">{record.notes}</p>}
                                                </div>

                                                <div className="ao-actions">
                                                    <button
                                                        type="button"
                                                        className="ao-btn sm"
                                                        onClick={() => handleEditRecord(record)}
                                                    >
                                                        Edit
                                                    </button>
                                                    {isAdmin() && (
                                                        <button
                                                            type="button"
                                                            className="ao-btn sm danger"
                                                            onClick={() => handleDeleteRecord(record.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </section>
            </div>
        </section>
    );
}
