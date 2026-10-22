
import { useCallback, useEffect, useState } from "react";
import "../../../styles/admin/IntakeForecast.css";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

function formatNumber(value, digits = 0) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";

    return value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

function MetricCard({ label, value, description, icon }) {
    return (
        <article className="if-metric-card">
            <div className="if-metric-heading">
                <span>{label}</span>
                <span className="if-metric-icon" aria-hidden="true">
                    {icon}
                </span>
            </div>

            <strong className="if-metric-value">{value}</strong>
            <span className="if-metric-description">{description}</span>
        </article>
    );
}

function MonthlyChart({ history }) {
    const maximum = Math.max(
        1,
        ...history.flatMap((month) => [
            Number(month.intake) || 0,
            Number(month.adoptions) || 0,
        ])
    );

    if (!history.length) {
        return (
            <div className="if-empty-chart">
                No monthly history was returned by the server.
            </div>
        );
    }

    return (
        <div className="if-chart">
            <div className="if-chart-legend">
                <span><i className="if-legend-intake" /> Intakes</span>
                <span><i className="if-legend-adoptions" /> Adoptions</span>
            </div>

            <div className="if-chart-grid">
                {history.map((month) => {
                    const intake = Number(month.intake) || 0;
                    const adoptions = Number(month.adoptions) || 0;

                    const label = month.month
                        ? new Date(`${month.month}-01T00:00:00`).toLocaleDateString(
                              undefined,
                              { month: "short", year: "2-digit" }
                          )
                        : "—";

                    return (
                        <div className="if-chart-column" key={month.month}>
                            <div className="if-chart-bars">
                                <div
                                    className="if-chart-bar if-chart-bar-intake"
                                    style={{
                                        height: `${(intake / maximum) * 100}%`,
                                    }}
                                    title={`Intakes: ${intake}`}
                                />
                                <div
                                    className="if-chart-bar if-chart-bar-adoptions"
                                    style={{
                                        height: `${(adoptions / maximum) * 100}%`,
                                    }}
                                    title={`Adoptions: ${adoptions}`}
                                />
                            </div>

                            <span className="if-chart-label">{label}</span>
                            <span className="if-chart-values">
                                {intake} / {adoptions}
                            </span>
                        </div>
                    );
                })}
            </div>

            <p className="if-chart-footnote">
                Each column shows intakes / adoptions. Counts are based on
                records returned by the backend.
            </p>
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

    const history = forecast?.history || [];
    const target = forecast?.target;
    const dataQuality = forecast?.dataQuality;

    return (
        <section className="if-page">
            <header className="if-page-header">
                <div>
                    <div className="if-eyebrow">RESCUEBASE · AI ANALYTICS</div>
                    <h2>Intake Forecast</h2>
                    <p>
                        Estimate upcoming shelter intake using historical
                        animal activity and the RESCUEBASE LSTM model.
                    </p>
                </div>

                <button
                    className="if-refresh-button"
                    type="button"
                    onClick={loadForecast}
                    disabled={loading}
                >
                    <span aria-hidden="true">↻</span>
                    {loading ? "Loading..." : "Refresh forecast"}
                </button>
            </header>

            {error && (
                <div className="if-error" role="alert">
                    <div>
                        <strong>Unable to load forecast</strong>
                        <p>{error}</p>
                        <small>
                            Check that Express is running, the forecast route
                            is registered, and the Python AI service is available.
                        </small>
                    </div>

                    <button type="button" onClick={loadForecast}>
                        Try again
                    </button>
                </div>
            )}

            {loading && !forecast ? (
                <div className="if-loading" role="status">
                    <span className="if-spinner" />
                    <strong>Loading intake forecast...</strong>
                    <p>Retrieving shelter history and querying the AI model.</p>
                </div>
            ) : forecast && (
                <>
                    <div className="if-status-line">
                        <span className="if-status-dot" />
                        Forecast service responded successfully
                        {forecast.generatedAt && (
                            <span>
                                Updated{" "}
                                {new Date(forecast.generatedAt).toLocaleString()}
                            </span>
                        )}
                    </div>

                    <div className="if-metrics">
                        <MetricCard
                            label="Predicted intake"
                            value={formatNumber(target?.roundedPredictedIntake)}
                            description={`Estimated animals for ${target?.label || "next month"}`}
                            icon="↗"
                        />

                        <MetricCard
                            label="Model estimate"
                            value={formatNumber(target?.predictedIntake, 2)}
                            description="Raw LSTM output before rounding"
                            icon="⌁"
                        />

                        <MetricCard
                            label="History window"
                            value={`${forecast.dataQuality?.monthsProvided ?? history.length} months`}
                            description="Monthly records sent to the model"
                            icon="▦"
                        />
                    </div>

                    <section className="if-panel">
                        <div className="if-panel-header">
                            <div>
                                <h3>Monthly shelter activity</h3>
                                <p>Historical intake and adoption counts</p>
                            </div>

                            <span className="if-panel-tag">12-month window</span>
                        </div>

                        <MonthlyChart history={history} />
                    </section>

                    <section className="if-panel">
                        <div className="if-panel-header">
                            <div>
                                <h3>Monthly data</h3>
                                <p>Values used to build the model input sequence</p>
                            </div>
                        </div>

                        <div className="if-table-wrap">
                            <table className="if-table">
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
                                            <td>{month.month}</td>
                                            <td>{formatNumber(month.intake)}</td>
                                            <td>{formatNumber(month.adoptions)}</td>
                                            <td>{formatNumber(month.releases)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="if-quality-panel">
                        <div className="if-quality-icon" aria-hidden="true">
                            !
                        </div>

                        <div>
                            <h3>Forecast limitations</h3>

                            {dataQuality?.warnings?.length ? (
                                <ul>
                                    {dataQuality.warnings.map((warning, index) => (
                                        <li key={`${index}-${warning}`}>
                                            {warning}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>
                                    Review the source data before making
                                    operational decisions based on this estimate.
                                </p>
                            )}
                        </div>
                    </section>

                    <footer className="if-footer">
                        Model: {forecast.model || "RESCUEBASE_LSTM_INTAKE"}
                        {" · "}Target: {target?.label || "Next month"}
                        {" · "}Unit: {target?.unit || "animals"}
                    </footer>
                </>
            )}
        </section>
    );
}
