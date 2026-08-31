import {
    useMemo, useState, useEffect
} from "react"

const API = import.meta.env.VITE_BACKEND_URL;

export default function Reports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const token = localStorage.getItem("token");

    const [reportForm, setReportForm] = useState({
        title: "",
        type: "adoption",
        period: "",
        summary: "",
        status: "draft",
    });

    const finalizedReports = useMemo(() => {
        return reports.filter((report) => report.status === "finalized").length;
    }, [reports]);


    const draftReports = useMemo(() => {
        return reports.filter((report) => report.status === "draft").length;
    }, [reports]);

    async function handleCreateReport(e) {
        e.preventDefault();
        try {
            setError("");

            const response = await fetch(
                `${API}/api/reports`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(
                        reportForm
                    ),
                }
            );

            const data = response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create report.");
            }

            setReportsL((current) => [
                data.report,
                ...current,
            ]);

            setReportForm({
                title: "",
                type: "adoption",
                period: "",
                summary: "",
                status: "draft",
            });
        } catch (error) {
            console.error("Creating report error", error);
            setError(error.message || "Failed to create report");
        }
    }

    async function handleFinalizeReport(id) {
        try {
            setError("");

            const response = await fetch(`${API}/api/reports${id}/finalize`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to finalize report");
            }

            setReports((current) =>
                current.map((report) =>
                    report._id === id ? data.report : report
                ));
        } catch (error) {
            console.error("Fail to finalize the report.", error);
            setError(error.message || "Failed to finalize the report");
        }
    }

    async function handleDeleteReport(id) {
        try {
            setError("");

            const token =
                localStorage.getItem("token");

            const response = await fetch(
                `${API}/api/reports/${id}`,
                {
                    method: "DELETE",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to delete report."
                );
            }

            setReports((current) =>
                current.filter(
                    (report) =>
                        report._id !== id
                )
            );

        } catch (error) {
            console.error(
                "Delete report error:",
                error
            );

            setError(
                error.message ||
                "Failed to delete report."
            );
        }
    }

    async function handleDownloadReport(report) {
        try {
            setError("");

            const token =
                localStorage.getItem("token");

            const response = await fetch(
                `${API}/api/reports/${report._id}/download`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                const data =
                    await response.json();

                throw new Error(
                    data.message ||
                    "Failed to download report."
                );
            }

            const blob =
                await response.blob();

            const url =
                URL.createObjectURL(blob);

            const link =
                document.createElement("a");

            link.href = url;

            link.download =
                `${report.title
                    .replace(
                        /[^a-z0-9]+/gi,
                        "_"
                    )}.txt`;

            document.body.appendChild(link);

            link.click();

            link.remove();

            URL.revokeObjectURL(url);

        } catch (error) {
            console.error(
                "Download report error:",
                error
            );

            setError(
                error.message ||
                "Failed to download report."
            );
        }
    }

    async function loadReports() {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("token");
            const response = await fetch(`${API}/api/reports`,
                {
                    method: "GET",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            const data = response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to load reports.");
            }

            setReports(data.reports || []);
        } catch (error) {
            console.error("Load reports error.", error);
            setError(error.message || "Failed to load reports.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadReports();
    }, []);

    return (
        <section className="admin-reports-page">
            <section className="admin-reports-stats">
                <article className="admin-panel admin-reports-stat-card">
                    <span>Total Reports</span>
                    <strong>{reports.length}</strong>
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
                <section className="admin-panel admin-reports-form-panel">
                    <div className="admin-panel-heading">
                        <h2>Create Report</h2>
                    </div>

                    <form className="admin-reports-form" onSubmit={handleCreateReport}>
                        <label>
                            Report Title
                            <input
                                type="text"
                                value={reportForm}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        title: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Report Type
                            <select
                                value={reportForm.type}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        type: e.target.value,
                                    })
                                }
                            >
                                <option value="adoption">Adoption</option>
                                <option value="foster">Foster Care</option>
                                <option value="lost-found">Lost & Found</option>
                                <option value="gis">GIS Mapping</option>
                                <option value="feedback">Feedback</option>
                                <option value="analytics">Analytics</option>
                            </select>
                        </label>

                        <label>
                            Report Period
                            <input
                                type="text"
                                value={reportForm.period}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        period: e.target.value,
                                    })
                                }
                                placeholder="Example: June 2026"
                                required
                            />
                        </label>

                        <label>
                            Status
                            <select
                                value={reportForm.status}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        status: e.target.value,
                                    })
                                }
                            >
                                <option value="draft">Draft</option>
                                <option value="finalized">Finalized</option>
                            </select>
                        </label>

                        <label className="admin-reports-summary=field">
                            Summary
                            <textarea
                                value={reportForm.summary}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        summary: e.target.value,
                                    })
                                }
                                placeholder="Write the report summary here."
                                required
                            />
                        </label>
                        <button type="submit">Create Report</button>
                    </form>
                </section>

                <section className="admin-panel admin-reports-list-panel">
                    <div className="admin-panel-heading">
                        <h2>Generated Reports</h2>
                    </div>

                    {error && (
                        <p className="admin-reports-error">
                            {error}
                        </p>
                    )}

                    {loading ? (
                        <p>Loading reports...</p>
                    ) : (
                        <div className="admin-reports-list">
                            {/* existing map */}
                        </div>
                    )}

                    <div className="admin-reports-list">
                        {reports.map((report) => (
                            <article className="admin-reports-row" key={report._id}>
                                <div>
                                    <h3>{report.title}</h3>

                                    <p>
                                        {report.type} • {report.period} • Created by{" "}
                                        {report.createdBy}
                                    </p>

                                    <small>Created at {report.createdAt}</small>

                                    <span>{report.summary}</span>
                                </div>

                                <div className="admin-reports-actions">
                                    <span className={`admin-status-pill ${report.status}`}>
                                        {report.status}
                                    </span>

                                    {report.status === "draft" && (
                                        <button
                                            type="button"
                                            onClick={() => handleFinalizeReport(report._id)}
                                        >
                                            Finalize
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => handleDownloadReport(report)}
                                    >
                                        Download
                                    </button>

                                    <button
                                        type="button"
                                        className="danger"
                                        onClick={() => handleDeleteReport(report._id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </section>
        </section>
    );
}
