import { useEffect, useState } from "react";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const donors = [
    {
        name: "Marcus Vance",
        amount: "₱5,000",
        description: "500 lbs of kibble and warm fluffy blankets.",
    },
    {
        name: "Marisol T.",
        amount: "₱4,500",
        description: "50 harnesses & leashes.",
    },
    {
        name: "Chloe Bennett",
        amount: "₱3,500",
        description: "Pet puppy food & beds.",
    },
    {
        name: "Elena Rostova",
        amount: "₱2,000",
        description: "Puppy food & water.",
    },
    {
        name: "Maya Lee",
        amount: "₱1,200",
        description: "Kibble and water.",
    },
];

// Card next to the donor wall: the shelter's real payment accounts and QR codes
function DonateOnlineCard() {
    const [methods, setMethods] = useState([]);
    const [activeId, setActiveId] = useState("");

    useEffect(() => {
        fetch(`${API}/api/payment-methods/public`)
            .then((response) => response.json())
            .then((data) => setMethods(Array.isArray(data.methods) ? data.methods : []))
            .catch(() => setMethods([]));
    }, []);

    if (methods.length === 0) return null;

    const active = methods.find((method) => method._id === activeId) || methods[0];

    return (
        <div className="donate-online-card">
            <span className="sponsor-label">Donate Online</span>
            <h3>Give through</h3>

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

export default function DonorSection() {
    return (
        <section className="donor-section">
            <div className="donor-heading">
                <h2>Held up by people who give</h2>

                <p>
                    Thank you to the generous donors funding our partnered shelters' food, medicine, and care
                    <br />
                    this month!
                </p>
            </div>

            <div className="donor-content">
                <div className="sponsor-card">
                    <span className="sponsor-label">
                        Sponsor of the Month
                    </span>

                    <h3>John Doe</h3>

                    <p>
                        Fully funded emergency supplies for
                        <br />
                        three rescued strays this month.
                    </p>

                    <strong>₱6,700</strong>
                </div>

                <div className="donor-wall">
                    <h3>Donor Wall</h3>

                    <div className="donor-list">
                        {donors.map((donor, index) => (
                            <div
                                className="donor-item"
                                key={donor.name}
                            >
                                <span className="donor-number">
                                    {index + 1}
                                </span>

                                <div className="donor-avatar">
                                    {donor.name.charAt(0)}
                                </div>

                                <div className="donor-info">
                                    <strong>{donor.name}</strong>

                                    <span>
                                        Donated {donor.amount} for {donor.description}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DonateOnlineCard />
            </div>
        </section>
    );
}