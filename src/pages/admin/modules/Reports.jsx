
import { useCallback, useEffect, useMemo, useState } from "react";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const INITIAL_CONFIG = {
    title: "Complete Shelter Report",
    reportType: "all",
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
        }));
    }

    // The generate endpoint returns a ZIP file, not JSON.
    async function handleGenerateReport(event) {
        event.preventDefault();

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
        { value: "custom", label: "Custom" },
    ];

    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

    const DATASETS = [
        { key: "includeMedical", label: "Medical records" },
        { key: "includeVaccinations", label: "Vaccination records" },
        { key: "includeAdoptions", label: "Adoption applications" },
        { key: "includeFoster", label: "Foster assignments" },
        { key: "includeLostFound", label: "Lost and found reports" },
    ];

    const COUNT_LABELS = {
        animals: "animals",
        medical_records: "medical",
        vaccinations: "vaccinations",
        adoption_applications: "adoptions",
        foster_assignments: "fosters",
        lost_found_reports: "lost & found",
    };

    const shownReports =
        listFilter === "all"
            ? generatedReports
            : generatedReports.filter((report) => report.status === listFilter);

    return (
        <section className="rp-page">
            <div className="rp-strip">
                <div>
                    <small>Total reports</small>
                    <b>{generatedReports.length}</b>
                </div>
                <div>
                    <small>Finalized</small>
                    <b>{finalizedReports}</b>
                    <em>locked, ready to share</em>
                </div>
                <div>
                    <small>Drafts</small>
                    <b>{draftReports}</b>
                    <em>can still be finalized</em>
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

            <div className="rp-grid">
                {/* New report */}
                <form className="gs-card rp-form" onSubmit={handleGenerateReport}>
                    <h3>
                        <span className="gs-mark">New report</span>
                    </h3>
                    <p className="rp-sub">Creates a ZIP with one CSV file per dataset.</p>

                    <label className="gs-field">
                        Report title
                        <input
                            type="text"
                            value={config.title}
                            maxLength={160}
                            required
                            onChange={(event) => updateConfig("title", event.target.value)}
                        />
                    </label>

                    <div className="rp-label">Date range</div>
                    <div className="rp-seg" role="radiogroup" aria-label="Date range">
                        {DATE_RANGES.map((range) => (
                            <button
                                type="button"
                                key={range.value}
                                role="radio"
                                aria-checked={config.dateRange === range.value}
                                className={config.dateRange === range.value ? "on" : ""}
                                onClick={() => updateConfig("dateRange", range.value)}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>

                    {config.dateRange === "custom" && (
                        <div className="rp-dates">
                            <label className="gs-field">
                                From
                                <input
                                    type="date"
                                    value={config.fromDate}
                                    max={today}
                                    required
                                    onChange={(event) => updateConfig("fromDate", event.target.value)}
                                />
                            </label>

                            <label className="gs-field">
                                <span>
                                    To <small>(optional)</small>
                                </span>
                                <input
                                    type="date"
                                    value={config.toDate}
                                    min={config.fromDate || undefined}
                                    max={today}
                                    onChange={(event) => updateConfig("toDate", event.target.value)}
                                />
                            </label>

                            <p className="rp-hint rp-dates-hint">
                                Leave "To" empty to get one specific day only.
                            </p>
                        </div>
                    )}

                    <div className="rp-label">Include</div>
                    <div className="rp-checks">
                        {DATASETS.map((item) => (
                            <button
                                type="button"
                                key={item.key}
                                role="checkbox"
                                aria-checked={config[item.key]}
                                className={`rp-check ${config[item.key] ? "on" : ""}`}
                                onClick={() => updateConfig(item.key, !config[item.key])}
                            >
                                <i aria-hidden="true" />
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <p className="rp-hint">Animal profiles are always included.</p>

                    <button type="submit" className="gs-btn primary rp-generate" disabled={generating}>
                        {generating ? "Generating..." : "Generate report"}
                    </button>
                </form>

                {/* Generated reports */}
                <section className="gs-card">
                    <div className="rp-list-head">
                        <h3>
                            <span className="gs-mark">Generated reports</span>
                        </h3>

                        <div className="rp-filters">
                            {[
                                ["all", "All"],
                                ["finalized", "Finalized"],
                                ["draft", "Drafts"],
                            ].map(([value, label]) => (
                                <button
                                    type="button"
                                    key={value}
                                    className={listFilter === value ? "on" : ""}
                                    onClick={() => setListFilter(value)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <p className="rp-empty">
                            <span className="ao-spinner" /> Loading reports...
                        </p>
                    ) : shownReports.length === 0 ? (
                        <p className="rp-empty">
                            {generatedReports.length === 0
                                ? "No reports yet. Generate one and it will be saved here."
                                : "No reports match this filter."}
                        </p>
                    ) : (
                        <div className="rp-list">
                            {shownReports.map((report) => {
                                const status = report.status || "draft";
                                const counts =
                                    report.recordCounts && typeof report.recordCounts === "object"
                                        ? Object.entries(report.recordCounts)
                                        : [];
                                const createdAt = report.createdAt ? new Date(report.createdAt) : null;

                                return (
                                    <article className="rp-row" key={report._id}>
                                        <div>
                                            <h4>
                                                {report.title || "Untitled report"}
                                                <span className={`rp-pill ${status}`}>
                                                    {status === "finalized" ? "Finalized" : "Draft"}
                                                </span>
                                            </h4>

                                            <p className="rp-meta">
                                                {report.period || "All records"}
                                                {" · by "}
                                                {report.createdByName || "Unknown"}
                                                {createdAt && !Number.isNaN(createdAt.getTime())
                                                    ? ` · ${createdAt.toLocaleString("en-PH", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    })}`
                                                    : ""}
                                            </p>

                                            {counts.length > 0 && (
                                                <div className="rp-counts">
                                                    {counts.map(([key, value]) => (
                                                        <span key={key}>
                                                            {COUNT_LABELS[key] || key.replaceAll("_", " ")} {value}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="rp-actions">
                                            {status === "draft" && (
                                                <button
                                                    type="button"
                                                    className="gs-btn ghost"
                                                    onClick={() => handleFinalizeReport(report._id)}
                                                >
                                                    Finalize
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className="gs-btn rp-download"
                                                onClick={() => handleDownloadReport(report)}
                                            >
                                                Download ZIP
                                            </button>

                                            <button
                                                type="button"
                                                className="gs-btn rp-delete"
                                                onClick={() => handleDeleteReport(report._id)}
                                            >
                                                Delete
                                            </button>
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
