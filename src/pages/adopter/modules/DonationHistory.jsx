import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

const FILTERS = [
    { key: "all", label: "All" },
    { key: "inkind", label: "In-Kind" },
    { key: "monetary", label: "Monetary" },
    { key: "pending", label: "Pending" },
    { key: "received", label: "Received" },
];

function isMoney(donation) {
    return donation.donationType === "Money";
}

// Older monetary records stored the amount in `quantity`
function moneyValue(donation) {
    return Number(donation.amount) || Number(donation.quantity) || 0;
}

function peso(value) {
    return `₱${Number(value || 0).toLocaleString("en-PH")}`;
}

function formatDate(date) {
    if (!date) return "--";

    return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatStatus(status) {
    if (!status) return "Pending";
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function rowTitle(donation) {
    return isMoney(donation)
        ? peso(moneyValue(donation))
        : donation.itemName || donation.donationType;
}

function rowSubtitle(donation) {
    const status = donation.status || "pending";

    if (isMoney(donation)) {
        return donation.paymentMethod
            ? `Contribution via ${donation.paymentMethod}`
            : "Monetary contribution";
    }

    if (status === "pending") return "Waiting for staff to confirm receipt";
    if (status === "cancelled") return "This donation was cancelled";

    return `${donation.quantity || 1} × ${donation.donationType}`;
}

function DonationIcon({ money }) {
    return (
        <span className="dh-row-icon" aria-hidden="true">
            {money ? (
                "₱"
            ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
                    <path d="M3 8v8l9 5 9-5V8" />
                    <path d="M12 13v8" />
                </svg>
            )}
        </span>
    );
}
const KPI_ICONS = {
    total: (
        <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
    ),
    pending: (
        <>
            <path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2" />
            <path d="M18 2v4h-4M6 22v-4h4" />
        </>
    ),
    received: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    money: (
        <>
            <path d="M8 21V4h5a4.5 4.5 0 0 1 0 9H8" />
            <path d="M5 8h13M5 11h13" />
        </>
    ),
};

function Kpi({ icon, value, label, tone }) {
    return (
        <div className="dh-stat">
            <span className={`dh-stat-icon ${tone || ""}`}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {KPI_ICONS[icon]}
                </svg>
            </span>
            <span className="dh-stat-text">
                <strong>{value}</strong>
                <small>{label}</small>
            </span>
        </div>
    );
}

export default function DonationHistory({ onMakeDonation }) {
    const [donations, setDonations] = useState([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const token = localStorage.getItem("token");

    const fetchDonations = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(`${API}/api/donations/my`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to load donation history");
            }

            setDonations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Fetching donations history error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDonations();
    }, []);

    const stats = useMemo(() => {
        const pending = donations.filter((d) => (d.status || "pending") === "pending").length;
        const received = donations.filter((d) => d.status === "received");
        const monetaryGiven = received
            .filter(isMoney)
            .reduce((total, d) => total + moneyValue(d), 0);

        return {
            total: donations.length,
            pending,
            received: received.length,
            monetaryGiven,
        };
    }, [donations]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return donations
            .filter((d) => {
                const status = d.status || "pending";

                if (filter === "inkind" && isMoney(d)) return false;
                if (filter === "monetary" && !isMoney(d)) return false;
                if (filter === "pending" && status !== "pending") return false;
                if (filter === "received" && status !== "received") return false;

                if (!query) return true;

                return [d.itemName, d.donationType, d.notes, d.paymentMethod]
                    .some((value) => value?.toLowerCase().includes(query));
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [donations, search, filter]);

    const hasNoDonations = !loading && !error && donations.length === 0;

    return (
        <div className="dh-page">
            <div className="dh-hero">
                <span>Donation</span>
                <h1>Look at all the love you've unleashed!</h1>
                <p>
                    Behind every transaction below is a wagging tail,
                    a soothing purr, and a rescued life.
                </p>
            </div>

            <div className="dh-stats">
                <Kpi icon="total" 
                    value={stats.total} 
                        label="Total Donations" />
                <Kpi icon="pending" 
                    value={stats.pending} 
                        label="Pending Review" />
                <Kpi icon="received" 
                    value={stats.received} 
                        label="Received" 
                            tone="is-green" />
                <Kpi icon="money" 
                    value={peso(stats.monetaryGiven)} 
                        label="Monetary Given" 
                            tone="is-gold" />
            </div>

            <section className="dh-panel">
                <div className="dh-toolbar">
                    <div className="dh-filters">
                        {FILTERS.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                className={filter === item.key ? "active" : ""}
                                onClick={() => setFilter(item.key)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <input
                        className="dh-search"
                        placeholder="Search donation..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {loading && <p className="dh-message">Loading donation history...</p>}

                {!loading && error && <p className="dh-message">{error}</p>}

                {hasNoDonations && (
                    <div className="dh-empty">
                        <div className="dh-empty-icon" aria-hidden="true">🐾</div>
                        <h3>No Donations Yet</h3>
                        <p>Your donations will appear here once you submit one.</p>
                        {onMakeDonation && (
                            <button type="button" onClick={onMakeDonation}>
                                Make a Donation
                            </button>
                        )}
                    </div>
                )}

                {!loading && !error && donations.length > 0 && filtered.length === 0 && (
                    <p className="dh-message">No donations match your filters.</p>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="dh-list">
                        {filtered.map((item) => {
                            const money = isMoney(item);
                            const status = item.status || "pending";

                            return (
                                <button
                                    type="button"
                                    className="dh-row"
                                    key={item._id}
                                    onClick={() => setSelected(item)}
                                >
                                    <DonationIcon money={money} />

                                    <span className="dh-row-text">
                                        <strong>{rowTitle(item)}</strong>
                                        <small>{rowSubtitle(item)}</small>
                                    </span>

                                    <span className={`dh-type ${money ? "is-money" : ""}`}>
                                        {money ? "Monetary" : "In-Kind"}
                                    </span>

                                    <span className="dh-date">{formatDate(item.createdAt)}</span>

                                    <span className={`dh-status is-${status}`}>
                                        {formatStatus(status)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            {selected && (
                <div className="dh-modal-overlay" onClick={() => setSelected(null)}>
                    <div className="dh-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="dh-modal-header">
                            <h2>{rowTitle(selected)}</h2>
                            <button type="button" onClick={() => setSelected(null)}>
                                ✕
                            </button>
                        </div>

                        <div className="dh-modal-body">
                            {(selected.image || selected.proofOfPayment) && (
                                <img
                                    src={selected.proofOfPayment || selected.image}
                                    alt="Donation proof"
                                />
                            )}

                            <dl>
                                <dt>Type</dt>
                                <dd>{isMoney(selected) ? "Monetary" : "In-Kind"}</dd>

                                <dt>Category</dt>
                                <dd>{selected.donationType}</dd>

                                {isMoney(selected) ? (
                                    <>
                                        <dt>Amount</dt>
                                        <dd>{peso(moneyValue(selected))}</dd>
                                        <dt>Payment Method</dt>
                                        <dd>{selected.paymentMethod || "--"}</dd>
                                    </>
                                ) : (
                                    <>
                                        <dt>Quantity</dt>
                                        <dd>{selected.quantity}</dd>
                                    </>
                                )}

                                <dt>Status</dt>
                                <dd>{formatStatus(selected.status)}</dd>

                                <dt>Submitted</dt>
                                <dd>{formatDate(selected.createdAt)}</dd>

                                {selected.receivedDate && (
                                    <>
                                        <dt>Received</dt>
                                        <dd>{formatDate(selected.receivedDate)}</dd>
                                    </>
                                )}
                            </dl>

                            {selected.notes && (
                                <div className="dh-notes">{selected.notes}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
