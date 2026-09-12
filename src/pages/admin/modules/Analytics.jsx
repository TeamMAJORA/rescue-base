import { useMemo, useState } from "react";

const monthlyStats = [
    { month: "Jan", adoptions: 8, rescues: 12, lostFound: 5, foster: 4 },
    { month: "Feb", adoptions: 11, rescues: 9, lostFound: 7, foster: 5 },
    { month: "Mar", adoptions: 6, rescues: 14, lostFound: 4, foster: 6 },
    { month: "Apr", adoptions: 13, rescues: 11, lostFound: 8, foster: 7 },
    { month: "May", adoptions: 15, rescues: 16, lostFound: 9, foster: 8 },
    { month: "Jun", adoptions: 10, rescues: 13, lostFound: 6, foster: 5 },
];

const recentInsights = [
    {
        id: 1,
        title: "Adoption activity increased",
        detail: "May recorded the highest adoption count in the current dataset.",
        type: "positive",
    },
    {
        id: 2,
        title: "Lost & Found reports need monitoring",
        detail: "There are multiple open pet reports that may need admin follow-up.",
        type: "warning",
    },
    {
        id: 3,
        title: "Foster care is active",
        detail: "Foster assignments are helping reduce shelter capacity pressure.",
        type: "info",
    },
];

export default function Analytics() {
    const [selectedMetric, setSelectedMetric] = useState("adoptions");

    const totals = useMemo(() => {
        return monthlyStats.reduce(
            (sum, item) => ({
                adoptions: sum.adoptions + item.adoptions,
                rescues: sum.rescues + item.rescues,
                lostFound: sum.lostFound + item.lostFound,
                foster: sum.foster + item.foster,
            }),
            { adoptions: 0, rescues: 0, lostFound: 0, foster: 0 }
        );
    }, []);

    const maxValue = useMemo(() => {
        return Math.max(...monthlyStats.map((item) => item[selectedMetric]));
    }, [selectedMetric]);

    const selectedTotal = totals[selectedMetric];

    return (
        <section className="admin-analytics-page">
            <section className="admin-analytics-stats">
                <article className="admin-panel admin-analytics-stat-card">
                    <span>Total Adoptions</span>
                    <strong>{totals.adoptions}</strong>
                </article>

                <article className="admin-panel admin-analytics-stat-card">
                    <span>Total Rescues</span>
                    <strong>{totals.rescues}</strong>
                </article>

                <article className="admin-panel admin-analytics-stat-card">
                    <span>Lost & Found Reports</span>
                    <strong>{totals.lostFound}</strong>
                </article>

                <article className="admin-panel admin-analytics-stat-card">
                    <span>Foster Assignments</span>
                    <strong>{totals.foster}</strong>
                </article>
            </section>

            <section className="admin-analytics-grid">
                <section className="admin-panel admin-analytics-chart-panel">
                    <div className="admin-panel-heading">
                        <h2>Monthly Activity</h2>

                        <select
                            className="admin-analytics-filter"
                            value={selectedMetric}
                            onChange={(e) => setSelectedMetric(e.target.value)}
                        >
                            <option value="adoptions">Adoptions</option>
                            <option value="rescues">Rescues</option>
                            <option value="lostFound">Lost & Found</option>
                            <option value="foster">Foster Care</option>
                        </select>
                    </div>

                    <div className="admin-analytics-total">
                        <span>Selected Total</span>
                        <strong>{selectedTotal}</strong>
                    </div>

                    <div className="admin-analytics-chart">
                        {monthlyStats.map((item) => (
                            <article className="admin-analytics-bar-item" key={item.month}>
                                <div className="admin-analytics-bar-track">
                                    <span
                                        className={`admin-analytics-bar ${selectedMetric}`}
                                        style={{
                                            height: `${(item[selectedMetric] / maxValue) * 100}%`,
                                        }}
                                    />
                                </div>

                                <small>{item.month}</small>
                                <strong>{item[selectedMetric]}</strong>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="admin-panel admin-analytics-breakdown-panel">
                    <div className="admin-panel-heading">
                        <h2>Activity Breakdown</h2>
                    </div>

                    <div className="admin-analytics-breakdown-list">
                        <article>
                            <span>Adoptions</span>
                            <strong>{totals.adoptions}</strong>
                        </article>

                        <article>
                            <span>Rescues</span>
                            <strong>{totals.rescues}</strong>
                        </article>

                        <article>
                            <span>Lost & Found</span>
                            <strong>{totals.lostFound}</strong>
                        </article>

                        <article>
                            <span>Foster Care</span>
                            <strong>{totals.foster}</strong>
                        </article>
                    </div>
                </section>
            </section>

            <section className="admin-panel admin-analytics-insights-panel">
                <div className="admin-panel-heading">
                    <h2>Insights</h2>
                </div>

                <div className="admin-analytics-insight-list">
                    {recentInsights.map((insight) => (
                        <article className="admin-analytics-insight-row" key={insight.id}>
                            <span className={`admin-analytics-insight-dot ${insight.type}`} />

                            <div>
                                <h3>{insight.title}</h3>
                                <p>{insight.detail}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </section>
    );
}