import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

const emptyDonationForm = {
    donorName: "",
    donorEmail: "",
    donationType: "Money",
    amount: "",
    itemName: "",
    quantity: 1,
    notes: "",
    status: "pending",
};

export default function Donations() {
    const [donations, setDonations] = useState([]);
    const [donationForm, setDonationForm] = useState(emptyDonationForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const totalDonations = donations.length;

    const pendingDonations = useMemo(() => {
        return donations.filter((donation) => donation.status === "pending").length;
    }, [donations]);

    const receivedDonations = useMemo(() => {
        return donations.filter((donation) => donation.status === "received").length;
    }, [donations]);

    const totalMoney = useMemo(() => {
        return donations
            .filter((donation) => donation.status === "received")
            .reduce((total, donation) => total + Number(donation.amount || 0), 0);
    }, [donations]);

    async function fetchDonations() {
        try {
            setLoading(true);
            setMessage("");

            const response = await fetch(`${API}/api/donations`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to fetch donations.");
                return;
            }

            setDonations(data.donations || []);
        } catch (error) {
            console.error("Fetch donations error:", error);
            setMessage("Server error while fetching donations.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitDonation(e) {
        e.preventDefault();

        try {
            setSubmitting(true);
            setMessage("");

            const savedUser = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");

            const payload = {
                ...donationForm,
                amount: Number(donationForm.amount || 0),
                quantity: Number(donationForm.quantity || 1),
                adminName: savedUser.name || savedUser.username || "Admin User",
                adminEmail: savedUser.email || "admin",
            };

            const url = editingId
                ? `${API}/api/donations/${editingId}`
                : `${API}/api/donations`;

            const method = editingId ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to save donation record.");
                return;
            }

            setMessage(editingId ? "Donation updated successfully." : "Donation created successfully.");
            setDonationForm(emptyDonationForm);
            setEditingId(null);
            fetchDonations();
        } catch (error) {
            console.error("Save donation error:", error);
            setMessage("Server error while saving donation.");
        } finally {
            setSubmitting(false);
        }
    }

    function handleEditDonation(donation) {
        setEditingId(donation._id);

        setDonationForm({
            donorName: donation.donorName || "",
            donorEmail: donation.donorEmail || "",
            donationType: donation.donationType || "Money",
            amount: donation.amount || "",
            itemName: donation.itemName || "",
            quantity: donation.quantity || 1,
            notes: donation.notes || "",
            status: donation.status || "pending",
        });

        setMessage("");
    }

    function handleCancelEdit() {
        setEditingId(null);
        setDonationForm(emptyDonationForm);
        setMessage("");
    }

    async function handleUpdateStatus(donationId, status) {
        try {
            setMessage("");

            const response = await fetch(`${API}/api/donations/${donationId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to update donation status.");
                return;
            }

            setMessage("Donation status updated.");
            fetchDonations();
        } catch (error) {
            console.error("Update donation status error:", error);
            setMessage("Server error while updating donation status.");
        }
    }

    async function handleDeleteDonation(donationId) {
        const confirmed = window.confirm("Are you sure you want to delete this donation record?");

        if (!confirmed) return;

        try {
            setMessage("");

            const response = await fetch(`${API}/api/donations/${donationId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to delete donation record.");
                return;
            }

            setMessage("Donation deleted successfully.");
            fetchDonations();
        } catch (error) {
            console.error("Delete donation error:", error);
            setMessage("Server error while deleting donation.");
        }
    }

    function formatDate(dateValue) {
        if (!dateValue) return "Not received yet";

        return new Date(dateValue).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    useEffect(() => {
        fetchDonations();
    }, []);

    return (
        <section className="admin-donation-page">
            <div className="admin-donation-stats">
                <article className="admin-stat-card">
                    <span>Total Donations</span>
                    <strong>{totalDonations}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Pending</span>
                    <strong>{pendingDonations}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Received</span>
                    <strong>{receivedDonations}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Money Received</span>
                    <strong>₱{totalMoney.toLocaleString()}</strong>
                </article>
            </div>

            <section className="admin-panel admin-donation-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Donations</h2>
                        <p>Record and manage money, food, medicine, and supply donations.</p>
                    </div>

                    <button type="button" onClick={fetchDonations}>
                        Refresh
                    </button>
                </div>

                {message && <p className="admin-donation-message">{message}</p>}

                <form className="admin-donation-form" onSubmit={handleSubmitDonation}>
                    <div className="admin-donation-form-title">
                        <h3>{editingId ? "Update Donation" : "Create Donation Record"}</h3>

                        {editingId && (
                            <button type="button" onClick={handleCancelEdit}>
                                Cancel Edit
                            </button>
                        )}
                    </div>

                    <label>
                        Donor Name
                        <input
                            value={donationForm.donorName}
                            onChange={(e) =>
                                setDonationForm({
                                    ...donationForm,
                                    donorName: e.target.value,
                                })
                            }
                            required
                        />
                    </label>

                    <label>
                        Donor Email
                        <input
                            type="email"
                            value={donationForm.donorEmail}
                            onChange={(e) =>
                                setDonationForm({
                                    ...donationForm,
                                    donorEmail: e.target.value,
                                })
                            }
                        />
                    </label>

                    <label>
                        Donation Type
                        <select
                            value={donationForm.donationType}
                            onChange={(e) =>
                                setDonationForm({
                                    ...donationForm,
                                    donationType: e.target.value,
                                })
                            }
                        >
                            <option value="Money">Money</option>
                            <option value="Dog Food">Dog Food</option>
                            <option value="Cat Food">Cat Food</option>
                            <option value="Medicine">Medicine</option>
                            <option value="Medical Supplies">Medical Supplies</option>
                            <option value="Other Supplies">Other Supplies</option>
                            <option value="Other">Other</option>
                        </select>
                    </label>

                    <label>
                        Amount
                        <input
                            type="number"
                            min="0"
                            value={donationForm.amount}
                            onChange={(e) =>
                                setDonationForm({
                                    ...donationForm,
                                    amount: e.target.value,
                                })
                            }
                            placeholder="For money donations"
                        />
                    </label>

                    <label>
                        Item Name
                        <input
                            value={donationForm.itemName}
                            onChange={(e) =>
                                setDonationForm({
                                    ...donationForm,
                                    itemName: e.target.value,
                                })
                            }
                            placeholder="Example: Dog food sack"
                        />
                    </label>

                    <label>
                        Quantity
                        <input
                            type="number"
                            min="1"
                            value={donationForm.quantity}
                            onChange={(e) =>
                                setDonationForm({
                                    ...donationForm,
                                    quantity: e.target.value,
                                })
                            }
                        />
                    </label>

                    <label>
                        Status
                        <select
                            value={donationForm.status}
                            onChange={(e) =>
                                setDonationForm({
                                    ...donationForm,
                                    status: e.target.value,
                                })
                            }
                        >
                            <option value="pending">Pending</option>
                            <option value="received">Received</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </label>

                    <label className="admin-donation-notes">
                        Notes
                        <textarea
                            value={donationForm.notes}
                            onChange={(e) =>
                                setDonationForm({
                                    ...donationForm,
                                    notes: e.target.value,
                                })
                            }
                            placeholder="Additional donation details"
                        />
                    </label>

                    <button type="submit" disabled={submitting}>
                        {submitting ? "Saving..." : editingId ? "Update Donation" : "Save Donation"}
                    </button>
                </form>

                <section className="admin-donation-list-section">
                    <h3>Donation Records</h3>

                    {loading ? (
                        <p className="admin-empty">Loading donations...</p>
                    ) : donations.length === 0 ? (
                        <p className="admin-empty">No donation records found.</p>
                    ) : (
                        <div className="admin-donation-list">
                            {donations.map((donation) => (
                                <article className="admin-donation-card" key={donation._id}>
                                    <div className="admin-donation-main">
                                        <h3>{donation.donorName}</h3>
                                        <p>{donation.donorEmail || "No email provided"}</p>
                                        <small>ID: {donation._id}</small>
                                    </div>

                                    <div className="admin-donation-details">
                                        <span>{donation.donationType}</span>
                                        <span>{donation.status}</span>
                                        <span>
                                            {donation.donationType === "Money"
                                                ? `₱${Number(donation.amount || 0).toLocaleString()}`
                                                : `${donation.quantity || 1} item(s)`}
                                        </span>
                                    </div>

                                    <div className="admin-donation-extra">
                                        <p>
                                            <strong>Item:</strong> {donation.itemName || "N/A"}
                                        </p>
                                        <p>
                                            <strong>Received:</strong> {formatDate(donation.receivedDate)}
                                        </p>
                                        <p>
                                            <strong>Notes:</strong> {donation.notes || "No notes"}
                                        </p>
                                    </div>

                                    <div className="admin-donation-actions">
                                        <button type="button" onClick={() => handleEditDonation(donation)}>
                                            Edit
                                        </button>

                                        {donation.status !== "received" && (
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateStatus(donation._id, "received")}
                                            >
                                                Mark Received
                                            </button>
                                        )}

                                        {donation.status !== "cancelled" && (
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateStatus(donation._id, "cancelled")}
                                            >
                                                Cancel
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            className="delete"
                                            onClick={() => handleDeleteDonation(donation._id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </section>
        </section>
    );
}