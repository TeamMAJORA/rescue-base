import { useEffect, useMemo, useState } from "react";
import { isAdmin } from "../../../utils/auth";


// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

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
    const [showForm, setShowForm] = useState(false);
    const token = localStorage.getItem("token");

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

            const response = await fetch(`${API}/api/donations`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
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
                    Authorization: `Bearer ${token}`
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
            setShowForm(false);
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
        setShowForm(true);
    }

    function handleCancelEdit() {
        setShowForm(false);
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
                    Authorization: `Bearer ${token}`
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
        const confirmed = await askConfirm({ title: "Delete this donation record?", message: "This can't be undone.", confirmLabel: "Delete", danger: true });

        if (!confirmed) return;

        try {
            setMessage("");

            const response = await fetch(`${API}/api/donations/${donationId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                },
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

    // ----- Search and filters -----
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const DONATION_TYPES = ["Money", "Dog Food", "Cat Food", "Medicine", "Medical Supplies", "Other Supplies", "Other"];
    const STATUS_LABEL = { pending: "Pending", received: "Received", cancelled: "Cancelled" };

    const visibleDonations = donations.filter((donation) => {
        const term = search.trim().toLowerCase();
        const text = `${donation.donorName || ""} ${donation.donorEmail || ""} ${donation.itemName || ""}`.toLowerCase();

        if (term && !text.includes(term)) return false;
        if (typeFilter !== "all" && donation.donationType !== typeFilter) return false;
        if (statusFilter !== "all" && donation.status !== statusFilter) return false;
        return true;
    });

    const isMoney = donationForm.donationType === "Money";
    const messageTone = /fail|error|required|invalid/i.test(message) ? "error" : "success";

    function initials(name) {
        return (
            String(name || "?")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase() || "?"
        );
    }

    function openNewForm() {
        setEditingId(null);
        setDonationForm(emptyDonationForm);
        setMessage("");
        setShowForm(true);
    }

    return (
        <section className="um-page">
            {/* Stats */}
            <div className="um-strip">
                <div className="um-strip-total">
                    <b>{totalDonations}</b>
                    <small>Total donations</small>
                </div>
                <div>
                    <small>Pending</small>
                    <b>{pendingDonations}</b>
                </div>
                <div>
                    <small>Received</small>
                    <b>{receivedDonations}</b>
                </div>
                <div>
                    <small>Money received</small>
                    <b>₱{totalMoney.toLocaleString()}</b>
                </div>
            </div>

            {message && !showForm && <p className={`gs-alert ${messageTone} um-message`}>{message}</p>}

            <section className="gs-card">
                <div className="um-list-head">
                    <h3>
                        <span className="gs-mark">Donation records</span>
                    </h3>

                    <button type="button" className="gs-btn primary" onClick={openNewForm}>
                        + Record donation
                    </button>
                </div>

                <div className="um-tools">
                    <input
                        type="search"
                        className="um-search"
                        placeholder="Search donor or item"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Donation type">
                        <option value="all">All types</option>
                        {DONATION_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="rp-filters dn-tabs">
                    {[
                        ["all", "All"],
                        ["pending", "Pending"],
                        ["received", "Received"],
                        ["cancelled", "Cancelled"],
                    ].map(([value, label]) => (
                        <button
                            type="button"
                            key={value}
                            className={statusFilter === value ? "on" : ""}
                            onClick={() => setStatusFilter(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <p className="rp-empty">
                        <span className="ao-spinner" /> Loading donations...
                    </p>
                ) : visibleDonations.length === 0 ? (
                    <p className="rp-empty">
                        {donations.length === 0 ? "No donations recorded yet." : "No donations match your search."}
                    </p>
                ) : (
                    <div className="um-table-wrap">
                        <table className="um-table">
                            <thead>
                                <tr>
                                    <th>Donor</th>
                                    <th>Type</th>
                                    <th>Amount / items</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th className="um-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleDonations.map((donation) => {
                                    const money = donation.donationType === "Money";

                                    return (
                                        <tr key={donation._id} className={donation.status === "cancelled" ? "is-off" : ""}>
                                            <td>
                                                <div className="um-who">
                                                    <span className="um-avatar">{initials(donation.donorName)}</span>
                                                    <div>
                                                        <b>{donation.donorName || "Anonymous"}</b>
                                                        <span>{donation.donorEmail || "No email"}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`dn-type ${money ? "is-money" : ""}`}>{donation.donationType}</span>
                                            </td>
                                            <td className="dn-amount">
                                                <b>
                                                    {money
                                                        ? `₱${Number(donation.amount || 0).toLocaleString()}`
                                                        : `${donation.quantity || 1} item${Number(donation.quantity || 1) === 1 ? "" : "s"}`}
                                                </b>
                                                <span>{money ? donation.paymentMethod || "" : donation.itemName || ""}</span>
                                            </td>
                                            <td>
                                                <span className={`dn-status is-${donation.status || "pending"}`}>
                                                    {STATUS_LABEL[donation.status] || donation.status}
                                                </span>
                                            </td>
                                            <td>{formatDate(donation.receivedDate || donation.createdAt)}</td>
                                            <td>
                                                <div className="um-actions um-right">
                                                    {donation.status === "pending" && (
                                                        <button
                                                            type="button"
                                                            className="gs-btn um-ok"
                                                            onClick={() => handleUpdateStatus(donation._id, "received")}
                                                        >
                                                            Mark received
                                                        </button>
                                                    )}

                                                    <button type="button" className="gs-btn ghost" onClick={() => handleEditDonation(donation)}>
                                                        Edit
                                                    </button>

                                                    {isAdmin() && (
                                                        <button
                                                            type="button"
                                                            className="gs-btn um-danger"
                                                            onClick={() => handleDeleteDonation(donation._id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Record / edit pop-up */}
            {showForm && (
                <div className="ao-confirm-backdrop" onClick={handleCancelEdit}>
                    <form className="um-modal dn-modal" onSubmit={handleSubmitDonation} onClick={(e) => e.stopPropagation()}>
                        <h3>
                            <span className="gs-mark">{editingId ? "Edit donation" : "Record donation"}</span>
                        </h3>

                        <div className="dn-two">
                            <label className="gs-field">
                                Donor name *
                                <input
                                    value={donationForm.donorName}
                                    onChange={(e) => setDonationForm({ ...donationForm, donorName: e.target.value })}
                                    required
                                />
                            </label>

                            <label className="gs-field">
                                Donor email
                                <input
                                    type="email"
                                    value={donationForm.donorEmail}
                                    placeholder="optional"
                                    onChange={(e) => setDonationForm({ ...donationForm, donorEmail: e.target.value })}
                                />
                            </label>
                        </div>

                        <label className="gs-field">
                            Donation type *
                            <select
                                value={donationForm.donationType}
                                onChange={(e) => setDonationForm({ ...donationForm, donationType: e.target.value })}
                            >
                                {DONATION_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {isMoney ? (
                            <label className="gs-field">
                                Amount (₱) *
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    value={donationForm.amount}
                                    onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                                    required
                                />
                            </label>
                        ) : (
                            <div className="dn-two">
                                <label className="gs-field">
                                    Item name *
                                    <input
                                        value={donationForm.itemName}
                                        placeholder="e.g. Dog food sack"
                                        onChange={(e) => setDonationForm({ ...donationForm, itemName: e.target.value })}
                                        required
                                    />
                                </label>

                                <label className="gs-field">
                                    Quantity *
                                    <input
                                        type="number"
                                        min="1"
                                        value={donationForm.quantity}
                                        onChange={(e) => setDonationForm({ ...donationForm, quantity: e.target.value })}
                                        required
                                    />
                                </label>
                            </div>
                        )}

                        <div>
                            <div className="rp-label">Status</div>
                            <div className="rp-seg dn-seg" role="radiogroup" aria-label="Status">
                                {["pending", "received", "cancelled"].map((value) => (
                                    <button
                                        type="button"
                                        key={value}
                                        role="radio"
                                        aria-checked={donationForm.status === value}
                                        className={donationForm.status === value ? "on" : ""}
                                        onClick={() => setDonationForm({ ...donationForm, status: value })}
                                    >
                                        {STATUS_LABEL[value]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="gs-field">
                            Notes
                            <textarea
                                rows="2"
                                value={donationForm.notes}
                                placeholder="Additional details"
                                onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })}
                            />
                        </label>

                        {message && <p className={`gs-alert ${messageTone}`}>{message}</p>}

                        <div className="um-actions um-right">
                            <button type="button" className="gs-btn ghost" onClick={handleCancelEdit}>
                                Cancel
                            </button>
                            <button type="submit" className="gs-btn primary" disabled={submitting}>
                                {submitting ? "Saving..." : editingId ? "Save changes" : "Save donation"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}
