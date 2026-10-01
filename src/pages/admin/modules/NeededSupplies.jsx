
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

const categories = [
    "Pet Food",
    "Medicine",
    "Medical Supplies",
    "Cleaning Supplies",
    "Blankets & Bedding",
    "Pet Toys",
    "Pet Accessories",
    "Feeding Supplies",
    "Other",
];

const priorities = [
    "Low",
    "Medium",
    "High",
    "Urgent",
];

const emptyForm = {
    name: "",
    category: "Pet Food",
    quantityNeeded: "",
    quantityReceived: 0,
    priority: "Medium",
    description: "",
    status: "active",
};

export default function NeededSupplies() {
    const [supplies, setSupplies] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const token = localStorage.getItem("token");

    function updateField(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    async function fetchSupplies() {
        try {
            setLoading(true);

            const response = await fetch(
                `${API}/api/supplies`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Failed to fetch needed supplies."
                );
                return;
            }

            setSupplies(data.supplies || []);
        } catch (error) {
            console.error(error);
            setMessage(
                "Server error while fetching supplies."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!form.name.trim()) {
            setMessage("Supply name is required.");
            return;
        }

        if (!form.category) {
            setMessage("Supply category is required.");
            return;
        }

        const quantityNeeded = Number(form.quantityNeeded);
        const quantityReceived = Number(
            form.quantityReceived || 0
        );

        if (
            !Number.isFinite(quantityNeeded) ||
            quantityNeeded < 1
        ) {
            setMessage(
                "Quantity needed must be at least 1."
            );
            return;
        }

        if (
            !Number.isFinite(quantityReceived) ||
            quantityReceived < 0
        ) {
            setMessage(
                "Quantity received cannot be negative."
            );
            return;
        }

        try {
            setSubmitting(true);
            setMessage("");

            const savedUser = JSON.parse(
                localStorage.getItem(
                    "rescuebase_user"
                ) || "{}"
            );

            const payload = {
                name: form.name.trim(),
                category: form.category,
                quantityNeeded,
                quantityReceived,
                priority: form.priority,
                description: form.description.trim(),
                status: form.status,
                createdByName:
                    savedUser.name ||
                    savedUser.username ||
                    "Admin User",
                createdByEmail:
                    savedUser.email || "",
            };

            const url = editingId
                ? `${API}/api/supplies/${editingId}`
                : `${API}/api/supplies`;

            const method = editingId
                ? "PATCH"
                : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Failed to save needed supply."
                );
                return;
            }

            setMessage(
                editingId
                    ? "Supply updated successfully."
                    : "Supply added successfully."
            );

            setForm({ ...emptyForm });
            setEditingId(null);

            await fetchSupplies();
        } catch (error) {
            console.error(error);
            setMessage(
                "Server error while saving supply."
            );
        } finally {
            setSubmitting(false);
        }
    }

    function handleEdit(supply) {
        setEditingId(supply._id);

        setForm({
            name: supply.name || "",
            category:
                supply.category || "Pet Food",
            quantityNeeded:
                supply.quantityNeeded || "",
            quantityReceived:
                supply.quantityReceived || 0,
            priority:
                supply.priority || "Medium",
            description:
                supply.description || "",
            status:
                supply.status || "active",
        });

        setMessage("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function handleCancelEdit() {
        setEditingId(null);
        setForm({ ...emptyForm });
        setMessage("");
    }

    async function handleDelete(supplyId) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this supply?"
        );

        if (!confirmed) return;

        try {
            setMessage("");

            const response = await fetch(
                `${API}/api/supplies/${supplyId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Failed to delete supply."
                );
                return;
            }

            setMessage(
                "Supply deleted successfully."
            );

            await fetchSupplies();
        } catch (error) {
            console.error(error);
            setMessage(
                "Server error while deleting supply."
            );
        }
    }

    async function handleStatusChange(
        supplyId,
        status
    ) {
        try {
            setMessage("");

            const response = await fetch(
                `${API}/api/supplies/${supplyId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ status }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Failed to update supply status."
                );
                return;
            }

            setMessage(
                "Supply status updated."
            );

            await fetchSupplies();
        } catch (error) {
            console.error(error);
            setMessage(
                "Server error while updating status."
            );
        }
    }

    function getRemaining(supply) {
        return Math.max(
            0,
            Number(supply.quantityNeeded || 0) -
            Number(supply.quantityReceived || 0)
        );
    }

    function formatStatus(status) {
        const labels = {
            active: "Active",
            fulfilled: "Fulfilled",
            inactive: "Inactive",
        };

        return labels[status] || status;
    }

    useEffect(() => {
        fetchSupplies();
    }, []);

    return (
        <section className="admin-needed-supplies-page">
            <section className="admin-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>
                            {editingId
                                ? "Edit Needed Supply"
                                : "Add Needed Supply"}
                        </h2>

                        <p>
                            Manage supplies required by
                            the shelter.
                        </p>
                    </div>
                </div>

                {message && (
                    <p className="admin-message">
                        {message}
                    </p>
                )}

                <form
                    className="admin-needed-supply-form"
                    onSubmit={handleSubmit}
                >
                    <label>
                        Item Name

                        <input
                            type="text"
                            value={form.name}
                            onChange={(event) =>
                                updateField(
                                    "name",
                                    event.target.value
                                )
                            }
                            placeholder="Example: Dog Food"
                            required
                        />
                    </label>

                    <label>
                        Category

                        <select
                            value={form.category}
                            onChange={(event) =>
                                updateField(
                                    "category",
                                    event.target.value
                                )
                            }
                            required
                        >
                            {categories.map(
                                (category) => (
                                    <option
                                        key={category}
                                        value={category}
                                    >
                                        {category}
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label>
                        Quantity Needed

                        <input
                            type="number"
                            min="1"
                            value={form.quantityNeeded}
                            onChange={(event) =>
                                updateField(
                                    "quantityNeeded",
                                    event.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Quantity Received

                        <input
                            type="number"
                            min="0"
                            value={form.quantityReceived}
                            onChange={(event) =>
                                updateField(
                                    "quantityReceived",
                                    event.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Priority

                        <select
                            value={form.priority}
                            onChange={(event) =>
                                updateField(
                                    "priority",
                                    event.target.value
                                )
                            }
                            required
                        >
                            {priorities.map(
                                (priority) => (
                                    <option
                                        key={priority}
                                        value={priority}
                                    >
                                        {priority}
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label>
                        Status

                        <select
                            value={form.status}
                            onChange={(event) =>
                                updateField(
                                    "status",
                                    event.target.value
                                )
                            }
                            required
                        >
                            <option value="active">
                                Active
                            </option>

                            <option value="fulfilled">
                                Fulfilled
                            </option>

                            <option value="inactive">
                                Inactive
                            </option>
                        </select>
                    </label>

                    <label>
                        Description

                        <textarea
                            rows="4"
                            value={form.description}
                            onChange={(event) =>
                                updateField(
                                    "description",
                                    event.target.value
                                )
                            }
                            placeholder="Additional information"
                        />
                    </label>

                    <div className="admin-form-actions">
                        <button
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Saving..."
                                : editingId
                                    ? "Update Supply"
                                    : "Add Supply"}
                        </button>

                        {editingId && (
                            <button
                                type="button"
                                className="admin-secondary-button"
                                onClick={handleCancelEdit}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <section className="admin-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Needed Supplies</h2>

                        <p>
                            View and manage all shelter
                            supply requests.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchSupplies}
                    >
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <p>Loading supplies...</p>
                ) : supplies.length === 0 ? (
                    <p className="admin-empty">
                        No needed supplies found.
                    </p>
                ) : (
                    <div className="admin-needed-supplies-list">
                        {supplies.map((supply) => (
                            <article
                                className="admin-needed-supply-card"
                                key={supply._id}
                            >
                                <div>
                                    <h3>
                                        {supply.name}
                                    </h3>

                                    <p>
                                        <strong>
                                            Category:
                                        </strong>{" "}
                                        {supply.category}
                                    </p>

                                    <p>
                                        <strong>
                                            Priority:
                                        </strong>{" "}
                                        {supply.priority}
                                    </p>

                                    <p>
                                        <strong>
                                            Needed:
                                        </strong>{" "}
                                        {supply.quantityNeeded}
                                    </p>

                                    <p>
                                        <strong>
                                            Received:
                                        </strong>{" "}
                                        {supply.quantityReceived}
                                    </p>

                                    <p>
                                        <strong>
                                            Remaining:
                                        </strong>{" "}
                                        {getRemaining(supply)}
                                    </p>

                                    {supply.description && (
                                        <p>
                                            <strong>
                                                Description:
                                            </strong>{" "}
                                            {supply.description}
                                        </p>
                                    )}
                                </div>

                                <strong
                                    className={`admin-needed-supply-status ${supply.status}`}
                                >
                                    {formatStatus(
                                        supply.status
                                    )}
                                </strong>

                                <div className="admin-needed-supply-actions">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleEdit(
                                                supply
                                            )
                                        }
                                    >
                                        Edit
                                    </button>

                                    {supply.status !==
                                        "fulfilled" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleStatusChange(
                                                    supply._id,
                                                    "fulfilled"
                                                )
                                            }
                                        >
                                            Mark Fulfilled
                                        </button>
                                    )}

                                    {supply.status !==
                                        "inactive" && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleStatusChange(
                                                    supply._id,
                                                    "inactive"
                                                )
                                            }
                                        >
                                            Deactivate
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="reject"
                                        onClick={() =>
                                            handleDelete(
                                                supply._id
                                            )
                                        }
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
    );
}