import { useEffect, useState } from "react";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const HEADERS = { "ngrok-skip-browser-warning": "true" };
const CARDS_SHOWN = 4;

const PRIORITY_CLASS = {
    Urgent: "is-urgent",
    High: "is-high",
    Medium: "is-medium",
    Low: "is-low",
};

async function fetchPublicJSON(path) {
    const response = await fetch(`${API}${path}`, { headers: HEADERS });
    if (!response.ok) throw new Error(`${path} failed`);
    return response.json();
}

function SupplyCard({ supply, onSignup }) {
    const needed = Number(supply.quantityNeeded) || 0;
    const received = Number(supply.quantityReceived) || 0;
    const unit = supply.unit ? ` ${supply.unit}` : "";
    const percent = needed > 0 ? Math.min(100, (received / needed) * 100) : 0;

    return (
        <article className="needs-card">
            <div className="needs-card-top">
                <div>
                    <h3>{supply.name}</h3>
                    <span className="needs-category">
                        {supply.category}
                        {supply.unit ? ` · ${supply.unit}` : ""}
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
                I'll donate this
            </button>
        </article>
    );
}

// The shelter's own payment accounts and QR codes
function DonateOnlineCard({ methods }) {
    const [activeId, setActiveId] = useState("");
    const active = methods.find((method) => method._id === activeId) || methods[0];

    return (
        <div className="donate-online-card">
            <span className="sponsor-label">Prefer to give money?</span>
            <h3>Send to the shelter's official account</h3>

            <div className="donate-online-tabs" role="tablist" aria-label="Payment method">
                {methods.map((method) => (
                    <button
                        key={method._id}
                        type="button"
                        role="tab"
                        aria-selected={method._id === active._id}
                        className={method._id === active._id ? "is-active" : ""}
                        onClick={() => setActiveId(method._id)}
                    >
                        {method.method_type}
                    </button>
                ))}
            </div>

            <div className="donate-online-body">
                {active.qr_image_url && (
                    <img
                        className="donate-online-qr"
                        src={active.qr_image_url}
                        alt={`${active.method_type} QR code`}
                    />
                )}
                <div className="donate-online-account">
                    <b>{active.account_name}</b>
                    <strong>{active.account_number}</strong>
                    <span>Scan or send to this number</span>
                </div>
            </div>
        </div>
    );
}

// "Help without adopting": what the shelter needs, where to bring it, and how to give money
export default function NeedsSection({ onSignup }) {
    const [supplies, setSupplies] = useState([]);
    const [totalSupplies, setTotalSupplies] = useState(0);
    const [dropOff, setDropOff] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);

    useEffect(() => {
        fetchPublicJSON("/api/supplies/public")
            .then((data) => {
                setSupplies(Array.isArray(data.supplies) ? data.supplies : []);
                setTotalSupplies(Number(data.total) || 0);
            })
            .catch(() => setSupplies([]));

        fetchPublicJSON("/api/settings/drop-off")
            .then((data) => setDropOff(data.dropOff?.enabled && data.dropOff.address ? data.dropOff : null))
            .catch(() => setDropOff(null));

        fetchPublicJSON("/api/payment-methods/public")
            .then((data) => setPaymentMethods(Array.isArray(data.methods) ? data.methods : []))
            .catch(() => setPaymentMethods([]));
    }, []);

    // Nothing to ask for: leave the section out
    if (supplies.length === 0 && paymentMethods.length === 0) return null;

    const dropOffContact = dropOff
        ? [dropOff.contactPerson, dropOff.contactNumber].filter(Boolean).join(" · ")
        : "";

    return (
        <section className="needs-section" id="help">
            <div className="donor-heading">
                <h2>Not ready to adopt? You can still help today.</h2>
                <p>
                    Here's what the shelter is running low on right now. Every item and gift is
                    received and recorded by shelter staff.
                </p>
            </div>

            {supplies.length > 0 && (
                <>
                    <div className="needs-grid">
                        {supplies.slice(0, CARDS_SHOWN).map((supply) => (
                            <SupplyCard key={supply._id} supply={supply} onSignup={onSignup} />
                        ))}
                    </div>

                    <p className="needs-account-note">
                        A free account lets you pledge an item so the shelter knows it's coming.
                    </p>

                    {totalSupplies > CARDS_SHOWN && (
                        <button type="button" className="needs-more" onClick={onSignup}>
                            See all {totalSupplies} needed items after you sign in
                        </button>
                    )}
                </>
            )}

            {dropOff && (
                <div className="needs-dropoff">
                    <b>Drop-off point</b>
                    <span>{dropOff.address}</span>
                    {dropOff.operatingHours && <span>{dropOff.operatingHours}</span>}
                    {dropOffContact && <span>{dropOffContact}</span>}
                    {dropOff.instructions && <span className="needs-dropoff-note">{dropOff.instructions}</span>}
                </div>
            )}

            {paymentMethods.length > 0 && <DonateOnlineCard methods={paymentMethods} />}
        </section>
    );
}
