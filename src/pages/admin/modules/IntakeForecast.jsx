
import { useCallback, useEffect, useMemo, useState } from "react";
import "../../../styles/admin/IntakeForecast.css";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

function formatNumber(value, digits = 0) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";

    return value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

// From training_metadata.json (test set): mean absolute error in animals per month
const MODEL_TEST_MAE = 2.56;

function monthLabel(key, opts = { month: "short", year: "2-digit" }) {
    if (!key) return "—";
    const date = new Date(`${key}-01T00:00:00`);
    return Number.isNaN(date.getTime()) ? key : date.toLocaleDateString("en-US", opts);
}

// Top of the y-axis: 4 whole-number steps (3 -> 4, 7 -> 8, 13 -> 16)
function niceMax(value) {
    if (value <= 4) return 4;
    const step = Math.ceil(value / 4);
    return step * 4;
}

function ForecastChart({ history, target }) {
    const [hover, setHover] = useState(null);

    const columns = [
        ...history.map((month) => ({
            key: month.month,
            label: monthLabel(month.month),
            full: monthLabel(month.month, { month: "long", year: "numeric" }),
            intake: Number(month.intake) || 0,
            adoptions: Number(month.adoptions) || 0,
        })),
        {
            key: "forecast",
            label: monthLabel(target?.month),
            full: target?.label || "Next month",
            forecast: Number(target?.roundedPredictedIntake) || 0,
            raw: Number(target?.predictedIntake),
            isForecast: true,
        },
    ];

    const top = niceMax(
        Math.max(0, ...columns.map((c) => Math.max(c.intake || 0, c.adoptions || 0, c.forecast || 0)))
    );
    const ticks = Array.from({ length: 5 }, (_, i) => (top / 4) * i);
    const pct = (value) => `${(value / top) * 100}%`;

    if (history.length === 0) {
        return <p className="if2-muted">No monthly history yet.</p>;
    }

    return (
        <div className="if2-chart" onMouseLeave={() => setHover(null)}>
            <div className="if2-plot">
                {ticks.map((tick) => (
                    <div className="if2-gridline" key={tick} style={{ bottom: pct(tick) }}>
                        <span>{tick}</span>
                    </div>
                ))}

                <div className="if2-cols">
                    {columns.map((col, index) => (
                        <div
                            key={col.key}
                            className={`if2-col${col.isForecast ? " is-forecast" : ""}`}
                            tabIndex={0}
                            onMouseEnter={() => setHover(index)}
                            onFocus={() => setHover(index)}
                            onBlur={() => setHover(null)}
                            aria-label={
                                col.isForecast
                                    ? `${col.full}: forecast ${col.forecast} animals`
                                    : `${col.full}: ${col.intake} intakes, ${col.adoptions} adoptions`
                            }
                        >
                            <div className="if2-bars">
                                {col.isForecast ? (
                                    <div className="if2-bar is-forecast" style={{ height: pct(col.forecast) }} />
                                ) : (
                                    <>
                                        <div className="if2-bar is-intake" style={{ height: pct(col.intake) }} />
                                        <div className="if2-bar is-adoption" style={{ height: pct(col.adoptions) }} />
                                    </>
                                )}

                                {hover === index && (
                                    <div className={`if2-tip${index >= columns.length - 3 ? " is-left" : ""}`}>
                                        <b>{col.full}</b>
                                        {col.isForecast ? (
                                            <>
                                                Forecast: {col.forecast} animals
                                                {Number.isFinite(col.raw) && <small>LSTM output {col.raw.toFixed(2)}</small>}
                                            </>
                                        ) : (
                                            <>
                                                {col.intake} intakes · {col.adoptions} adoptions
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="if2-months">
                {columns.map((col) => (
                    <span key={col.key} className={col.isForecast ? "is-forecast" : ""}>
                        {col.label}
                        {col.isForecast && <small>forecast</small>}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function IntakeForecast() {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadForecast = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error("Your login token was not found. Please sign in again.");
            }

            const response = await fetch(
                `${API}/api/analytics/intake-forecast`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                    `Could not load the forecast (HTTP ${response.status}).`
                );
            }

            if (!data?.success || !data?.target) {
                throw new Error("The server returned an incomplete forecast.");
            }

            setForecast(data);
        } catch (err) {
            console.error("[Intake Forecast UI]", err);
            setError(err.message || "Failed to load the intake forecast.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadForecast();
    }, [loadForecast]);

    const history = useMemo(() => forecast?.history || [], [forecast]);
    const target = forecast?.target;
    const warnings = forecast?.dataQuality?.warnings || [];
    const [showData, setShowData] = useState(false);
    const [showWhy, setShowWhy] = useState(false);

    const stats = useMemo(() => {
        const intakes = history.map((m) => Number(m.intake) || 0);
        const total = intakes.reduce((sum, n) => sum + n, 0);
        const max = Math.max(0, ...intakes);
        const busiest = max > 0 ? history[intakes.lastIndexOf(max)] : null;

        return {
            total,
            average: history.length ? total / history.length : 0,
            busiest: busiest ? monthLabel(busiest.month, { month: "short" }) : "—",
            busiestCount: max,
        };
    }, [history]);

    return (
        <section className="if2-page">
            <div className="if2-toprow">
                {forecast && !error ? (
                    <div className="if2-status">
                        <i aria-hidden="true" />
                        Model online
                        {forecast.generatedAt && (
                            <span>
                                · updated{" "}
                                {new Date(forecast.generatedAt).toLocaleString("en-PH", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                })}
                            </span>
                        )}
                    </div>
                ) : (
                    <div />
                )}

                <button className="if2-refresh" type="button" onClick={loadForecast} disabled={loading}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" />
                    </svg>
                    {loading ? "Loading..." : "Refresh forecast"}
                </button>
            </div>

            {error && (
                <div className="if2-error" role="alert">
                    <div>
                        <b>Unable to load the forecast</b>
                        <p>{error}</p>
                        <small>Check that the backend and the Python AI service are both running.</small>
                    </div>
                    <button type="button" onClick={loadForecast}>
                        Try again
                    </button>
                </div>
            )}

            {loading && !forecast ? (
                <div className="if2-card if2-loading" role="status">
                    Loading the forecast...
                </div>
            ) : (
                forecast && (
                    <>
                        <div className="if2-warning" role="note">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                                <path d="M12 3 2 20h20L12 3z" />
                                <path d="M12 10v4M12 17h.01" />
                            </svg>
                            <div>
                                <p>
                                    <b>Warning:</b> this shelter has little history yet, so the forecast can be off by about ±
                                    {Math.round(MODEL_TEST_MAE)} animals (test error {MODEL_TEST_MAE}).
                                    {warnings.length > 0 && (
                                        <button type="button" className="if2-link" onClick={() => setShowWhy(!showWhy)}>
                                            {showWhy ? "Hide details" : "Details"}
                                        </button>
                                    )}
                                </p>
                                {showWhy && (
                                    <ul>
                                        {warnings.map((warning, index) => (
                                            <li key={`${index}-${warning}`}>{warning}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="um-strip if2-strip">
                            <div className="um-strip-total">
                                <b>{formatNumber(target?.roundedPredictedIntake)}</b>
                                <small>Animals expected in {target?.label || "next month"}</small>
                                <em>LSTM estimate {formatNumber(target?.predictedIntake, 2)}, rounded</em>
                            </div>
                            <div>
                                <small>Intakes, last {history.length} months</small>
                                <b>{stats.total}</b>
                            </div>
                            <div>
                                <small>Average per month</small>
                                <b>{formatNumber(stats.average, 1)}</b>
                            </div>
                            <div>
                                <small>Busiest month</small>
                                <b>{stats.busiest}</b>
                                {stats.busiestCount > 0 && <em>{stats.busiestCount} intakes</em>}
                            </div>
                        </div>

                        <section className="if2-card">
                            <div className="if2-head">
                                <div>
                                    <h3>Intake history and forecast</h3>
                                    <p>Last {history.length} months of intakes and adoptions, then next month's forecast.</p>
                                </div>
                                <div className="if2-legend">
                                    <span><i className="is-intake" />Intakes</span>
                                    <span><i className="is-adoption" />Adoptions</span>
                                    <span><i className="is-forecast" />Forecast</span>
                                </div>
                            </div>

                            <ForecastChart history={history} target={target} />

                            <button type="button" className="if2-toggle" onClick={() => setShowData(!showData)} aria-expanded={showData}>
                                {showData ? "▾ Hide monthly data" : "▸ Show monthly data (intakes, adoptions, releases)"}
                            </button>

                            {showData && (
                                <div className="if2-table-wrap">
                                    <table className="if2-table">
                                        <thead>
                                            <tr>
                                                <th>Month</th>
                                                <th>Intakes</th>
                                                <th>Adoptions</th>
                                                <th>Releases</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map((month) => (
                                                <tr key={month.month}>
                                                    <td>{monthLabel(month.month, { month: "long", year: "numeric" })}</td>
                                                    <td>{formatNumber(month.intake)}</td>
                                                    <td>{formatNumber(month.adoptions)}</td>
                                                    <td>{formatNumber(month.releases)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <p className="if2-foot">
                                Model: {forecast.model || "RESCUEBASE_LSTM_INTAKE"} · {history.length} months in, 1 month out
                            </p>
                        </section>
                    </>
                )
            )}
        </section>
    );
}
