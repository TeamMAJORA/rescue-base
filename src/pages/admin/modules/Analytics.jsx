import { useEffect, useMemo, useRef, useState } from "react";
import LoadingState from "../../../components/system/LoadingState";

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
    { value: "rescues", label: "Rescues", noun: "animals rescued" },
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [hoverBar, setHoverBar] = useState(null);
    const [hoverSlice, setHoverSlice] = useState(null);
    // Insight tile clicked: its chart metric is shown and that month's bar is outlined for a few seconds
    const [selectedInsightKey, setSelectedInsightKey] = useState(null);
    const [highlightedBarIndex, setHighlightedBarIndex] = useState(null);
    const monthlyChartRef = useRef(null);

    useEffect(() => {
        if (highlightedBarIndex === null) return undefined;
        const timer = setTimeout(() => {
            setHighlightedBarIndex(null);
            setHoverBar((current) => (current === highlightedBarIndex ? null : current));
        }, 3000);
        return () => clearTimeout(timer);
    }, [highlightedBarIndex]);

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
            { key: "rescues", label: "Rescues", value: totals.rescues, detail: "Animals taken in as rescued (not rescue assignments)" },
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
                    <LoadingState label="Loading analytics…" />
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


    // Insights: one tile per chart metric. Trend = this month vs last month; clicking a tile shows
    // that metric in the Monthly activity chart and outlines this month's bar.
    const currentMonthIndex = monthlyStats.length - 1;
    const previousMonthLabel = monthlyStats.length > 1 ? monthlyStats[monthlyStats.length - 2].month : "";
    const monthValue = (metricKey, index) => Number(monthlyStats[index]?.[metricKey]) || 0;
    // Percentages on this page stay between 1 and 100 (a real change is never shown as 0%, and never above 100%)
    const toPercentInRange = (value) => Math.min(100, Math.max(1, Math.round(value)));
    const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

    function describeMonthChange(metricKey, isMoreGood) {
        if (monthlyStats.length < 2) return null;
        const current = monthValue(metricKey, currentMonthIndex);
        const previous = monthValue(metricKey, currentMonthIndex - 1);
        if (current === previous) return { direction: "flat", tone: "neutral", text: `Same as ${previousMonthLabel}` };
        const direction = current > previous ? "up" : "down";
        const tone = (direction === "up") === isMoreGood ? "good" : "bad";
        if (previous === 0) return { direction, tone, text: `${current} new`, suffix: `vs 0 in ${previousMonthLabel}` };
        const percent = toPercentInRange((Math.abs(current - previous) / previous) * 100);
        return { direction, tone, text: `${percent}%`, suffix: `vs ${previousMonthLabel} (${previous} → ${current})` };
    }

    function describeRescuesVsAverage() {
        const total = monthlyStats.reduce((sum, month) => sum + (Number(month.rescues) || 0), 0);
        if (!monthlyStats.length || total === 0) return `No rescues in the last ${monthlyStats.length || 6} months`;
        const average = total / monthlyStats.length;
        const differenceFromAverage = ((monthValue("rescues", currentMonthIndex) - average) / average) * 100;
        if (Math.round(differenceFromAverage) === 0) return `${nowLabel}: right at the monthly average`;
        return `${nowLabel}: ${toPercentInRange(Math.abs(differenceFromAverage))}% ${differenceFromAverage > 0 ? "above" : "below"} the monthly average`;
    }

    const newLostFoundThisMonth = monthValue("lostFound", currentMonthIndex);
    const insightTiles = [
        {
            key: "adoptions", metric: "adoptions", label: "Adoptions", value: totals.adoptions, note: "adopted so far",
            change: describeMonthChange("adoptions", true), tone: "positive",
            footer: details.pendingApplications > 0
                ? `${plural(details.pendingApplications, "application")} waiting for review`
                : "No applications waiting",
        },
        {
            key: "rescues", metric: "rescues", label: "Rescues", value: totals.rescues, note: "animals taken in",
            change: describeMonthChange("rescues", true), tone: "neutral", footer: describeRescuesVsAverage(),
        },
        {
            key: "lost-found", metric: "lostFound", label: "Lost & Found", value: details.openLostFound, note: "reports still open",
            change: describeMonthChange("lostFound", false), tone: details.openLostFound > 0 ? "warning" : "neutral",
            footer: `${plural(newLostFoundThisMonth, "new report")} in ${nowLabel}`,
        },
        {
            key: "foster", metric: "foster", label: "Foster care", value: details.activeFosters, note: "pets in foster now",
            change: describeMonthChange("foster", true), tone: "neutral",
            footer: `${plural(details.completedFosters, "placement")} completed`,
        },
    ];

    function showInsightInChart(tile) {
        setSelectedMetric(tile.metric);
        setSelectedInsightKey(tile.key);
        setHoverBar(currentMonthIndex);
        setHighlightedBarIndex(currentMonthIndex);
        monthlyChartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return (
        <section className="an2-page">
            <div className="um-strip an2-strip">
                <div className="um-strip-total">
                    <b>{totals.adoptions}</b>
                    <small>Total adoptions (all time)</small>
                    <em>{details.pendingApplications} applications pending</em>
                </div>
                <div>
                    <small>Animals rescued</small>
                    <b>{totals.rescues}</b>
                    <em>all time</em>
                </div>
                <div>
                    <small>Lost &amp; Found reports (all time)</small>
                    <b>{totals.lostFound}</b>
                    <em>{details.openLostFound} open</em>
                </div>
                <div>
                    <small>Foster assignments (all time)</small>
                    <b>{totals.foster}</b>
                    <em>{details.activeFosters} active</em>
                </div>
            </div>

            <div className="an2-grid">
                {/* Monthly activity */}
                <section className="an2-card" ref={monthlyChartRef}>
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
                                                    className={`an2-bar${isCurrent ? " is-current" : ""}${hoverBar === index ? " is-hover" : ""}${highlightedBarIndex === index ? " is-highlighted" : ""}`}
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
                                        <small>{slices.total === 0 ? "No activity yet" : "records, all time"}</small>
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

                {!loading && (
                    <div className="an2-insights">
                        {insightTiles.map((tile) => (
                            <button
                                type="button"
                                className={`an2-insight is-${tile.tone}${selectedInsightKey === tile.key && selectedMetric === tile.metric ? " is-selected" : ""}`}
                                key={tile.key}
                                onClick={() => showInsightInChart(tile)}
                                aria-label={`${tile.label}: ${tile.value} ${tile.note}. Show ${nowLabel} in the Monthly activity chart`}
                            >
                                <span className="an2-insight-label">{tile.label}</span>
                                <b>{tile.value}</b>
                                <span className="an2-insight-note">{tile.note}</span>
                                {tile.change && (
                                    <span className="an2-insight-change">
                                        <span className={`an2-trend is-${tile.change.tone}`}>
                                            {tile.change.direction === "up" ? "↗ " : tile.change.direction === "down" ? "↘ " : "— "}
                                            {tile.change.text}
                                        </span>
                                        {tile.change.suffix && <small>{tile.change.suffix}</small>}
                                    </span>
                                )}
                                <span className="an2-insight-footer">{tile.footer}</span>
                            </button>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}
