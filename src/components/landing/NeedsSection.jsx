import { useEffect, useState } from "react";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const CARDS_SHOWN = 4;

const PRIORITY_CLASS = {
    Urgent: "is-urgent",
    High: "is-high",
    Medium: "is-medium",
    Low: "is-low",
};

// Hover (or focus) the "i" to see where to bring item donations
function DropOffInfo({ dropOff }) {
    return (
        <span className="needs-info" tabIndex={0} aria-label="Drop-off details">
            i
            <span className="needs-tip" role="tooltip">
                <b>Drop-off point</b>
                {dropOff.address && <span>{dropOff.address}</span>}
                {dropOff.operatingHours && <span>{dropOff.operatingHours}</span>}
                {(dropOff.contactPerson || dropOff.contactNumber) && (
                    <span>
                        {[dropOff.contactPerson, dropOff.contactNumber].filter(Boolean).join(" · ")}
                    </span>
                )}
                {dropOff.instructions && <span className="needs-tip-note">{dropOff.instructions}</span>}
            </span>
        </span>
    );
}

export default function NeedsSection({ onSignup }) {
    const [supplies, setSupplies] = useState([]);
    const [total, setTotal] = useState(0);
    const [dropOff, setDropOff] = useState(null);

    useEffect(() => {
        fetch(`${API}/api/supplies/public`)
            .then((response) => response.json())
            .then((data) => {
                setSupplies(Array.isArray(data.supplies) ? data.supplies : []);
                setTotal(Number(data.total) || 0);
            })
            .catch(() => setSupplies([]));

        fetch(`${API}/api/settings/drop-off`)
            .then((response) => response.json())
            .then((data) => setDropOff(data.dropOff?.enabled && data.dropOff.address ? data.dropOff : null))
            .catch(() => setDropOff(null));
    }, []);

    // Nothing needed right now: leave the section out
    if (supplies.length === 0) return null;

    return (
        <section className="needs-section">
            <div className="donor-heading">
                <h2>What the shelter needs right now</h2>
                <p>Live list from our partner shelters. Every donation is checked by staff before it counts.</p>
            </div>

            <div className="needs-grid">
                {supplies.slice(0, CARDS_SHOWN).map((supply) => {
                    const needed = Number(supply.quantityNeeded) || 0;
                    const received = Number(supply.quantityReceived) || 0;
                    const unit = supply.unit ? ` ${supply.unit}` : "";
                    const percent = needed > 0 ? Math.min(100, (received / needed) * 100) : 0;

                    return (
                        <article className="needs-card" key={supply._id}>
                            <div className="needs-card-top">
                                <div>
                                    <h3>{supply.name}</h3>
                                    <span className="needs-category">
                                        {supply.category}
                                        {supply.unit ? ` · ${supply.unit}` : ""}
                                        {dropOff && <DropOffInfo dropOff={dropOff} />}
                                    </span>
                                </div>
                                <span className={`needs-priority ${PRIORITY_CLASS[supply.priority] || ""}`}>
                                    {supply.priority}
                                </span>
                            </div>

                            <div className="needs-bar">
                                <i style={{ width: `${percent}%` }} />
                            </div>

                            <div className="needs-numbers">
                                <span>
                                    <b>{received.toLocaleString()}</b> of {needed.toLocaleString()}
                                    {unit} received
                                </span>
                                <span>{Math.max(0, needed - received).toLocaleString()} to go</span>
                            </div>

                            {supply.description && <p className="needs-note">{supply.description}</p>}

                            <button type="button" className="needs-donate" onClick={onSignup}>
                                Donate this
                            </button>
                        </article>
                    );
                })}
            </div>

            {total > CARDS_SHOWN && (
                <button type="button" className="needs-more" onClick={onSignup}>
                    See all {total} needed items after you sign in
                </button>
            )}
        </section>
    );
}
