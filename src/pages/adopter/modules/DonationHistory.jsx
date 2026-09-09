import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function DonationHistory() {
    const [donations, setDonations] = useState([]);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const token = localStorage.getItem("token");

    const fetchDonations = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(`${API}/api/donations/my`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to load donation history");
            }

            setDonations(data);
        } catch (error) {
            console.error("Fetching donations history error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    const filtered = useMemo(() => {
        return donations.filter((donation) => {
            const itemName = donation.itemName?.toLowerCase() || "";
            const category = donation.donationType?.toLowerCase() || "";
            const notes = donation.notes?.toLowerCase() || "";
            const query = search.toLowerCase();

            return (
                itemName.includes(query) ||
                category.includes(query) ||
                notes.includes(query)
            )
        })
    }, [donations, search]);

    const formatDate = (date) => {
        if (!date) {
            return "--";
        }

        return new Date(date).toLocaleDateString(
            "en-us",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
            }
        );
    };

    const formatStatus = (status) => {
        if (!status) {
            return "Pending"
        }

        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    useEffect(() => {
        fetchDonations();
    }, []);

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

            {loading && (
                <div className="donation-history-message">
                    Loading donation history...
                </div>
            )}

            {!loading && error && (
                <div className="donation-history-message">
                    {error}
                </div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div className="donation-history-message">
                    {search
                        ? "No donations match your search."
                        : "You have not submitted any donations yet."}
                </div>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className="donation-history-grid">
                    {filtered.map((item) => (
                        <div
                            className="donation-card"
                            key={item._id}
                        >
                            <div className="donation-card-image">
                                <div className="donation-placeholder">
                                    Donation
                                </div>
                            </div>

                            <div className="donation-card-content">
                                <h3>
                                    {item.itemName ||
                                        item.donationType}
                                </h3>

                                <span className="category">
                                    {item.donationType}
                                </span>

                                <p>
                                    <strong>Quantity:</strong>{" "}
                                    {item.quantity}
                                </p>

                                <p>
                                    <strong>Submitted:</strong>{" "}
                                    {formatDate(item.createdAt)}
                                </p>

                                <span
                                    className={`status ${item.status || "pending"
                                        }`}
                                >
                                    {formatStatus(item.status)}
                                </span>

                                <button
                                    onClick={() =>
                                        setSelected(item)
                                    }
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                                {selected.itemName ||
                                    selected.donationType}
                            </h2>

                            <button
                                onClick={() =>
                                    setSelected(null)
                                }
                            >
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">
                            <p>
                                <strong>Category:</strong>{" "}
                                {selected.donationType}
                            </p>

                            <p>
                                <strong>Quantity:</strong>{" "}
                                {selected.quantity}
                            </p>

                            <p>
                                <strong>Amount:</strong>{" "}
                                {selected.amount > 0
                                    ? `₱${selected.amount.toLocaleString()}`
                                    : "In-kind donation"}
                            </p>

                            <p>
                                <strong>Status:</strong>{" "}
                                {formatStatus(selected.status)}
                            </p>

                            <p>
                                <strong>Submitted:</strong>{" "}
                                {formatDate(
                                    selected.createdAt
                                )}
                            </p>

                            {selected.receivedDate && (
                                <p>
                                    <strong>Received:</strong>{" "}
                                    {formatDate(
                                        selected.receivedDate
                                    )}
                                </p>
                            )}

                            <p>
                                <strong>Description:</strong>
                            </p>

                            <div className="description">
                                {selected.notes ||
                                    "No description provided."}
                            </div>

                            <p>
                                <strong>Donation Status:</strong>
                            </p>

                            <div className="remarks">
                                {selected.status === "received"
                                    ? "Donation received successfully."
                                    : selected.status === "cancelled"
                                        ? "This donation has been cancelled."
                                        : "Your donation is currently pending."}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}