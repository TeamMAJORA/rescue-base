import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

const emptyTotals = {
    adoptions: 0,
    rescues: 0,
    lostFound: 0,
    foster: 0,
};

const metricOptions = [
    { value: "adoptions", label: "Adoptions" },
    { value: "rescues", label: "Rescues" },
    { value: "lostFound", label: "Lost & Found" },
    { value: "foster", label: "Foster Care" },
];

export default function Analytics() {
    const [selectedMetric, setSelectedMetric] = useState("adoptions");
    const [totals, setTotals] = useState(emptyTotals);
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadAnalytics() {
            const token = localStorage.getItem("token");

            if (!token) {
                setError("Please log in to view analytics.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `${API}/api/analytics/overview`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        signal: controller.signal,
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message || "Failed to load analytics."
                    );
                }

                setTotals({
                    ...emptyTotals,
                    ...(data.totals || {}),
                });

                setMonthlyStats(
                    Array.isArray(data.monthlyStats)
                        ? data.monthlyStats
                        : []
                );

                setInsights(
                    Array.isArray(data.insights)
                        ? data.insights
                        : []
                );
            } catch (err) {
                if (err.name === "AbortError") return;

                console.error("Analytics loading error:", err);
                setError(err.message || "Failed to load analytics.");
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadAnalytics();

        return () => controller.abort();
    }, []);

    const maxValue = useMemo(() => {
        return Math.max(
            1,
            ...monthlyStats.map((item) =>
                Number(item[selectedMetric]) || 0
            )
        );
    }, [monthlyStats, selectedMetric]);

    const selectedTotal = totals[selectedMetric] || 0;

    if (loading) {
        return (
            <section className="admin-analytics-page">
                <div className="admin-panel">
                    <p>Loading analytics...</p>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="admin-analytics-page">
                <div className="admin-panel" role="alert">
                    <h2>Unable to load analytics</h2>
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                    >
                        Try Again
                    </button>
                </div>
            </section>
        );
    }

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
                            onChange={(event) =>
                                setSelectedMetric(event.target.value)
                            }
                        >
                            {metricOptions.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="admin-analytics-total">
                        <span>Selected Total</span>
                        <strong>{selectedTotal}</strong>
                    </div>

                    <div className="admin-analytics-chart">
                        {monthlyStats.map((item) => {
                            const value =
                                Number(item[selectedMetric]) || 0;

                            return (
                                <article
                                    className="admin-analytics-bar-item"
                                    key={item.key || item.month}
                                >
                                    <div className="admin-analytics-bar-track">
                                        <span
                                            className={`admin-analytics-bar ${selectedMetric}`}
                                            style={{
                                                height: `${
                                                    (value / maxValue) * 100
                                                }%`,
                                            }}
                                        />
                                    </div>

                                    <small>{item.month}</small>
                                    <strong>{value}</strong>
                                </article>
                            );
                        })}
                    </div>

                    {monthlyStats.length === 0 && (
                        <p>No monthly activity data is available.</p>
                    )}
                </section>

                <section className="admin-panel admin-analytics-breakdown-panel">
                    <div className="admin-panel-heading">
                        <h2>Activity Breakdown</h2>
                    </div>

                    <div className="admin-analytics-breakdown-list">
                        {metricOptions.map((option) => (
                            <article key={option.value}>
                                <span>{option.label}</span>
                                <strong>{totals[option.value]}</strong>
                            </article>
                        ))}
                    </div>
                </section>
            </section>

            <section className="admin-panel admin-analytics-insights-panel">
                <div className="admin-panel-heading">
                    <h2>Insights</h2>
                </div>

                <div className="admin-analytics-insight-list">
                    {insights.map((insight) => (
                        <article
                            className="admin-analytics-insight-row"
                            key={insight.id}
                        >
                            <span
                                className={`admin-analytics-insight-dot ${insight.type}`}
                            />

                            <div>
                                <h3>{insight.title}</h3>
                                <p>{insight.detail}</p>
                            </div>
                        </article>
                    ))}

                    {insights.length === 0 && (
                        <p>No insights are available yet.</p>
                    )}
                </div>
            </section>
        </section>
    );
}