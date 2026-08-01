import { useEffect, useMemo, useState } from "react";

const mockDonations = [
    {
        id: 1,
        itemName: "Premium Dog Food",
        category: "Pet Food",
        quantity: "10 kg",
        status: "Pending",
        submitted: "July 31, 2026",
        delivery: "August 3, 2026",
        image: "https://placehold.co/120x120",
        description:
            "Premium dog food for rescued puppies.",
        remarks: ""
    },
    {
        id: 2,
        itemName: "Pet Bed",
        category: "Supplies",
        quantity: "2 pcs",
        status: "Accepted",
        submitted: "July 27, 2026",
        delivery: "July 30, 2026",
        image: "https://placehold.co/120x120",
        description:
            "Soft washable pet beds.",
        remarks:
            "Thank you! Please bring this on your preferred schedule."
    },
    {
        id: 3,
        itemName: "Pet Shampoo",
        category: "Hygiene",
        quantity: "6 bottles",
        status: "Delivered",
        submitted: "July 20, 2026",
        delivery: "July 22, 2026",
        image: "https://placehold.co/120x120",
        description:
            "Hypoallergenic shampoo.",
        remarks:
            "Donation received successfully."
    }
];

export default function DonationHistory() {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);

    const filtered = useMemo(() => {
        return mockDonations.filter(d =>
            d.itemName.toLowerCase().includes(search.toLowerCase()) ||
            d.category.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    return (
        <div className="donation-history-page">
            <div className="donation-history-header">
                <div>
                    <h1>Donation History</h1>

                    <p>
                        View and track every donation you've submitted.
                    </p>
                </div>
                <input
                    placeholder="Search donation..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="donation-history-grid">
                {filtered.map(item => (
                    <div
                        className="donation-card"
                        key={item.id}
                    >
                        <img
                            src={item.image}
                            alt={item.itemName}
                        />
                        <div className="donation-card-content">
                            <h3>{item.itemName}</h3>

                            <span className="category">
                                {item.category}
                            </span>
                            <p>
                                <strong>Quantity:</strong> {item.quantity}
                            </p>
                            <p>
                                <strong>Submitted:</strong> {item.submitted}
                            </p>
                            <span
                                className={`status ${item.status.toLowerCase()}`}
                            >
                                {item.status}
                            </span>
                            <button
                                onClick={() => setSelected(item)}
                            >
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {selected && (
                <div
                    className="modal-overlay"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2>
                                {selected.itemName}
                            </h2>
                            <button
                                onClick={() => setSelected(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <img
                            src={selected.image}
                            alt={selected.itemName}
                        />
                        <div className="modal-body">
                            <p><strong>Category:</strong> {selected.category}</p>
                            <p><strong>Quantity:</strong> {selected.quantity}</p>
                            <p><strong>Status:</strong> {selected.status}</p>
                            <p><strong>Preferred Delivery:</strong> {selected.delivery}</p>
                            <p><strong>Description:</strong></p>
                            <div className="description">
                                {selected.description}
                            </div>
                            <p><strong>Staff Remarks:</strong></p>
                            <div className="remarks">
                                {selected.remarks || "No remarks yet."}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}