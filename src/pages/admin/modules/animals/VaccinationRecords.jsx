import { useEffect, useMemo, useRef, useState } from "react";
import { isAdmin } from "../../../../utils/auth";
import InfoTip from "../../../../components/system/InfoTip";


// Styled confirm popup + toast from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

function notify(text, tone = "success") {
    if (window.rbToast) {
        window.rbToast(text, tone);
    } else {
        window.alert(text);
    }
}

function notifyErr(text) {
    notify(text, "error");
}

const API_VACCINATIONS = `${import.meta.env.VITE_BACKEND_URL}/api/vaccinations`;

// Calls the backend with the login token; throws the server's message on failure
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

// Database record -> the shape this page already uses
function fromApi(record) {
    return {
        id: record._id,
        animalId: record.animal_id?._id || record.animal_id || "",
        animalName: record.animal_id?.name || "(deleted animal)",
        vaccineName: record.vaccine_name || "",
        veterinarian: record.veterinarian || "",
        vaccinationDate: String(record.vaccination_date || "").slice(0, 10),
        nextDueDate: String(record.next_due_date || "").slice(0, 10),
        status: record.status || "Completed",
        notes: record.notes || "",
    };
}

// Form -> what the backend expects
function toApi(form, animalId) {
    return {
        animal_id: animalId,
        vaccine_name: form.vaccineName,
        veterinarian: form.veterinarian,
        vaccination_date: form.vaccinationDate,
        next_due_date: form.nextDueDate || null,
        status: form.status,
        notes: form.notes,
    };
}

const API_ANIMALS = `${import.meta.env.VITE_BACKEND_URL}/api/animals`;

const COMMON_VACCINES = ["Anti-Rabies", "5-in-1 (DHPP)", "4-in-1 (FVRCP)", "Deworming"];

const STATUS_OPTIONS = [
    { value: "Completed", label: "Completed" },
    { value: "Pending", label: "Pending" },
    { value: "Overdue", label: "Overdue" },
];

const SEARCH_FIELDS = {
    animal: (v) => v.animalName,
    vaccine: (v) => v.vaccineName,
    vet: (v) => v.veterinarian,
    notes: (v) => v.notes,
};

const SEARCH_BY_OPTIONS = [
    { value: "all", label: "All fields" },
    { value: "animal", label: "Animal name" },
    { value: "vaccine", label: "Vaccine" },
    { value: "vet", label: "Veterinarian" },
    { value: "notes", label: "Notes" },
];

const DEFAULT_FILTERS = {
    searchBy: "all",
    search: "",
    vaccine: "All",
    sort: "due",
    species: "All",
};

// ---------- Date helpers ----------

function todayISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().slice(0, 10);
}

function parseLocal(value) {
    return value ? new Date(`${value}T00:00:00`) : null;
}

// "2026-06-20" → "Jun 20, 2026"; empty → "—"
function formatVaccineDate(value) {
    if (!value) return "—";

    const date = parseLocal(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function daysUntil(value) {
    const date = parseLocal(value);
    if (!date) return null;
    return Math.round((date - parseLocal(todayISO())) / 86400000);
}

// overdue | soon | ok | none — what the list should warn about
function getDueState(vaccination) {
    const days = daysUntil(vaccination.nextDueDate);

    if (vaccination.status === "Overdue" || (days !== null && days < 0)) return "overdue";
    if (vaccination.status === "Pending" || (days !== null && days <= 30)) return "soon";
    if (days !== null) return "ok";
    return "none";
}

function dueText(vaccination) {
    const state = getDueState(vaccination);
    const days = daysUntil(vaccination.nextDueDate);

    if (state === "overdue") {
        return days !== null && days < 0
            ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
            : "Overdue";
    }
    if (state === "soon") {
        if (days === null) return "Scheduled";
        if (days === 0) return "Due today";
        return `Due in ${days} day${days === 1 ? "" : "s"}`;
    }
    if (state === "ok") return "Up to date";
    return "One-time vaccine";
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
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    alert: (
        <>
            <path d="M12 3 2 21h20z" />
            <path d="M12 10v4M12 17.5v.01" />
        </>
    ),
    syringe: (
        <path d="m18 2 4 4M17 7l3-3M19 9 8.7 19.3a2.4 2.4 0 0 1-3.4 0l-.6-.6a2.4 2.4 0 0 1 0-3.4L15 5M9 11l4 4M5 19l-3 3" />
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

export default function VaccinationRecords({ lockedAnimal = null, filterAnimal = null, onClearFilter }) {
    const blankForm = {
        animalName: lockedAnimal?.name || filterAnimal?.name || "",
        vaccineName: "",
        veterinarian: "",
        vaccinationDate: "",
        nextDueDate: "",
        status: "Completed",
        notes: "",
    };

    const [vaccinations, setVaccinations] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [vaccinationForm, setVaccinationForm] = useState(blankForm);
    const [tab, setTab] = useState(lockedAnimal || filterAnimal ? "all" : "unvaccinated");
    const [animals, setAnimals] = useState([]);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    const formRef = useRef(null);
    const listRef = useRef(null);

    // Existing animals: used for the Animal dropdown and the "Not Vaccinated" tab
    useEffect(() => {
        if (lockedAnimal) return;
        fetch(API_ANIMALS)
            .then((response) => response.json())
            .then((data) => setAnimals(data.animals || []))
            .catch(() => setAnimals([]));
        }, [lockedAnimal]);

    // Vaccination records saved in the database
    async function loadVaccinations() {
        try {
            const data = await apiRequest(API_VACCINATIONS);
            setVaccinations((data.vaccinations || []).map(fromApi));
        } catch (error) {
            notifyErr(error.message || "Couldn't load vaccination records.");
        }
    }

    useEffect(() => {
        loadVaccinations();
    }, []);

    function updateField(name, value) {
        setVaccinationForm((current) => ({ ...current, [name]: value }));
    }

    function resetForm() {
        setEditingId(null);
        setVaccinationForm(blankForm);
    }

        // Animal name in the form -> the animal's database ID
    function findAnimalId(name) {
        if (lockedAnimal) return lockedAnimal._id;

        const match = animals.find((animal) => animal.name === name);
        if (match) return match._id;

        // Editing an old record whose animal is not in the list anymore
        return vaccinations.find((v) => v.id === editingId)?.animalId || "";
    }

    async function handleAddVaccination(e) {
        e.preventDefault();

        const animalId = findAnimalId(vaccinationForm.animalName);

        if (!animalId) {
            notifyErr("Pick an animal from Animal Profiles.");
            return;
        }

        try {
            if (editingId) {
                await apiRequest(`${API_VACCINATIONS}/${editingId}`, {
                    method: "PATCH",
                    body: JSON.stringify(toApi(vaccinationForm, animalId)),
                });
                notify("Vaccination record updated");
            } else {
                await apiRequest(API_VACCINATIONS, {
                    method: "POST",
                    body: JSON.stringify(toApi(vaccinationForm, animalId)),
                });
                notify("Vaccination record saved");
            }

            resetForm();
            await loadVaccinations();
        } catch (error) {
            notifyErr(error.message || "Couldn't save the vaccination record.");
        }
    }

    function handleEditVaccination(vaccination) {
        setEditingId(vaccination.id);

        setVaccinationForm({
            animalName: vaccination.animalName,
            vaccineName: vaccination.vaccineName,
            veterinarian: vaccination.veterinarian,
            vaccinationDate: vaccination.vaccinationDate,
            nextDueDate: vaccination.nextDueDate,
            status: vaccination.status,
            notes: vaccination.notes,
        });

        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

        // Records that the dose was given today and keeps the same booster interval.
    async function handleMarkGiven(vaccination) {
        const today = todayISO();
        let nextDueDate = "";

        if (vaccination.vaccinationDate && vaccination.nextDueDate) {
            const gap = parseLocal(vaccination.nextDueDate) - parseLocal(vaccination.vaccinationDate);
            if (gap > 0) {
                const next = new Date(parseLocal(today).getTime() + gap);
                const offset = next.getTimezoneOffset() * 60000;
                nextDueDate = new Date(next - offset).toISOString().slice(0, 10);
            }
        }

        try {
            await apiRequest(`${API_VACCINATIONS}/${vaccination.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    status: "Completed",
                    vaccination_date: today,
                    next_due_date: nextDueDate || null,
                }),
            });
            notify(`${vaccination.animalName} marked as vaccinated`);
            await loadVaccinations();
        } catch (error) {
            notifyErr(error.message || "Couldn't update the vaccination record.");
        }
    }

    async function handleDeleteVaccination(id) {
        if (!isAdmin()) {
            notifyErr("Only administrators can delete vaccination records.");
            return;
        }

        if (!await askConfirm({ title: "Delete this vaccination record?", message: "This can't be undone.", confirmLabel: "Delete", danger: true })) return;

        try {
            await apiRequest(`${API_VACCINATIONS}/${id}`, { method: "DELETE" });
            setVaccinations((current) => current.filter((vaccination) => vaccination.id !== id));
            notify("Vaccination record deleted");

            if (editingId === id) resetForm();
        } catch (error) {
            notifyErr(error.message || "Couldn't delete the vaccination record.");
        }
    }

    // ---------- Stats, tabs, filtering ----------

    const scoped = useMemo(
        () =>
            lockedAnimal
                ? vaccinations.filter((v) => v.animalName === lockedAnimal.name)
                : filterAnimal
                    ? vaccinations.filter((v) => v.animalId === filterAnimal._id || v.animalName === filterAnimal.name)
                    : vaccinations,
        [vaccinations, lockedAnimal, filterAnimal]
    );

    const counts = useMemo(() => {
        const result = { overdue: 0, soon: 0, ok: 0, none: 0 };
        scoped.forEach((v) => {
            result[getDueState(v)] += 1;
        });
        return result;
    }, [scoped]);

    const stats = useMemo(() => {
        const now = parseLocal(todayISO());
        const vaccineCounts = {};
        let top = null;

        scoped.forEach((v) => {
            if (!v.vaccineName) return;
            vaccineCounts[v.vaccineName] = (vaccineCounts[v.vaccineName] || 0) + 1;
            if (!top || vaccineCounts[v.vaccineName] > vaccineCounts[top]) top = v.vaccineName;
        });

        return {
            // Distinct pets whose next dose falls in next calendar month
            dueNextMonth: new Set(
                scoped
                    .filter((v) => {
                        const d = parseLocal(v.nextDueDate);
                        if (!d) return false;
                        const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                        return (
                            d.getMonth() === next.getMonth() &&
                            d.getFullYear() === next.getFullYear()
                        );
                    })
                    .map((v) => String(v.animalName).trim().toLowerCase())
            ).size,
            givenThisMonth: scoped.filter((v) => {
                const d = parseLocal(v.vaccinationDate);
                return (
                    d &&
                    v.status === "Completed" &&
                    d.getMonth() === now.getMonth() &&
                    d.getFullYear() === now.getFullYear()
                );
            }).length,
            topVaccine: top ? { value: top, count: vaccineCounts[top] } : null,
        };
    }, [scoped]);

    const vaccineOptions = useMemo(
        () => [...new Set(scoped.map((v) => v.vaccineName).filter(Boolean))].sort(),
        [scoped]
    );

    const animalNames = useMemo(
        () => [...new Set(animals.map((a) => a.name).filter(Boolean))].sort(),
        [animals]
    );

    // Dogs & cats with no completed vaccination on record
    const unvaccinated = useMemo(() => {
        const vaccinated = new Set(
            vaccinations
                .filter((v) => v.status === "Completed")
                .map((v) => String(v.animalName).trim().toLowerCase())
        );
        return animals
            .filter((a) => a.type === "Dog" || a.type === "Cat")
            .filter((a) => !vaccinated.has(String(a.name).trim().toLowerCase()))
            .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }, [animals, vaccinations]);

    const filteredUnvaccinated = useMemo(
        () =>
            unvaccinated.filter(
                (a) =>
                    String(a.name).toLowerCase().includes(filters.search.trim().toLowerCase()) &&
                    (filters.species === "All" || a.type === filters.species)
            ),
        [unvaccinated, filters]
    );

    const tabRecords = useMemo(() => {
        if (tab === "overdue") return scoped.filter((v) => getDueState(v) === "overdue");
        if (tab === "soon") return scoped.filter((v) => getDueState(v) === "soon");
        if (tab === "completed") return scoped.filter((v) => v.status === "Completed");
        return scoped;
    }, [scoped, tab]);

    const filteredVaccinations = useMemo(() => {
        const list = tabRecords.filter(
            (v) =>
                matchesSearch(v, filters.search, filters.searchBy, SEARCH_FIELDS) &&
                (filters.vaccine === "All" || v.vaccineName === filters.vaccine)
        );

        const time = (value, fallback) => (value ? parseLocal(value).getTime() : fallback);

        return [...list].sort((a, b) => {
            if (filters.sort === "given") {
                return time(b.vaccinationDate, 0) - time(a.vaccinationDate, 0);
            }
            if (filters.sort === "name") return a.animalName.localeCompare(b.animalName);
            return time(a.nextDueDate, Infinity) - time(b.nextDueDate, Infinity);
        });
    }, [tabRecords, filters]);

    function setFilter(key, value) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    const tabs = [
        ...(lockedAnimal || filterAnimal
            ? []
            : [{ value: "unvaccinated", label: "Not Vaccinated", count: unvaccinated.length }]),
        { value: "all", label: "All" },
        { value: "overdue", label: "Overdue", count: counts.overdue },
        { value: "soon", label: "Due Soon", count: counts.soon },
        { value: "completed", label: "Completed" },
    ];

    const isCustomVaccine =
        vaccinationForm.vaccineName !== "" && !COMMON_VACCINES.includes(vaccinationForm.vaccineName);

    return (
        <section className={`ao-page${lockedAnimal ? " ao-embedded" : ""}`}>
            {!lockedAnimal && (
                <StatsStrip
                    highlight={{
                        value: unvaccinated.length,
                        label:
                            unvaccinated.length === 1
                                ? "Dog or cat not vaccinated yet"
                                : "Dogs & cats not vaccinated yet",
                    }}
                    items={[
                        { icon: "alert", label: "Overdue", value: counts.overdue },
                        { icon: "clock", label: "Due in next 30 days", value: counts.soon },
                        { icon: "check", label: "Pets due next month", value: stats.dueNextMonth },
                    ]}
                />
            )}

            <div className="ao-layout">
                {/* ---------- FORM ---------- */}
                <section className="ao-card ao-form-card" ref={formRef}>
                    <h2>{editingId ? "Edit Vaccination" : "Record Vaccination"}</h2>
                    <p className="ao-hint">Log a vaccine given, and set when the next dose is due.</p>

                    <form className="ao-form" onSubmit={handleAddVaccination}>
                        <label className="ao-field">
                            <span>Animal <span className="ao-req">*</span></span>
                            {lockedAnimal ? (
                                <input type="text" value={vaccinationForm.animalName} readOnly />
                            ) : (
                                <select
                                    value={vaccinationForm.animalName}
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
                                    {vaccinationForm.animalName &&
                                        !animalNames.includes(vaccinationForm.animalName) && (
                                            <option value={vaccinationForm.animalName}>
                                                {vaccinationForm.animalName} (not in Animal Profiles)
                                            </option>
                                        )}
                                </select>
                            )}
                        </label>

                        <div className="ao-field">
                            <span>Vaccine <span className="ao-req">*</span></span>
                            <ChipGroup
                                options={COMMON_VACCINES.map((name) => ({ value: name, label: name }))}
                                value={vaccinationForm.vaccineName}
                                onChange={(value) => updateField("vaccineName", value)}
                            />
                            <input
                                type="text"
                                value={isCustomVaccine ? vaccinationForm.vaccineName : ""}
                                onChange={(e) => updateField("vaccineName", e.target.value)}
                                placeholder="Other vaccine? Type it here"
                                required={!vaccinationForm.vaccineName}
                            />
                        </div>

                        <label className="ao-field">
                            <span>Veterinarian <span className="ao-req">*</span></span>
                            <input
                                type="text"
                                value={vaccinationForm.veterinarian}
                                onChange={(e) => updateField("veterinarian", e.target.value)}
                                placeholder="e.g. Dr. Santos"
                                required
                            />
                        </label>

                        <div className="ao-row2">
                            <label className="ao-field">
                                <span>Date Given <span className="ao-req">*</span></span>
                                <input
                                    type="date"
                                    value={vaccinationForm.vaccinationDate}
                                    onChange={(e) => updateField("vaccinationDate", e.target.value)}
                                    required
                                />
                            </label>

                            <label className="ao-field">
                                <span className="ao-label-tip">
                                    <span>Next Due <span className="ao-req">*</span></span>
                                    <InfoTip text="When the next dose or booster is due. It can't be earlier than the date given." />
                                </span>
                                <input
                                    type="date"
                                    value={vaccinationForm.nextDueDate}
                                    min={vaccinationForm.vaccinationDate || undefined}
                                    required
                                    onChange={(e) => updateField("nextDueDate", e.target.value)}
                                />
                            </label>
                        </div>

                        <div className="ao-field">
                            <span className="ao-label-tip">
                                <span>Status <span className="ao-req">*</span></span>
                                <InfoTip text="Completed: the vaccine was given. Pending: scheduled but not given yet. Overdue: the due date passed and it wasn't given." />
                            </span>
                            <ChipGroup
                                options={STATUS_OPTIONS}
                                value={vaccinationForm.status}
                                tone="green"
                                onChange={(value) => updateField("status", value)}
                            />
                        </div>

                        <label className="ao-field">
                            <span>Notes <span className="ao-req">*</span></span>
                            <textarea
                                value={vaccinationForm.notes}
                                onChange={(e) => updateField("notes", e.target.value)}
                                placeholder="Reactions, batch number, reminders..."
                                required
                            />
                        </label>

                        <div className="ao-form-actions">
                            <button type="submit" className="ao-btn primary">
                                {editingId ? "Update Vaccination" : "Save Vaccination"}
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
                        {lockedAnimal && <h2>Vaccination Records</h2>}
                        {filterAnimal && !lockedAnimal && (
                            <span className="ap-filter-chip">
                                Showing: {filterAnimal.name}
                                <button type="button" aria-label="Show all animals" onClick={onClearFilter}>✕</button>
                            </span>
                        )}
                        <Tabs tabs={tabs} value={tab} onChange={setTab} />
                    </div>

                    {tab === "unvaccinated" ? (
                        <>
                            <SearchToolbar
                                searchBy="all"
                                onSearchByChange={() => {}}
                                searchByOptions={[{ value: "all", label: "Animal name" }]}
                                search={filters.search}
                                onSearchChange={(value) => setFilter("search", value)}
                                placeholder="Search animal..."
                                filters={[
                                    {
                                        label: "Species",
                                        value: filters.species,
                                        onChange: (value) => setFilter("species", value),
                                        options: [
                                            { value: "All", label: "Dogs & cats" },
                                            { value: "Dog", label: "Dogs only" },
                                            { value: "Cat", label: "Cats only" },
                                        ],
                                    },
                                ]}
                                shown={filteredUnvaccinated.length}
                                total={unvaccinated.length}
                                noun="animals"
                                onClear={() => setFilters(DEFAULT_FILTERS)}
                            />

                            {unvaccinated.length === 0 ? (
                                <p className="ao-empty">
                                    Every dog and cat has at least one vaccine on record.
                                </p>
                            ) : filteredUnvaccinated.length === 0 ? (
                                <p className="ao-empty">No animals match your search.</p>
                            ) : (
                                <div className="ao-list">
                                    {filteredUnvaccinated.map((animal) => (
                                        <article key={animal._id} className="ao-item flag red">
                                            <div className="ao-avatar">
                                                {animal.image ? (
                                                    <img src={animal.image} alt="" />
                                                ) : animal.type === "Cat" ? (
                                                    "🐱"
                                                ) : (
                                                    "🐶"
                                                )}
                                            </div>
                                            <div>
                                                <h3>{animal.name}</h3>
                                                <div className="ao-meta">
                                                    {animal.type}
                                                    {animal.breed ? ` · ${animal.breed}` : ""}
                                                </div>
                                                <div className="ao-tags">
                                                    <span className="ao-tag red">No vaccine on record</span>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                    <SearchToolbar
                        searchBy={filters.searchBy}
                        onSearchByChange={(value) => setFilter("searchBy", value)}
                        searchByOptions={SEARCH_BY_OPTIONS}
                        search={filters.search}
                        onSearchChange={(value) => setFilter("search", value)}
                        placeholder="Search animal, vaccine, or vet..."
                        filters={[
                            {
                                label: "Vaccine",
                                value: filters.vaccine,
                                onChange: (value) => setFilter("vaccine", value),
                                options: [
                                    { value: "All", label: "All vaccines" },
                                    ...vaccineOptions.map((name) => ({ value: name, label: name })),
                                ],
                            },
                            {
                                label: "Sort",
                                value: filters.sort,
                                onChange: (value) => setFilter("sort", value),
                                options: [
                                    { value: "due", label: "Next due: soonest" },
                                    { value: "given", label: "Recently given" },
                                    { value: "name", label: "Animal A–Z" },
                                ],
                            },
                        ]}
                        shown={filteredVaccinations.length}
                        total={tabRecords.length}
                        noun="records"
                        onClear={() => setFilters(DEFAULT_FILTERS)}
                    />

                    {filteredVaccinations.length === 0 ? (
                        <p className="ao-empty">
                            {scoped.length === 0
                                ? "No vaccinations added yet."
                                : tab === "overdue" && tabRecords.length === 0
                                  ? "Nothing overdue. Every animal is on schedule."
                                  : "No vaccinations match your search."}
                        </p>
                    ) : (
                        <div className="ao-list">
                            {filteredVaccinations.map((vaccination) => {
                                const state = getDueState(vaccination);

                                return (
                                    <article
                                        key={vaccination.id}
                                        className={`ao-item ${state === "overdue" ? "flag red" : state === "soon" ? "flag" : ""}`}
                                    >
                                        <div className="ao-avatar">
                                            <Icon name="syringe" size={20} />
                                        </div>

                                        <div>
                                            <h3>
                                                {!lockedAnimal && vaccination.animalName}
                                                <span className="ao-subtle">
                                                    {!lockedAnimal && " · "}
                                                    {vaccination.vaccineName}
                                                </span>
                                            </h3>

                                            <div className="ao-meta">
                                                {vaccination.veterinarian || "No vet recorded"}
                                                {vaccination.notes ? ` · ${vaccination.notes}` : ""}
                                            </div>

                                            <div className="ao-timeline">
                                                <span>Given {formatVaccineDate(vaccination.vaccinationDate)}</span>
                                                {vaccination.nextDueDate && (
                                                    <>
                                                        <i />
                                                        <span>Due {formatVaccineDate(vaccination.nextDueDate)}</span>
                                                    </>
                                                )}
                                                <b className={`ao-due ${state}`}>{dueText(vaccination)}</b>
                                            </div>
                                        </div>

                                        <div className="ao-actions">
                                            {(state === "overdue" || state === "soon") && (
                                                <button
                                                    type="button"
                                                    className="ao-btn sm ok"
                                                    onClick={() => handleMarkGiven(vaccination)}
                                                >
                                                    Mark Given
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="ao-btn sm"
                                                onClick={() => handleEditVaccination(vaccination)}
                                            >
                                                Edit
                                            </button>
                                            {isAdmin() && (
                                                <button
                                                    type="button"
                                                    className="ao-btn sm danger"
                                                    onClick={() => handleDeleteVaccination(vaccination.id)}
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
                        </>
                    )}
                </section>
            </div>
        </section>
    );
}
