import assets from "../../data/assets.json";

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

export default function DonorSection({ onSignup }) {
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
            </div>

            <button
                className="donor-button"
                type="button"
                onClick={onSignup}
            >
                Donate

                <img
                    src={assets.icons.donate}
                    alt=""
                />
            </button>
        </section>
    );
}