
import { useCallback, useEffect, useMemo, useState } from "react";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const INITIAL_CONFIG = {
    title: "Complete Shelter Report",
    reportType: "all",
    dateRange: "all",
    includeMedical: true,
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

    const finalizedReports = useMemo(
        () =>
            validReports.filter(
                (report) => report.status === "finalized"
            ).length,
        [validReports]
    );

    const draftReports = useMemo(
        () =>
            validReports.filter(
                (report) => report.status === "draft"
            ).length,
        [validReports]
    );

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
                body: JSON.stringify(config),
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
                "Report generated. Your CSV ZIP download should begin shortly."
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
            const filename = getSafeFilename(report.title);
            const extension =
                report.exportFormat === "zip" ? "zip" : "txt";

            downloadBlob(blob, `${filename}.${extension}`);
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

        if (!window.confirm("Delete this report permanently?")) {
            return;
        }

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

    return (
        <section className="admin-reports-page">
            {/* Summary cards */}
            <section className="admin-reports-stats">
                <article className="admin-panel admin-reports-stat-card">
                    <span>Total Reports</span>
                    <strong>{validReports.length}</strong>
                </article>

                <article className="admin-panel admin-reports-stat-card">
                    <span>Finalized Reports</span>
                    <strong>{finalizedReports}</strong>
                </article>

                <article className="admin-panel admin-reports-stat-card">
                    <span>Draft Reports</span>
                    <strong>{draftReports}</strong>
                </article>
            </section>

            <section className="admin-reports-grid">
                {/* Generate report */}
                <section className="admin-panel admin-reports-form-panel">
                    <div className="admin-panel-heading">
                        <h2>Generate Report</h2>
                    </div>

                    <form
                        className="admin-reports-form"
                        onSubmit={handleGenerateReport}
                    >
                        <label>
                            Report title
                            <input
                                type="text"
                                value={config.title}
                                maxLength={160}
                                onChange={(event) =>
                                    updateConfig("title", event.target.value)
                                }
                                required
                            />
                        </label>

                        <label>
                            Report type
                            <select
                                value={config.reportType}
                                onChange={(event) =>
                                    updateConfig(
                                        "reportType",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="all">
                                    Complete Shelter Report
                                </option>
                            </select>
                        </label>

                        <label>
                            Date range
                            <select
                                value={config.dateRange}
                                onChange={(event) =>
                                    updateConfig(
                                        "dateRange",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="all">
                                    All available records
                                </option>
                                <option value="current-year">
                                    Current year
                                </option>
                                <option value="current-month">
                                    Current month
                                </option>
                            </select>
                        </label>

                        <fieldset className="admin-reports-datasets">
                            <legend>Include datasets</legend>

                            <label className="admin-reports-checkbox">
                                <input
                                    type="checkbox"
                                    checked={config.includeMedical}
                                    onChange={(event) =>
                                        updateConfig(
                                            "includeMedical",
                                            event.target.checked
                                        )
                                    }
                                />
                                Medical and vaccination records
                            </label>

                            <label className="admin-reports-checkbox">
                                <input
                                    type="checkbox"
                                    checked={config.includeAdoptions}
                                    onChange={(event) =>
                                        updateConfig(
                                            "includeAdoptions",
                                            event.target.checked
                                        )
                                    }
                                />
                                Adoption applications
                            </label>

                            <label className="admin-reports-checkbox">
                                <input
                                    type="checkbox"
                                    checked={config.includeFoster}
                                    onChange={(event) =>
                                        updateConfig(
                                            "includeFoster",
                                            event.target.checked
                                        )
                                    }
                                />
                                Foster assignments
                            </label>

                            <label className="admin-reports-checkbox">
                                <input
                                    type="checkbox"
                                    checked={config.includeLostFound}
                                    onChange={(event) =>
                                        updateConfig(
                                            "includeLostFound",
                                            event.target.checked
                                        )
                                    }
                                />
                                Lost and found reports
                            </label>
                        </fieldset>

                        <p className="admin-reports-help">
                            Generates a ZIP containing separate CSV files.
                            Saved reports are managed in the list beside this
                            form.
                        </p>

                        <button type="submit" disabled={generating}>
                            {generating
                                ? "Generating..."
                                : "Generate CSV ZIP"}
                        </button>
                    </form>
                </section>

                {/* Saved reports */}
                <section className="admin-panel admin-reports-list-panel">
                    <div className="admin-panel-heading">
                        <h2>Generated Reports</h2>
                    </div>

                    {error && (
                        <p className="admin-reports-error" role="alert">
                            {error}
                        </p>
                    )}

                    {success && (
                        <p role="status">
                            {success}
                        </p>
                    )}

                    {loading ? (
                        <p>Loading reports...</p>
                    ) : (
                        <div className="admin-reports-list">
                            {validReports.length === 0 && (
                                <p>No saved reports found.</p>
                            )}

                            {validReports.map((report, index) => {
                                const id = report._id || `report-${index}`;
                                const status = report.status || "unknown";
                                const recordCounts =
                                    report.recordCounts &&
                                    typeof report.recordCounts === "object" &&
                                    !Array.isArray(report.recordCounts)
                                        ? report.recordCounts
                                        : {};

                                const createdAt = report.createdAt
                                    ? new Date(report.createdAt)
                                    : null;

                                return (
                                    <article
                                        className="admin-reports-row"
                                        key={id}
                                    >
                                        <div>
                                            <h3>
                                                {report.title ||
                                                    "Untitled report"}
                                            </h3>

                                            <p>
                                                {report.type || "Report"}
                                                {" • "}
                                                {report.period || "All records"}
                                                {" • "}
                                                Created by{" "}
                                                {report.createdByName ||
                                                    "Unknown"}
                                            </p>

                                            <small>
                                                Created at{" "}
                                                {createdAt &&
                                                !Number.isNaN(
                                                    createdAt.getTime()
                                                )
                                                    ? createdAt.toLocaleString()
                                                    : "Unknown"}
                                            </small>

                                            <p>{report.summary || ""}</p>

                                            {Object.keys(recordCounts).length >
                                                0 && (
                                                <small>
                                                    {Object.entries(recordCounts)
                                                        .map(
                                                            ([key, value]) =>
                                                                `${key.replaceAll(
                                                                    "_",
                                                                    " "
                                                                )}: ${value}`
                                                        )
                                                        .join(" · ")}
                                                </small>
                                            )}
                                        </div>

                                        <div className="admin-reports-actions">
                                            <span
                                                className={`admin-status-pill ${status}`}
                                            >
                                                {status}
                                            </span>

                                            {status === "draft" &&
                                                report._id && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleFinalizeReport(
                                                                report._id
                                                            )
                                                        }
                                                    >
                                                        Finalize
                                                    </button>
                                                )}

                                            <button
                                                type="button"
                                                disabled={!report._id}
                                                onClick={() =>
                                                    handleDownloadReport(report)
                                                }
                                            >
                                                {report.exportFormat === "zip"
                                                    ? "Download ZIP"
                                                    : "Download"}
                                            </button>

                                            <button
                                                type="button"
                                                disabled={!report._id}
                                                onClick={() =>
                                                    handleDeleteReport(
                                                        report._id
                                                    )
                                                }
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
            </section>
        </section>
    );
}
