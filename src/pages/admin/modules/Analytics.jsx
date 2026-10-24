import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

const emptyTotals = {
    adoptions: 0,
    rescues: 0,
    lostFound: 0,
    foster: 0,
};

const emptyDetails = {
    pendingApplications: 0,
    activeFosters: 0,
    completedFosters: 0,
    openLostFound: 0,
};

const metricOptions = [
    { value: "adoptions", label: "Adoptions", noun: "adoptions" },
    { value: "rescues", label: "Rescues", noun: "rescues" },
    { value: "lostFound", label: "Lost & Found", noun: "lost & found reports" },
    { value: "foster", label: "Foster", noun: "foster assignments" },
];

// Colorblind-checked categorical colors for the donut
const SLICE_COLORS = {
    rescues: "#9a4a1f",
    adoptions: "#eda100",
    lostFound: "#2a78d6",
    foster: "#1baf7a",
};

const INSIGHT_TYPES = {
    positive: { icon: "↑", label: "Good" },
    warning: { icon: "!", label: "Needs attention" },
    info: { icon: "i", label: "Info" },
};

// Top of the y-axis: always splits into 4 whole-number steps (6 -> 8, 23 -> 24)
function niceMax(value) {
    if (value <= 4) return 4;
    const raw = Math.ceil(value / 4);
    const step = raw <= 5 ? raw : raw <= 10 ? Math.ceil(raw / 2) * 2 : Math.ceil(raw / 5) * 5;
    return step * 4;
}

function arcPath(cx, cy, outer, inner, start, end) {
    // A full circle can't be one arc; leave a hair-thin gap
    const stop = end - start >= Math.PI * 2 ? start + Math.PI * 2 - 0.0001 : end;
    const large = stop - start > Math.PI ? 1 : 0;
    const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;

    return [
        `M${p(outer, start)}`,
        `A${outer},${outer} 0 ${large} 1 ${p(outer, stop)}`,
        `L${p(inner, stop)}`,
        `A${inner},${inner} 0 ${large} 0 ${p(inner, start)}`,
        "Z",
    ].join(" ");
}

export default function Analytics() {
    const [selectedMetric, setSelectedMetric] = useState("adoptions");
    const [totals, setTotals] = useState(emptyTotals);
    const [details, setDetails] = useState(emptyDetails);
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [hoverBar, setHoverBar] = useState(null);
    const [hoverSlice, setHoverSlice] = useState(null);

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

                const response = await fetch(`${API}/api/analytics/overview`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Failed to load analytics.");
                }

                setTotals({ ...emptyTotals, ...(data.totals || {}) });
                setDetails({ ...emptyDetails, ...(data.details || {}) });
                setMonthlyStats(Array.isArray(data.monthlyStats) ? data.monthlyStats : []);
                setInsights(Array.isArray(data.insights) ? data.insights : []);
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
    }, [reloadKey]);

    const metric = metricOptions.find((item) => item.value === selectedMetric) || metricOptions[0];

    const monthly = useMemo(() => {
        const values = monthlyStats.map((month) => Number(month[selectedMetric]) || 0);
        const top = niceMax(Math.max(0, ...values));
        const sum = values.reduce((total, value) => total + value, 0);
        const busiestIndex = sum > 0 ? values.indexOf(Math.max(...values)) : -1;
        const ticks = Array.from({ length: 5 }, (_, i) => (top / 4) * i);

        return { values, top, sum, busiestIndex, ticks };
    }, [monthlyStats, selectedMetric]);

    const slices = useMemo(() => {
        const items = [
            { key: "rescues", label: "Rescues", value: totals.rescues, detail: "Animals taken in as rescued" },
            {
                key: "adoptions",
                label: "Adoptions",
                value: totals.adoptions,
                detail: `${details.pendingApplications} application${details.pendingApplications === 1 ? "" : "s"} pending review`,
            },
            {
                key: "lostFound",
                label: "Lost & Found",
                value: totals.lostFound,
                detail: `${details.openLostFound} report${details.openLostFound === 1 ? "" : "s"} still open`,
            },
            {
                key: "foster",
                label: "Foster care",
                value: totals.foster,
                detail: `${details.activeFosters} active · ${details.completedFosters} completed`,
            },
        ];

        const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
        let angle = -Math.PI / 2;

        const withAngles = items.map((item) => {
            const value = Number(item.value) || 0;
            const sweep = total > 0 ? (value / total) * Math.PI * 2 : 0;
            const start = angle;
            angle += sweep;

            return {
                ...item,
                value,
                color: SLICE_COLORS[item.key],
                percent: total > 0 ? Math.round((value / total) * 100) : 0,
                start,
                end: angle,
                mid: start + sweep / 2,
            };
        });

        return { items: withAngles, total };
    }, [totals, details]);

    if (loading) {
        return (
            <section className="an2-page">
                <div className="an2-card">
                    <p className="an2-muted">Loading analytics...</p>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="an2-page">
                <div className="an2-card an2-error" role="alert">
                    <h3>Unable to load analytics</h3>
                    <p>{error}</p>
                    <button type="button" className="an2-retry" onClick={() => setReloadKey((key) => key + 1)}>
                        Try again
                    </button>
                </div>
            </section>
        );
    }

    const active = slices.items.find((item) => item.key === hoverSlice) || null;
    const nowLabel = monthlyStats.length ? monthlyStats[monthlyStats.length - 1].month : "";

    return (
        <section className="an2-page">
            <div className="um-strip an2-strip">
                <div className="um-strip-total">
                    <b>{totals.adoptions}</b>
                    <small>Total adoptions</small>
                    <em>{details.pendingApplications} applications pending</em>
                </div>
                <div>
                    <small>Rescues</small>
                    <b>{totals.rescues}</b>
                </div>
                <div>
                    <small>Lost &amp; Found reports</small>
                    <b>{totals.lostFound}</b>
                    <em>{details.openLostFound} open</em>
                </div>
                <div>
                    <small>Foster assignments</small>
                    <b>{totals.foster}</b>
                    <em>{details.activeFosters} active</em>
                </div>
            </div>

            <div className="an2-grid">
                {/* Monthly activity */}
                <section className="an2-card">
                    <div className="an2-head">
                        <h3>Monthly activity</h3>
                        <div className="an2-seg" role="radiogroup" aria-label="Metric">
                            {metricOptions.map((option) => (
                                <button
                                    type="button"
                                    key={option.value}
                                    role="radio"
                                    aria-checked={selectedMetric === option.value}
                                    className={selectedMetric === option.value ? "on" : ""}
                                    onClick={() => setSelectedMetric(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="an2-sum">
                        <span>
                            <b>{monthly.sum}</b> {metric.noun} in the last 6 months
                        </span>
                        {monthly.busiestIndex >= 0 && (
                            <span>
                                <b>{monthlyStats[monthly.busiestIndex]?.month}</b> busiest month
                            </span>
                        )}
                    </div>

                    <div className="an2-chart" onMouseLeave={() => setHoverBar(null)}>
                        <div className="an2-plot">
                            {monthly.ticks.map((tick) => (
                                <div className="an2-gridline" key={tick} style={{ bottom: `${(tick / monthly.top) * 100}%` }}>
                                    <span>{Number.isInteger(tick) ? tick : tick.toFixed(1)}</span>
                                </div>
                            ))}

                            <div className="an2-cols">
                                {monthlyStats.map((month, index) => {
                                    const value = monthly.values[index];
                                    const isCurrent = index === monthlyStats.length - 1;

                                    return (
                                        <div
                                            className="an2-col"
                                            key={month.key || month.month}
                                            onMouseEnter={() => setHoverBar(index)}
                                            onFocus={() => setHoverBar(index)}
                                            onBlur={() => setHoverBar(null)}
                                            tabIndex={0}
                                            aria-label={`${month.month}: ${value} ${metric.noun}`}
                                        >
                                            <div className="an2-bar-area">
                                                <span className="an2-val" style={{ bottom: `${(value / monthly.top) * 100}%` }}>
                                                    {value}
                                                </span>
                                                <div
                                                    className={`an2-bar${isCurrent ? " is-current" : ""}${hoverBar === index ? " is-hover" : ""}`}
                                                    style={{ height: `${(value / monthly.top) * 100}%` }}
                                                />
                                                {hoverBar === index && (
                                                    <div
                                                        className={`an2-tip an2-bar-tip${index >= monthlyStats.length - 2 ? " is-left" : ""}`}
                                                        style={{ bottom: `${(value / monthly.top) * 100}%` }}
                                                    >
                                                        <b>
                                                            {month.month} {month.key ? month.key.slice(0, 4) : ""}
                                                            {isCurrent ? " (so far)" : ""}
                                                        </b>
                                                        {value} {metric.noun}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="an2-months">
                            {monthlyStats.map((month, index) => (
                                <span key={month.key || month.month}>
                                    {month.month}
                                    {index === monthlyStats.length - 1 && <small>so far</small>}
                                </span>
                            ))}
                        </div>
                    </div>

                    {monthlyStats.length === 0 && <p className="an2-muted">No monthly data yet.</p>}
                    {nowLabel && <span className="an2-sr">Latest month: {nowLabel}</span>}
                </section>

                {/* Activity breakdown (donut) */}
                <section className="an2-card">
                    <h3>Activity breakdown</h3>

                    <div className="an2-donut-wrap">
                        <div className="an2-donut" onMouseLeave={() => setHoverSlice(null)}>
                            <svg viewBox="0 0 240 240" role="img" aria-label="Activity breakdown">
                                {slices.total === 0 ? (
                                    <circle cx="120" cy="120" r="82" fill="none" stroke="#f1e8d2" strokeWidth="38" />
                                ) : (
                                    slices.items
                                        .filter((item) => item.value > 0)
                                        .map((item) => {
                                            const isOn = hoverSlice === item.key;
                                            const dx = isOn ? Math.cos(item.mid) * 9 : 0;
                                            const dy = isOn ? Math.sin(item.mid) * 9 : 0;

                                            return (
                                                <path
                                                    key={item.key}
                                                    d={arcPath(120, 120, 101, 63, item.start, item.end)}
                                                    fill={item.color}
                                                    className={`an2-slice${hoverSlice && !isOn ? " is-dim" : ""}`}
                                                    style={{ transform: `translate(${dx}px, ${dy}px)` }}
                                                    onMouseEnter={() => setHoverSlice(item.key)}
                                                />
                                            );
                                        })
                                )}
                            </svg>

                            <div className="an2-center">
                                {active ? (
                                    <>
                                        <b>{active.value}</b>
                                        <span>{active.label}</span>
                                        <small>
                                            {active.percent}% of {slices.total}
                                        </small>
                                    </>
                                ) : (
                                    <>
                                        <b>{slices.total}</b>
                                        <span>Total</span>
                                        <small>{slices.total === 0 ? "No activity yet" : "all activity"}</small>
                                    </>
                                )}
                            </div>

                            {active && (
                                <div className="an2-tip an2-donut-tip">
                                    <b>
                                        {active.label} · {active.value}
                                    </b>
                                    {active.detail}
                                </div>
                            )}
                        </div>

                        <div className="an2-legend">
                            {slices.items.map((item) => (
                                <button
                                    type="button"
                                    key={item.key}
                                    className={`an2-legend-row${hoverSlice === item.key ? " is-on" : ""}`}
                                    onMouseEnter={() => setHoverSlice(item.key)}
                                    onMouseLeave={() => setHoverSlice(null)}
                                    onFocus={() => setHoverSlice(item.key)}
                                    onBlur={() => setHoverSlice(null)}
                                    onClick={() => setHoverSlice(hoverSlice === item.key ? null : item.key)}
                                >
                                    <i style={{ background: item.color }} aria-hidden="true" />
                                    <span>{item.label}</span>
                                    <b>{item.value}</b>
                                    <em>{item.percent}%</em>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* Insights */}
            <section className="an2-card">
                <h3>Insights</h3>

                <div className="an2-insights">
                    {insights.map((insight) => {
                        const type = INSIGHT_TYPES[insight.type] || INSIGHT_TYPES.info;

                        return (
                            <article className={`an2-insight is-${insight.type || "info"}`} key={insight.id}>
                                <span className="an2-insight-icon" aria-hidden="true">
                                    {type.icon}
                                </span>
                                <div>
                                    <b>{insight.title}</b>
                                    <p>{insight.detail}</p>
                                </div>
                                <span className="an2-insight-tag">{type.label}</span>
                            </article>
                        );
                    })}

                    {insights.length === 0 && <p className="an2-muted">No insights are available yet.</p>}
                </div>
            </section>
        </section>
    );
}
