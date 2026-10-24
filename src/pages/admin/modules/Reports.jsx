
import { useCallback, useEffect, useMemo, useState } from "react";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const INITIAL_CONFIG = {
    title: "Complete Shelter Report",
    reportType: "all",
    species: "all",
    includeAnimals: true,
    dateRange: "all",
    // Used when dateRange is "custom" (YYYY-MM-DD)
    fromDate: "",
    toDate: "",
    includeMedical: true,
    includeVaccinations: true,
    includeAdoptions: true,
    includeFoster: true,
    includeLostFound: true,
    format: "csv",
};

function normalizeReports(value) {
    if (!Array.isArray(value)) return [];

    return value.filter(
        (report) =>
            report !== null &&
            typeof report === "object" &&
            !Array.isArray(report)
    );
}

function getToken() {
    return localStorage.getItem("token");
}

function getSafeFilename(value) {
    return (
        String(value || "rescuebase_report")
            .replace(/[^a-z0-9]+/gi, "_")
            .replace(/^_+|_+$/g, "") || "rescuebase_report"
    );
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Allow the browser to start the download before releasing the URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readError(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        const data = await response.json().catch(() => ({}));
        return data.message || data.error || "Request failed.";
    }

    return (await response.text().catch(() => "")) || "Request failed.";
}

export default function Reports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [config, setConfig] = useState({ ...INITIAL_CONFIG });

    // Keep malformed API responses and undefined entries out of the UI.
    const validReports = useMemo(
        () => normalizeReports(reports),
        [reports]
    );

    // all generated reports are ZIP files, but some may be drafts and some finalized.
    const generatedReports = useMemo(
        () => validReports.filter((report) => report.exportFormat === "zip"),
        [validReports]
    );

    const finalizedReports = useMemo(
        () =>
            generatedReports.filter(
                (report) => report.status === "finalized"
            ).length,
        [generatedReports]
    );

    const draftReports = useMemo(
        () =>
            generatedReports.filter(
                (report) => report.status === "draft"
            ).length,
        [generatedReports]
    );

    const [listFilter, setListFilter] = useState("all");
    const [listSearch, setListSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [speciesFilter, setSpeciesFilter] = useState("all");

    const requestJson = useCallback(async (url, options = {}) => {
        const token = getToken();

        const response = await fetch(url, {
            ...options,
            headers: {
                ...(options.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(options.headers || {}),
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message || data.error || "Request failed."
            );
        }

        return data;
    }, []);

    const loadReports = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const data = await requestJson(`${API}/api/reports`);

            setReports(normalizeReports(data?.reports));
        } catch (err) {
            console.error("Load reports error:", err);
            setError(err.message || "Failed to load reports.");
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, [requestJson]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    function updateConfig(key, value) {
        setConfig((current) => ({
            ...current,
            [key]: value,
            // No animal list = no dogs/cats split
            ...(key === "includeAnimals" && !value ? { species: "all" } : {}),
        }));
    }

    const speciesLocked = config.reportType === "all" && !config.includeAnimals;

    // The generate endpoint returns a ZIP file, not JSON.
    async function handleGenerateReport(event) {
        event.preventDefault();

        if (
            config.reportType === "all" &&
            ["includeAnimals", "includeMedical", "includeVaccinations", "includeAdoptions", "includeFoster", "includeLostFound"]
                .every((key) => !config[key])
        ) {
            setError("Pick at least one dataset to include.");
            return;
        }

        // Custom range: a start date is needed; no end date = that one day
        let body = config;

        if (config.dateRange === "custom") {
            if (!config.fromDate) {
                setError("Pick a date for the custom range.");
                return;
            }

            const toDate = config.toDate || config.fromDate;

            if (toDate < config.fromDate) {
                setError("The end date can't be before the start date.");
                return;
            }

            body = { ...config, toDate };
        }

        try {
            setGenerating(true);
            setError("");
            setSuccess("");

            const token = getToken();

            const response = await fetch(`${API}/api/reports/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token
                        ? { Authorization: `Bearer ${token}` }
                        : {}),
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(await readError(response));
            }

            const blob = await response.blob();

            if (blob.size === 0) {
                throw new Error("The server returned an empty report.");
            }

            const filename = `${getSafeFilename(config.title)}.zip`;
            downloadBlob(blob, filename);

            setSuccess(
                "Report generated and saved. Your ZIP download should begin shortly."
            );

            // Do not prepend data.report here. The generate endpoint
            // returns a ZIP blob, not a JSON object containing a report.
            //
            // Reload the saved reports in case the backend also persisted
            // a report record.
            await loadReports();
        } catch (err) {
            console.error("Generate report error:", err);
            setError(err.message || "Failed to generate report.");
        } finally {
            setGenerating(false);
        }
    }

    async function handleFinalizeReport(id) {
        if (!id) {
            setError("Cannot finalize a report without an ID.");
            return;
        }

        try {
            setError("");
            setSuccess("");

            const data = await requestJson(
                `${API}/api/reports/${id}/finalize`,
                { method: "PATCH" }
            );

            if (data?.report && typeof data.report === "object") {
                setReports((current) =>
                    normalizeReports(current).map((report) =>
                        report._id === id ? data.report : report
                    )
                );
            } else {
                // If the endpoint does not return the updated report,
                // fetch the current list instead.
                await loadReports();
            }

            setSuccess("Report finalized successfully.");
        } catch (err) {
            console.error("Finalize report error:", err);
            setError(err.message || "Failed to finalize report.");
        }
    }

    async function handleDownloadReport(report) {
        if (!report?._id) {
            setError("Cannot download a report without an ID.");
            return;
        }

        try {
            setError("");
            setSuccess("");

            const token = getToken();

            const response = await fetch(
                `${API}/api/reports/${report._id}/download`,
                {
                    headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : {},
                }
            );

            if (!response.ok) {
                throw new Error(await readError(response));
            }

            const blob = await response.blob();
            downloadBlob(blob, `${getSafeFilename(report.title)}.zip`);
        } catch (err) {
            console.error("Download report error:", err);
            setError(err.message || "Failed to download report.");
        }
    }

    async function handleDeleteReport(id) {
        if (!id) {
            setError("Cannot delete a report without an ID.");
            return;
        }

        const ok = window.rbConfirm
            ? await window.rbConfirm({
                title: "Delete this report?",
                message: "It will be removed from the list. This can't be undone.",
                confirmLabel: "Delete",
                danger: true,
            })
            : window.confirm("Delete this report permanently?");

        if (!ok) return;

        try {
            setError("");
            setSuccess("");

            await requestJson(`${API}/api/reports/${id}`, {
                method: "DELETE",
            });

            setReports((current) =>
                normalizeReports(current).filter(
                    (report) => report._id !== id
                )
            );

            setSuccess("Report deleted successfully.");
        } catch (err) {
            console.error("Delete report error:", err);
            setError(err.message || "Failed to delete report.");
        }
    }

    const DATE_RANGES = [
        { value: "all", label: "All records" },
        { value: "current-year", label: "This year" },
        { value: "current-month", label: "This month" },
        { value: "custom", label: "Custom range" },
    ];

    const REPORT_TYPES = [
        { value: "all", label: "Complete shelter report", short: "Complete" },
        { value: "animals", label: "Animals", short: "Animals" },
        { value: "medical", label: "Medical records", short: "Medical" },
        { value: "vaccinations", label: "Vaccinations", short: "Vaccinations" },
        { value: "adoption", label: "Adoption applications", short: "Adoptions" },
        { value: "foster", label: "Foster assignments", short: "Foster" },
        { value: "lost-found", label: "Lost and found reports", short: "Lost & Found" },
    ];

    const SPECIES = [
        { value: "all", label: "Dogs & cats" },
        { value: "dog", label: "Dogs only" },
        { value: "cat", label: "Cats only" },
    ];

    const SPECIES_TAG = { all: "Dogs & cats", dog: "Dogs", cat: "Cats" };

    const typeShort = (type) =>
        REPORT_TYPES.find((item) => item.value === type)?.short || "Complete";

    const reportSpecies = (report) =>
        report.species || report.datasets?.species || "all";

    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

    const DATASETS = [
        { key: "includeAnimals", label: "Animals" },
        { key: "includeMedical", label: "Medical" },
        { key: "includeVaccinations", label: "Vaccinations" },
        { key: "includeAdoptions", label: "Adoptions" },
        { key: "includeFoster", label: "Foster" },
        { key: "includeLostFound", label: "Lost & Found" },
    ];

    const COUNT_LABELS = {
        animals: "animals",
        medical_records: "medical",
        vaccinations: "vaccinations",
        adoption_applications: "adoptions",
        foster_assignments: "fosters",
        lost_found_reports: "lost & found",
    };

    const now = new Date();
    const thisMonthCount = generatedReports.filter((report) => {
        const created = report.createdAt ? new Date(report.createdAt) : null;
        return (
            created &&
            created.getFullYear() === now.getFullYear() &&
            created.getMonth() === now.getMonth()
        );
    }).length;

    const searchTerm = listSearch.trim().toLowerCase();

    const shownReports = generatedReports.filter((report) => {
        if (listFilter !== "all" && (report.status || "draft") !== listFilter) return false;
        if (typeFilter !== "all" && (report.type || "all") !== typeFilter) return false;
        if (speciesFilter !== "all" && reportSpecies(report) !== speciesFilter) return false;
        if (!searchTerm) return true;

        return [report.title, report.createdByName]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(searchTerm));
    });

    const statusCount = (status) =>
        generatedReports.filter((report) => (report.status || "draft") === status).length;

    return (
        <section className="rp-page rp2-page">
            <div className="um-strip rp2-strip">
                <div className="um-strip-total">
                    <b>{generatedReports.length}</b>
                    <small>Total reports</small>
                </div>
                <div>
                    <small>Finalized</small>
                    <b>{finalizedReports}</b>
                </div>
                <div>
                    <small>Drafts</small>
                    <b>{draftReports}</b>
                </div>
                <div>
                    <small>This month</small>
                    <b>{thisMonthCount}</b>
                </div>
            </div>

            {error && (
                <p className="gs-alert error" role="alert">
                    {error}
                </p>
            )}

            {success && (
                <p className="gs-alert success" role="status" aria-live="polite">
                    {success}
                </p>
            )}

            <div className="rp2-grid">
                {/* Create new report */}
                <form className="rp2-card rp2-form" onSubmit={handleGenerateReport}>
                    <h3>Create new report</h3>
                    <p className="rp2-sub">Downloads as a ZIP with one CSV file per dataset.</p>

                    <label className="rp2-label" htmlFor="rp2-type">Report type</label>
                    <select
                        id="rp2-type"
                        className="rp2-select"
                        value={config.reportType}
                        onChange={(event) => updateConfig("reportType", event.target.value)}
                    >
                        {REPORT_TYPES.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>

                    <span className="rp2-label">Animals</span>
                    <div
                        className={`rp2-seg${speciesLocked ? " is-disabled" : ""}`}
                        role="radiogroup"
                        aria-label="Animals"
                        aria-disabled={speciesLocked}
                    >
                        {SPECIES.map((item) => (
                            <button
                                type="button"
                                key={item.value}
                                role="radio"
                                aria-checked={config.species === item.value}
                                className={config.species === item.value ? "on" : ""}
                                disabled={speciesLocked}
                                onClick={() => updateConfig("species", item.value)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    {speciesLocked && (
                        <p className="rp2-hint">Check "Animals" under Include to pick dogs or cats.</p>
                    )}

                    <label className="rp2-label" htmlFor="rp2-range">Date range</label>
                    <select
                        id="rp2-range"
                        className="rp2-select"
                        value={config.dateRange}
                        onChange={(event) => updateConfig("dateRange", event.target.value)}
                    >
                        {DATE_RANGES.map((range) => (
                            <option key={range.value} value={range.value}>
                                {range.label}
                            </option>
                        ))}
                    </select>

                    {config.dateRange === "custom" && (
                        <div className="rp2-dates">
                            <label>
                                <span>From</span>
                                <input
                                    type="date"
                                    className="rp2-input"
                                    value={config.fromDate}
                                    max={today}
                                    required
                                    onChange={(event) => updateConfig("fromDate", event.target.value)}
                                />
                            </label>

                            <label>
                                <span>To <small>(optional)</small></span>
                                <input
                                    type="date"
                                    className="rp2-input"
                                    value={config.toDate}
                                    min={config.fromDate || undefined}
                                    max={today}
                                    onChange={(event) => updateConfig("toDate", event.target.value)}
                                />
                            </label>
                        </div>
                    )}

                    {config.reportType === "all" && (
                        <>
                            <span className="rp2-label">Include</span>
                            <div className="rp2-checks">
                                {DATASETS.map((item) => (
                                    <label className="rp2-check" key={item.key}>
                                        <input
                                            type="checkbox"
                                            checked={config[item.key]}
                                            onChange={() => updateConfig(item.key, !config[item.key])}
                                        />
                                        <i aria-hidden="true" />
                                        {item.label}
                                    </label>
                                ))}
                            </div>
                            {DATASETS.every((item) => !config[item.key]) && (
                                <p className="rp2-hint rp2-warn">Pick at least one to include.</p>
                            )}
                        </>
                    )}

                    <label className="rp2-label" htmlFor="rp2-title">Report title</label>
                    <input
                        id="rp2-title"
                        type="text"
                        className="rp2-input"
                        value={config.title}
                        maxLength={160}
                        required
                        onChange={(event) => updateConfig("title", event.target.value)}
                    />

                    <button type="submit" className="rp2-generate" disabled={generating}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                            <path d="M12 3v12M6 11l6 6 6-6M4 21h16" />
                        </svg>
                        {generating ? "Generating..." : "Generate report"}
                    </button>
                </form>

                {/* Generated reports */}
                <section className="rp2-card">
                    <div className="rp2-head">
                        <h3>Generated reports</h3>

                        <div className="rp2-chips">
                            {[
                                ["all", "All", generatedReports.length],
                                ["finalized", "Finalized", statusCount("finalized")],
                                ["draft", "Drafts", statusCount("draft")],
                            ].map(([value, label, count]) => (
                                <button
                                    type="button"
                                    key={value}
                                    className={listFilter === value ? "on" : ""}
                                    onClick={() => setListFilter(value)}
                                >
                                    {label}
                                    <em>{count}</em>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rp2-tools">
                        <label className="rp2-search">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                type="search"
                                value={listSearch}
                                placeholder="Search report name or author..."
                                onChange={(event) => setListSearch(event.target.value)}
                            />
                        </label>

                        <select
                            className="rp2-select"
                            value={typeFilter}
                            aria-label="Filter by type"
                            onChange={(event) => setTypeFilter(event.target.value)}
                        >
                            <option value="all">All types</option>
                            {REPORT_TYPES.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.short}
                                </option>
                            ))}
                        </select>

                        <select
                            className="rp2-select"
                            value={speciesFilter}
                            aria-label="Filter by animals"
                            onChange={(event) => setSpeciesFilter(event.target.value)}
                        >
                            <option value="all">All animals</option>
                            <option value="dog">Dogs</option>
                            <option value="cat">Cats</option>
                        </select>
                    </div>

                    {loading ? (
                        <p className="rp-empty">
                            <span className="ao-spinner" /> Loading reports...
                        </p>
                    ) : shownReports.length === 0 ? (
                        <p className="rp-empty">
                            {generatedReports.length === 0
                                ? "No reports yet. Generate one and it will be saved here."
                                : "No reports match your search or filters."}
                        </p>
                    ) : (
                        <div className="rp2-table-wrap">
                            <table className="rp2-table">
                                <thead>
                                    <tr>
                                        <th>Report name</th>
                                        <th>Type</th>
                                        <th>Date range</th>
                                        <th>Generated by</th>
                                        <th>Status</th>
                                        <th className="rp2-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownReports.map((report) => {
                                        const status = report.status || "draft";
                                        const speciesKey = reportSpecies(report);
                                        const counts =
                                            report.recordCounts && typeof report.recordCounts === "object"
                                                ? Object.entries(report.recordCounts)
                                                : [];
                                        const createdAt = report.createdAt ? new Date(report.createdAt) : null;
                                        const createdLabel =
                                            createdAt && !Number.isNaN(createdAt.getTime())
                                                ? createdAt.toLocaleString("en-PH", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })
                                                : "";

                                        return (
                                            <tr key={report._id}>
                                                <td>
                                                    <b>{report.title || "Untitled report"}</b>
                                                    {counts.length > 0 && (
                                                        <div className="rp2-counts">
                                                            {counts.map(([key, value]) => (
                                                                <span key={key}>
                                                                    {COUNT_LABELS[key] || key.replaceAll("_", " ")} {value}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <b className="rp2-type">{typeShort(report.type)}</b>
                                                    <span className={`rp2-species is-${speciesKey}`}>
                                                        {SPECIES_TAG[speciesKey] || "Dogs & cats"}
                                                    </span>
                                                </td>
                                                <td>{report.period || "All records"}</td>
                                                <td>
                                                    <b>{report.createdByName || "Unknown"}</b>
                                                    <small className="rp2-muted">{createdLabel}</small>
                                                </td>
                                                <td>
                                                    <span className={`rp2-pill ${status}`}>
                                                        {status === "finalized" ? "Finalized" : "Draft"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="rp2-actions">
                                                        {status === "draft" && (
                                                            <button
                                                                type="button"
                                                                className="rp2-mini"
                                                                onClick={() => handleFinalizeReport(report._id)}
                                                            >
                                                                Finalize
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="rp2-icon"
                                                            title="Download ZIP"
                                                            aria-label={`Download ${report.title || "report"}`}
                                                            onClick={() => handleDownloadReport(report)}
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                                                <path d="M12 3v12M6 11l6 6 6-6M4 21h16" />
                                                            </svg>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="rp2-icon is-danger"
                                                            title="Delete"
                                                            aria-label={`Delete ${report.title || "report"}`}
                                                            onClick={() => handleDeleteReport(report._id)}
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                                                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && generatedReports.length > 0 && (
                        <p className="rp2-foot">
                            Showing {shownReports.length} of {generatedReports.length}
                        </p>
                    )}
                </section>
            </div>
        </section>
    );
}
