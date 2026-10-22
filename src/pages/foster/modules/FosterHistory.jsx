import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

// Line icons (same style as the other foster pages)
const ICONS = {
    heart: <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />,
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    back: <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />,
    paw: (
        <>
            <circle cx="11" cy="4" r="2" />
            <circle cx="18" cy="8" r="2" />
            <circle cx="4" cy="8" r="2" />
            <path d="M8 14c0-2 2-4 4-4s4 2 4 4-1 6-4 6-4-4-4-6z" />
        </>
    ),
    calendar: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
        </>
    ),
    flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
    report: (
        <>
            <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
            <path d="M14 3v5h5M9 13h6M9 17h6" />
        </>
    ),
};

function Icon({ name, size = 16 }) {
    return (
        <svg
            className="ao-icon"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {ICONS[name]}
        </svg>
    );
}

const DAY = 24 * 60 * 60 * 1000;

// How the stay ended: adopted (pet found a home) > returned early > completed
function outcomeOf(item) {
    if (item.animalId?.adoptionStatus === "adopted") return "adopted";
    if (item.status === "returned") return "returned";
    return "completed";
}

const OUTCOME_LABEL = { adopted: "Adopted", returned: "Returned early", completed: "Completed" };

function daysOfCare(item) {
    const start = new Date(item.startDate || item.createdAt).getTime();
    const end = new Date(item.endDate || Date.now()).getTime();
    return Math.max(1, Math.round((end - start) / DAY));
}

function shortDate(value) {
    return value
        ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";
}

function longDate(value) {
    return value
        ? new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "—";
}

export default function FosterHistory() {
    const savedUser = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");
    const fosterEmail = String(savedUser.email || "").trim().toLowerCase();
    const token = localStorage.getItem("token");

    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [message, setMessage] = useState("");
    const [filter, setFilter] = useState("all");
    const [newestFirst, setNewestFirst] = useState(true);

    async function loadHistory() {
        try {
            setLoading(true);

            const response = await fetch(`${API}/api/foster/assignments/me/history`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                setHistory([]);
                setMessage(data.message || "Unable to load foster history.");
                return;
            }

            setHistory(data.history || []);
            setMessage("");
        } catch (error) {
            console.error(error);
            setHistory([]);
            setMessage("Server error while loading foster history.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (fosterEmail) loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <section className="foster-panel">
                <div className="foster-loading">Loading foster history...</div>
            </section>
        );
    }

    // ----- Stats -----
    const totalDays = history.reduce((sum, item) => sum + daysOfCare(item), 0);
    const counts = { completed: 0, returned: 0, adopted: 0 };
    history.forEach((item) => { counts[outcomeOf(item)] += 1; });

    const stats = [
        { icon: "clock", label: "Days of care", value: totalDays },
        { icon: "home", label: "Adopted from your care", value: counts.adopted },
        { icon: "back", label: "Returned early", value: counts.returned },
    ];

    // ----- Filters -----
    const tabs = [
        { value: "all", label: "All", count: history.length },
        { value: "completed", label: "Completed", count: counts.completed },
        { value: "returned", label: "Returned", count: counts.returned },
        { value: "adopted", label: "Adopted", count: counts.adopted },
    ];

    const visible = history
        .filter((item) => filter === "all" || outcomeOf(item) === filter)
        .sort((a, b) => {
            const diff = new Date(b.endDate || 0) - new Date(a.endDate || 0);
            return newestFirst ? diff : -diff;
        });

    return (
        <section className="ao-page foster-history-page">
            <div className="foster-section-heading fh-heading">
                <div>
                    <span>Foster Records</span>
                    <h2>Foster History</h2>
                </div>
            </div>

            {/* Stats strip */}
            <div className="ao-strip">
                <div className="ao-strip-cta">
                    <div>
                        <b>{history.length}</b>
                        <small>{history.length === 1 ? "Pet fostered" : "Pets fostered"}</small>
                    </div>
                    <Icon name="heart" size={28} />
                </div>

                {stats.map((stat) => (
                    <div className="ao-strip-item" key={stat.label}>
                        <div className="ao-strip-label">
                            <Icon name={stat.icon} />
                            {stat.label}
                        </div>
                        <div className="ao-strip-value">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters + sort */}
            <div className="fh-toolbar">
                <div className="ao-tabs" role="tablist">
                    {tabs.map((tab) => (
                        <button
                            type="button"
                            key={tab.value}
                            role="tab"
                            aria-selected={filter === tab.value}
                            className={filter === tab.value ? "active" : ""}
                            onClick={() => setFilter(tab.value)}
                        >
                            {tab.label}
                            {tab.count > 0 && <i>{tab.count}</i>}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    className="fh-sort"
                    onClick={() => setNewestFirst((value) => !value)}
                >
                    {newestFirst ? "Newest first" : "Oldest first"} ⇅
                </button>
            </div>

            {message && <div className="assignment-message">{message}</div>}

            {/* List */}
            {visible.length === 0 ? (
                <div className="ao-card fh-empty">
                    <span className="fh-empty-icon"><Icon name="paw" size={24} /></span>
                    <b>{history.length === 0 ? "No foster history yet" : "Nothing here"}</b>
                    <p>
                        {history.length === 0
                            ? "Pets you finish fostering will appear here."
                            : "No fosters match this filter."}
                    </p>
                </div>
            ) : (
                <div className="fh-list">
                    {visible.map((item) => {
                        const outcome = outcomeOf(item);
                        const days = daysOfCare(item);
                        const care = String(item.careInstructions || "")
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .join(" · ");

                        return (
                            <article className="ao-card fh-card" key={item._id}>
                                <span className="fh-photo">
                                    {item.petImage ? (
                                        <img src={item.petImage} alt={item.petName} />
                                    ) : (
                                        <Icon name="paw" size={36} />
                                    )}
                                </span>

                                <div className="fh-body">
                                    <div className="fh-head">
                                        <div>
                                            <h3>{item.petName}</h3>
                                            <small>{item.petBreed || "Unknown breed"}</small>
                                        </div>
                                        <span className={`fh-pill is-${outcome}`}>{item.endReason === "adopted_by_foster" ? "Adopted by you" : OUTCOME_LABEL[outcome]}</span>
                                    </div>

                                    <div className="fh-facts">
                                        <div className="fh-fact">
                                            <Icon name="calendar" size={18} />
                                            <div>
                                                <small>Started</small>
                                                <b>{longDate(item.startDate)}</b>
                                            </div>
                                        </div>
                                        <div className="fh-fact">
                                            <Icon name="flag" size={18} />
                                            <div>
                                                <small>{outcome === "returned" ? "Returned" : "Completed"}</small>
                                                <b>{longDate(item.endDate)}</b>
                                            </div>
                                        </div>
                                        <div className="fh-fact">
                                            <Icon name="clock" size={18} />
                                            <div>
                                                <small>Time in your care</small>
                                                <b>{days} {days === 1 ? "day" : "days"}</b>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="fh-care">
                                        <Icon name="report" size={16} />
                                        <div>
                                            <small>
                                                {outcome === "returned" && item.returnRequest?.reason
                                                    ? `Returned early · ${item.returnRequest.reason}`
                                                    : "Care instructions"}
                                            </small>
                                            <p>{care || "No care instructions were given."}</p>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}