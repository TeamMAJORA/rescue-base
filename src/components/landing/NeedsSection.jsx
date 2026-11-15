import { useEffect, useState } from "react";
import { formatDate } from "../../utils/formatDate";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const HEADERS = { "ngrok-skip-browser-warning": "true" };
const CARDS_SHOWN = 4;
const CARDS_SHOWN_ON_PHONE = 2;

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

// Where to bring item donations. Same card shape as the payment card, in orange.
function DropOffCard({ dropOff }) {
    const contact = [dropOff.contactPerson, dropOff.contactNumber].filter(Boolean).join(" · ");

    return (
        <div className="give-card dropoff-card">
            <span className="give-card-label">Bringing items?</span>
            <h3>Drop them off at the shelter</h3>

            <dl className="dropoff-details">
                <dt>Address</dt>
                <dd>{dropOff.address}</dd>
                {dropOff.operatingHours && (
                    <>
                        <dt>Hours</dt>
                        <dd>{dropOff.operatingHours}</dd>
                    </>
                )}
                {contact && (
                    <>
                        <dt>Contact</dt>
                        <dd>{contact}</dd>
                    </>
                )}
            </dl>

            {dropOff.instructions && <p className="dropoff-note">{dropOff.instructions}</p>}
        </div>
    );
}

// The shelter's own payment accounts and QR codes
function DonateOnlineCard({ methods }) {
    const [activeId, setActiveId] = useState("");
    const active = methods.find((method) => method._id === activeId) || methods[0];

    return (
        <div className="give-card donate-online-card">
            <span className="give-card-label">Prefer to give money?</span>
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

const VISIBLE_TAGS = 6;
const NEW_SUPPORTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(date) {
    return Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS);
}

function whenLabel(date) {
    const days = daysSince(date);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days <= 30) return `${days} days ago`;
    return formatDate(date, { withYear: false });
}

function plural(count, word) {
    return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// "16 donations reached the shelter in the last 30 days: 12 item gifts and 4 cash gifts."
function summaryLine({ summary, windowDays }) {
    if (!summary?.donations) return "";
    const parts = [
        summary.itemGifts > 0 && plural(summary.itemGifts, "item gift"),
        summary.cashGifts > 0 && plural(summary.cashGifts, "cash gift"),
    ].filter(Boolean);
    return `${plural(summary.donations, "donation")} reached the shelter in the last ${windowDays} days: ${parts.join(" and ")}.`;
}

// Donors who ticked "Thank me by name" on the donation form, shown as hanging pet ID tags
function SupportersWall({ thanks, onSignup }) {
    const [showAll, setShowAll] = useState(false);
    const supporters = thanks.supporters;
    const visible = showAll ? supporters : supporters.slice(0, VISIBLE_TAGS);
    const summary = summaryLine(thanks);

    if (supporters.length === 0) {
        return (
            <div className="supporters-wall">
                <h3>Special thanks to our supporters</h3>
                <p className="supporters-empty">
                    When you donate, tick “Thank me by name” and you'll be thanked here once the shelter receives it.
                    <button type="button" onClick={onSignup}>Donate and be thanked here →</button>
                </p>
            </div>
        );
    }

    return (
        <div className="thanks-band">
            <span className="thanks-eyebrow">With gratitude</span>
            <h3>{thanks.period === "month" ? "This month's supporters" : "Our recent supporters"}</h3>
            {summary && <p className="thanks-summary">{summary}</p>}

            <ul className="thanks-tags">
                {visible.map((supporter) => (
                    <li key={supporter.id} className="thanks-tag">
                        {daysSince(supporter.receivedAt) < NEW_SUPPORTER_DAYS && (
                            <span className="thanks-tag-new">New</span>
                        )}
                        <span className="thanks-tag-ring" aria-hidden="true" />
                        <b>{supporter.name}</b>
                        <span>gave {supporter.gift}</span>
                        <small>{whenLabel(supporter.receivedAt)}</small>
                    </li>
                ))}
            </ul>

            {supporters.length > VISIBLE_TAGS && (
                <button type="button" className="thanks-more" onClick={() => setShowAll((current) => !current)}>
                    {showAll ? "Show fewer" : `Show all ${supporters.length} supporters`}
                </button>
            )}

            <p className="thanks-footnote">
                Donors choose to be thanked here.{" "}
                <button type="button" onClick={onSignup}>Donate and join them →</button>
            </p>
        </div>
    );
}

// "Help without adopting": what the shelter needs, where to bring it, how to give money, and who has helped
export default function NeedsSection({ onSignup }) {
    const [supplies, setSupplies] = useState([]);
    const [totalSupplies, setTotalSupplies] = useState(0);
    const [dropOff, setDropOff] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [thanks, setThanks] = useState({ period: "month", windowDays: 30, summary: null, supporters: [] });

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

        fetchPublicJSON("/api/donations/supporters")
            .then((data) => Array.isArray(data.supporters) && setThanks(data))
            .catch(() => {});
    }, []);

    // Nothing to ask for and nobody to thank: leave the section out
    if (supplies.length === 0 && paymentMethods.length === 0 && !dropOff && thanks.supporters.length === 0) return null;

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

                    {totalSupplies > CARDS_SHOWN_ON_PHONE && (
                        <button
                            type="button"
                            // Desktop shows 4 cards, so with 3-4 items the button is only needed on phones
                            className={totalSupplies > CARDS_SHOWN ? "needs-more" : "needs-more is-phone-only"}
                            onClick={onSignup}
                        >
                            See all {totalSupplies} needed items after you sign in
                        </button>
                    )}
                </>
            )}

            {(dropOff || paymentMethods.length > 0) && (
                <div className="give-cards">
                    {dropOff && <DropOffCard dropOff={dropOff} />}
                    {paymentMethods.length > 0 && <DonateOnlineCard methods={paymentMethods} />}
                </div>
            )}

            <SupportersWall thanks={thanks} onSignup={onSignup} />
        </section>
    );
}
