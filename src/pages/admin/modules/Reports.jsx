import {
    useMemo, useState
} from "react"

const starterReports = [
    {
        id: 1,
        title: "Monthly Adoption Summary",
        type: "adoption",
        period: "June 2026",
        createdBy: "Admin User",
        status: "finalized",
        summary: "Summary of adoption applications, approvals, and rejected requests for the month.",
        createdAt: "2026-06-30",
    },
    {
        id: 2,
        title: "Lost & Found Activity Report",
        type: "lost-found",
        period: "June 2026",
        createdBy: "Admin User",
        status: "draft",
        summary: "Overview of open and resolved lost/found pet reports.",
        createdAt: "2026-06-29",
    },
    {
        id: 3,
        title: "Foster Care Progress Report",
        type: "foster",
        period: "June 2026",
        createdBy: "Admin User",
        status: "draft",
        summary: "Summary of active foster assignments and submitted foster updates.",
        createdAt: "2026-06-28",
    },
];

export default function Reports() {
    const [reports, setReports] = useState(starterReports);

    const [reportForm, setReportForm] = useState({
        title: "",
        type: "adoption",
        period: "",
        summary: "",
        status: "draft",
    });

    const finalizedReport = useMemo(() => {
        return reports.filter((report) => report.status === "draft").length;
    }, [reports]);


    const draftReports = useMemo(() => {
        return reports.filter((report) => report.status === "draft").length;
    }, [reports]);

    function handleCreateReport(e) {
        e.preventDefault();

        const savedUser = JSON.parse(
            localStorage.getItem("rescuebase_user") || "{}"
        );

        const newReport = {
            id: Date.now(),
            ...reportForm,
            createdBy: savedUser.name || savedUser.username || "Admin User",
            createdAt: new Date().toISOString().slice(0, 10),
        };

        setReports((current) => [newReport, ...newReport]);

        setReportForm({
            title: "",
            type: "adoption",
            period: "",
            summary: "",
            status: "draft",
        });
    }

    function handleFinalizeReport(id) {
        setReportForm((current) =>
            current.map((report) =>
                report.id === id ? { ...report, status: "finalized" } : report
            )
        );
    }

    function handleDeleteReport(id) {
        setReportForm((current) => current.filter((report) => report.id !== id));
    }

    function handleDownloadReport(report) {
        const reportText = `
            RESCUEBASE REPORT

            Title : ${report.title}
            Type : ${report.type}
            Period : ${report.period}
            Created By : ${report.createdBy}
            Created At : ${report.createdAt}
            Status : ${report.status}

            Summary:
                ${report.summary}
        `.trim();

        const blob = new Blob([reportText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `${report.title.replaceAll(" ", "_")}.txt`;
        link.click();

        URL.revokeObjectURL(url);
    }

    return (
        <section className="admin-reports-page">
            <section className="admin-reports-stats">
                <article className="admin-panel admin-reports-stat-card">
                    <span>Total Reports</span>
                    <strong>{reports.length}</strong>
                </article>

                <article className="admin-panel admin-reports-stat-card">
                    <span>Finalized Reports</span>
                    <strong>{finalizedReport}</strong>
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

                    <div className="admin-reports-list">
                        {reports.map((report) => (
                            <article className="admin-reports-row" key={report.id}>
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
                                            onClick={() => handleFinalizeReport(report.id)}
                                        >
                                            Finalize
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => handleCreateReport(report)}
                                    >
                                        Download
                                    </button>

                                    <button
                                        type="button"
                                        className="danger"
                                        onClick={() => handleDeleteReport(report.id)}
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
