import { useEffect, useMemo, useRef, useState } from "react";
import { isAdmin } from "../../../../utils/auth";   
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

function isSameMonth(date, now = new Date()) {
    if (!date) return false;
    const d = new Date(date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
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

function withinRange(date, range) {
    if (range === "any") return true;
    if (!date) return false;

    const d = new Date(date);
    const now = new Date();

    if (range === "7d") return now - d <= 7 * 24 * 60 * 60 * 1000;
    if (range === "30d") return now - d <= 30 * 24 * 60 * 60 * 1000;
    if (range === "month") return isSameMonth(d, now);
    return true;
}

// NOTE: transfers are still kept in the browser only (no backend yet),
// so they reset when the page is refreshed — same behavior as before.

const API_ANIMALS = `${import.meta.env.VITE_BACKEND_URL}/api/animals`;

const starterTransfers = [
    {
        id: 1,
        animalName: "Bella",
        fromLocation: "MARO Shelter",
        toLocation: "Cebu City Veterinary Office",
        transferDate: "2026-07-20",
        reason: "Medical treatment",
        status: "Completed",
    },
    {
        id: 2,
        animalName: "Max",
        fromLocation: "MARO Shelter",
        toLocation: "Foster home – Ana L.",
        transferDate: "2026-07-27",
        reason: "Recovery in foster care",
        status: "In Transit",
    },
    {
        id: 3,
        animalName: "Luna",
        fromLocation: "MARO Shelter",
        toLocation: "Cebu City Veterinary Office",
        transferDate: "2026-07-29",
        reason: "Spay surgery",
        status: "Pending",
    },
];

const emptyForm = {
    animalName: "",
    fromLocation: "",
    toLocation: "",
    transferDate: "",
    reason: "",
    status: "Pending",
};

const STATUS_OPTIONS = [
    { value: "Pending", label: "Pending" },
    { value: "In Transit", label: "In Transit" },
    { value: "Completed", label: "Completed" },
    { value: "Cancelled", label: "Cancelled" },
];

const STATUS_TONE = {
    Pending: "orange",
    "In Transit": "blue",
    Completed: "green",
    Cancelled: "grey",
};

// What the quick-action button moves a transfer to.
const NEXT_STEP = {
    Pending: { status: "In Transit", label: "Start Transit" },
    "In Transit": { status: "Completed", label: "Mark Completed" },
};

const SEARCH_FIELDS = {
    animal: (t) => t.animalName,
    from: (t) => t.fromLocation,
    to: (t) => t.toLocation,
    reason: (t) => t.reason,
};

const SEARCH_BY_OPTIONS = [
    { value: "all", label: "All fields" },
    { value: "animal", label: "Animal name" },
    { value: "from", label: "From" },
    { value: "to", label: "To" },
    { value: "reason", label: "Reason" },
];

const DEFAULT_FILTERS = {
    searchBy: "all",
    search: "",
    range: "any",
    sort: "newest",
};

function formatDate(date) {
    if (!date) return "No date";
    return new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default function AnimalTransfers() {
    const [transfers, setTransfers] = useState(starterTransfers);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [animalNames, setAnimalNames] = useState([]);

    const [tab, setTab] = useState("All");
    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    const formRef = useRef(null);
    const listRef = useRef(null);

    // Suggest existing animal names in the Animal field.
    useEffect(() => {
        fetch(API_ANIMALS)
            .then((response) => response.json())
            .then((data) =>
                setAnimalNames(
                    [...new Set((data.animals || []).map((a) => a.name).filter(Boolean))].sort()
                )
            )
            .catch(() => setAnimalNames([]));
    }, []);

    function updateField(name, value) {
        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function resetForm() {
        setEditingId(null);
        setForm(emptyForm);
    }

    function handleSubmit(e) {
        e.preventDefault();

        if (editingId) {
            setTransfers((current) =>
                current.map((transfer) =>
                    transfer.id === editingId ? { ...transfer, ...form } : transfer
                )
            );
        } else {
            setTransfers((current) => [{ id: Date.now(), ...form }, ...current]);
        }

        resetForm();
    }

    function handleEditTransfer(transfer) {
        setEditingId(transfer.id);

        setForm({
            animalName: transfer.animalName,
            fromLocation: transfer.fromLocation,
            toLocation: transfer.toLocation,
            transferDate: transfer.transferDate,
            reason: transfer.reason,
            status: transfer.status,
        });

        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function handleAdvance(transfer) {
        const next = NEXT_STEP[transfer.status];
        if (!next) return;

        setTransfers((current) =>
            current.map((t) => (t.id === transfer.id ? { ...t, status: next.status } : t))
        );
    }

    function handleDeleteTransfer(id) {
        if (!isAdmin()) {
            alert("Only administrators can delete transfers");
            return;
        }

        if (!window.confirm("Delete this transfer record?")) return;

        setTransfers((current) => current.filter((transfer) => transfer.id !== id));

        if (editingId === id) resetForm();
    }

    // --------------------------------------------------
    // STATS, TABS, FILTERING
    // --------------------------------------------------

    const counts = useMemo(() => {
        const result = {};
        transfers.forEach((t) => {
            result[t.status] = (result[t.status] || 0) + 1;
        });
        return result;
    }, [transfers]);

    const topDestination = useMemo(
        () => mostCommon(transfers.map((t) => t.toLocation)),
        [transfers]
    );

    const tabTransfers = useMemo(
        () => (tab === "All" ? transfers : transfers.filter((t) => t.status === tab)),
        [transfers, tab]
    );

    const filteredTransfers = useMemo(() => {
        const list = tabTransfers.filter(
            (transfer) =>
                matchesSearch(transfer, filters.search, filters.searchBy, SEARCH_FIELDS) &&
                withinRange(transfer.transferDate, filters.range)
        );

        const dateOf = (t) => new Date(t.transferDate || 0).getTime();

        return [...list].sort((a, b) => {
            if (filters.sort === "oldest") return dateOf(a) - dateOf(b);
            if (filters.sort === "name") return a.animalName.localeCompare(b.animalName);
            return dateOf(b) - dateOf(a);
        });
    }, [tabTransfers, filters]);

    function setFilter(key, value) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    const inTransit = counts["In Transit"] || 0;

    const tabs = [
        { value: "All", label: "All" },
        { value: "Pending", label: "Pending", count: counts.Pending || 0 },
        { value: "In Transit", label: "In Transit", count: inTransit },
        { value: "Completed", label: "Completed" },
        { value: "Cancelled", label: "Cancelled" },
    ];

    return (
        <section className="ao-page">
            <StatsStrip
                highlight={{
                    value: inTransit,
                    label: inTransit === 1 ? "Transfer still in transit" : "Transfers still in transit",
                }}
                items={[
                    { icon: "swap", label: "Total transfers", value: transfers.length },
                    { icon: "clock", label: "Pending", value: counts.Pending || 0 },
                    {
                        icon: "pin",
                        label: "Most sent to",
                        value: topDestination ? topDestination.value : "—",
                        note: topDestination
                            ? `${topDestination.count} transfer${topDestination.count === 1 ? "" : "s"}`
                            : "",
                    },
                ]}
            />

            <div className="ao-layout">
                {/* ---------- FORM ---------- */}
                <section className="ao-card ao-form-card" ref={formRef}>
                    <h2>{editingId ? "Edit Transfer" : "New Transfer"}</h2>
                    <p className="ao-hint">Record where the animal is going and why.</p>

                    <form className="ao-form" onSubmit={handleSubmit}>
                        <label className="ao-field">
                            <span>Animal <span className="ao-req">*</span></span>
                            <input
                                list="ao-animal-names"
                                value={form.animalName}
                                onChange={(e) => updateField("animalName", e.target.value)}
                                placeholder="Start typing a name..."
                                required
                            />
                            <datalist id="ao-animal-names">
                                {animalNames.map((name) => (
                                    <option key={name} value={name} />
                                ))}
                            </datalist>
                        </label>

                        <div className="ao-route">
                            <label className="ao-field">
                                <span>From <span className="ao-req">*</span></span>
                                <input
                                    value={form.fromLocation}
                                    onChange={(e) => updateField("fromLocation", e.target.value)}
                                    placeholder="e.g. MARO Shelter"
                                    required
                                />
                            </label>
                            <Icon name="arrow" size={20} />
                            <label className="ao-field">
                                <span>To <span className="ao-req">*</span></span>
                                <input
                                    value={form.toLocation}
                                    onChange={(e) => updateField("toLocation", e.target.value)}
                                    placeholder="e.g. Vet clinic"
                                    required
                                />
                            </label>
                        </div>

                        <label className="ao-field">
                            <span>Transfer Date <span className="ao-req">*</span></span>
                            <input
                                type="date"
                                value={form.transferDate}
                                onChange={(e) => updateField("transferDate", e.target.value)}
                                required
                            />
                        </label>

                        <label className="ao-field">
                            <span>Reason <span className="ao-req">*</span></span>
                            <textarea
                                value={form.reason}
                                onChange={(e) => updateField("reason", e.target.value)}
                                placeholder="e.g. Scheduled spay surgery"
                                required
                            />
                        </label>

                        <div className="ao-field">
                            <span>Status <span className="ao-req">*</span></span>
                            <ChipGroup
                                options={STATUS_OPTIONS}
                                value={form.status}
                                onChange={(value) => updateField("status", value)}
                            />
                        </div>

                        <div className="ao-form-actions">
                            <button type="submit" className="ao-btn primary">
                                {editingId ? "Update Transfer" : "Save Transfer"}
                            </button>
                            {editingId && (
                                <button type="button" className="ao-btn" onClick={resetForm}>
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
                        placeholder="Search animal, origin, or destination..."
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
                                    { value: "name", label: "Name A–Z" },
                                ],
                            },
                        ]}
                        shown={filteredTransfers.length}
                        total={tabTransfers.length}
                        noun="transfers"
                        onClear={() => setFilters(DEFAULT_FILTERS)}
                    />

                    {filteredTransfers.length === 0 ? (
                        <p className="ao-empty">No transfers match your search.</p>
                    ) : (
                        <div className="ao-list">
                            {filteredTransfers.map((transfer) => {
                                const next = NEXT_STEP[transfer.status];
                                const active =
                                    transfer.status === "Pending" ||
                                    transfer.status === "In Transit";

                                return (
                                    <article
                                        key={transfer.id}
                                        className={`ao-item ${active ? "flag" : ""}`}
                                    >
                                        <div className="ao-avatar"><Icon name="swap" size={20} /></div>

                                        <div>
                                            <h3>{transfer.animalName}</h3>

                                            <div className="ao-path">
                                                <span>{transfer.fromLocation}</span>
                                                <Icon name="arrow" />
                                                <span>{transfer.toLocation}</span>
                                            </div>

                                            <div className="ao-tags">
                                                <span className={`ao-tag ${STATUS_TONE[transfer.status] || ""}`}>
                                                    {transfer.status}
                                                </span>
                                                <span className="ao-tag">
                                                    {formatDate(transfer.transferDate)}
                                                </span>
                                            </div>

                                            {transfer.reason && (
                                                <p className="ao-note">{transfer.reason}</p>
                                            )}
                                        </div>

                                        <div className="ao-actions">
                                            {next && (
                                                <button
                                                    type="button"
                                                    className="ao-btn sm ok"
                                                    onClick={() => handleAdvance(transfer)}
                                                >
                                                    {next.label}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="ao-btn sm"
                                                onClick={() => handleEditTransfer(transfer)}
                                            >
                                                Edit
                                            </button>
                                            {isAdmin() && (
                                                <button
                                                    type="button"
                                                    className="ao-btn sm danger"
                                                    onClick={() => handleDeleteTransfer(transfer.id)}
                                                >
                                                    Delete
                                                </button>
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
