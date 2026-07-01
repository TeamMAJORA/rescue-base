import { useMemo, useState } from "react";

const starterReports = [
    {
        id: 1,
        reporterName: "Maria Santos",
        email: "maria@example.com",
        phone: "09123456789",
        reportType: "lost",
        petName: "Milo",
        species: "Dog",
        breed: "Aspin",
        location: "Talisay City",
        dateReported: "2026-06-28",
        description: "Brown dog with red collar last seen near the market.",
        status: "open",
    },
    {
        id: 2,
        reporterName: "Juan Dela Cruz",
        email: "juan@example.com",
        phone: "09987654321",
        reportType: "found",
        petName: "Unknown",
        species: "Cat",
        breed: "Domestic Shorthair",
        location: "Cebu City",
        dateReported: "2026-06-29",
        description: "White cat found near a convenience store.",
        status: "open",
    },
];

export default function LostFound() {
    const [reports, setReports] = useState(starterReports);

    const [reportForm, setReportForm] = useState({
        reporterName: "",
        email: "",
        phone: "",
        reportType: "lost",
        petName: "",
        species: "Dog",
        breed: "",
        location: "",
        dateReported: "",
        description: "",
        status: "open",
    });

    const openReports = useMemo(() => {
        return reports.filter((report) => report.status === "open").length;
    }, [reports]);

    const foundReports = useMemo(() => {
        return reports.filter((report) => report.reportType === "found").length;
    }, [reports]);

    function handleAddReport(e) {
        e.preventDefault();

        const newReport = {
            id: Date.now(),
            ...reportForm,
        };

        setReports((current) => [newReport, ...current]);

        setReportForm({
            reporterName: "",
            email: "",
            phone: "",
            reportType: "lost",
            petName: "",
            species: "Dog",
            breed: "",
            location: "",
            dateReported: "",
            description: "",
            status: "open",
        });
    }

    function handleResolveReport(id) {
        setReports((current) =>
            current.map((report) =>
                report.id === id ? { ...report, status: "resolved" } : report
            )
        );
    }

    return (
        <section className="admin-lostfound-page">
            <section className="admin-lostfound-stats">
                <article className="admin-panel admin-lostfound-stat-card">
                    <span>Total Reports</span>
                    <strong>{reports.length}</strong>
                </article>

                <article className="admin-panel admin-lostfound-stat-card">
                    <span>Open Reports</span>
                    <strong>{openReports}</strong>
                </article>

                <article className="admin-panel admin-lostfound-stat-card">
                    <span>Found Pets</span>
                    <strong>{foundReports}</strong>
                </article>
            </section>

            <section className="admin-lostfound-grid">
                <section className="admin-panel admin-lostfound-form-panel">
                    <div className="admin-panel-heading">
                        <h2>Add Lost/Found Report</h2>
                    </div>

                    <form className="admin-lostfound-form" onSubmit={handleAddReport}>
                        <label>
                            Reporter Name
                            <input
                                type="text"
                                value={reportForm.reporterName}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        reporterName: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Email
                            <input
                                type="email"
                                value={reportForm.email}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        email: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Phone Number
                            <input
                                type="text"
                                value={reportForm.phone}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        phone: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Report Type
                            <select
                                value={reportForm.reportType}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        reportType: e.target.value,
                                    })
                                }
                            >
                                <option value="lost">Lost Pet</option>
                                <option value="found">Found Pet</option>
                            </select>
                        </label>

                        <label>
                            Pet Name
                            <input
                                type="text"
                                value={reportForm.petName}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        petName: e.target.value,
                                    })
                                }
                                placeholder="Use Unknown if not sure"
                                required
                            />
                        </label>

                        <label>
                            Species
                            <select
                                value={reportForm.species}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        species: e.target.value,
                                    })
                                }
                            >
                                <option value="Dog">Dog</option>
                                <option value="Cat">Cat</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>

                        <label>
                            Breed
                            <input
                                type="text"
                                value={reportForm.breed}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        breed: e.target.value,
                                    })
                                }
                                placeholder="Example: Aspin, Persian"
                            />
                        </label>

                        <label>
                            Location
                            <input
                                type="text"
                                value={reportForm.location}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        location: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Date Reported
                            <input
                                type="date"
                                value={reportForm.dateReported}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        dateReported: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label className="admin-lostfound-description-field">
                            Description
                            <textarea
                                value={reportForm.description}
                                onChange={(e) =>
                                    setReportForm({
                                        ...reportForm,
                                        description: e.target.value,
                                    })
                                }
                                placeholder="Add color, collar, last seen area, or other details."
                                required
                            />
                        </label>

                        <button type="submit">Add Report</button>
                    </form>
                </section>

                <section className="admin-panel admin-lostfound-list-panel">
                    <div className="admin-panel-heading">
                        <h2>Lost & Found Reports</h2>
                    </div>

                    <div className="admin-lostfound-list">
                        {reports.map((report) => (
                            <article className="admin-lostfound-row" key={report.id}>
                                <div>
                                    <h3>{report.petName}</h3>
                                    <p>
                                        {report.species} • {report.breed || "Unknown breed"} •{" "}
                                        {report.location}
                                    </p>

                                    <small>
                                        Reported by {report.reporterName} • {report.email} •{" "}
                                        {report.phone}
                                    </small>

                                    <span>{report.description}</span>
                                </div>

                                <div className="admin-lostfound-actions">
                                    <span className={`admin-lostfound-type ${report.reportType}`}>
                                        {report.reportType}
                                    </span>

                                    <span className={`admin-status-pill ${report.status}`}>
                                        {report.status}
                                    </span>

                                    {report.status === "open" && (
                                        <button
                                            type="button"
                                            onClick={() => handleResolveReport(report.id)}
                                        >
                                            Resolve
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </section>
        </section>
    );
}