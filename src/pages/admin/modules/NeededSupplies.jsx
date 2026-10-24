import { useEffect, useMemo, useState } from "react";

// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

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

const priorities = ["Low", "Medium", "High", "Urgent"];

const STATUS_LABELS = {
    active: "Active",
    fulfilled: "Closed",
    inactive: "Inactive",
};

// rs2 status colours: active = blue, fulfilled = green, inactive = grey
const STATUS_CLASS = {
    active: "is-active",
    fulfilled: "is-completed",
    inactive: "",
};

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

const emptyForm = {
    name: "",
    category: "Pet Food",
    quantityNeeded: "",
    quantityReceived: 0,
    priority: "Medium",
    description: "",
    status: "active",
};

function getRemaining(supply) {
    return Math.max(0, Number(supply.quantityNeeded || 0) - Number(supply.quantityReceived || 0));
}

function getPercent(supply) {
    const needed = Number(supply.quantityNeeded || 0);
    if (!needed) return 0;
    return Math.min(100, Math.round((Number(supply.quantityReceived || 0) / needed) * 100));
}

export default function NeededSupplies() {
    const [supplies, setSupplies] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const [statusFilter, setStatusFilter] = useState("active");
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");

    const token = localStorage.getItem("token");

    function showMessage(text, error = false) {
        setMessage(text);
        setIsError(error);
    }

    function updateField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function fetchSupplies() {
        try {
            const response = await fetch(`${API}/api/supplies`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                showMessage(data.message || "Failed to fetch needed supplies.", true);
                return;
            }

            setSupplies(data.supplies || []);
        } catch (error) {
            console.error(error);
            showMessage("Server error while fetching supplies.", true);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const quantityNeeded = Number(form.quantityNeeded);
        const quantityReceived = Number(form.quantityReceived || 0);

        if (!form.name.trim()) return showMessage("Item name is required.", true);
        if (!Number.isFinite(quantityNeeded) || quantityNeeded < 1) {
            return showMessage("Quantity needed must be at least 1.", true);
        }
        if (!Number.isFinite(quantityReceived) || quantityReceived < 0) {
            return showMessage("Quantity received cannot be negative.", true);
        }

        try {
            setSubmitting(true);
            setMessage("");

            const savedUser = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");

            const payload = {
                name: form.name.trim(),
                category: form.category,
                quantityNeeded,
                quantityReceived,
                priority: form.priority,
                description: form.description.trim(),
                status: form.status,
                createdByName: savedUser.name || savedUser.username || "Admin User",
                createdByEmail: savedUser.email || "",
            };

            const response = await fetch(editingId ? `${API}/api/supplies/${editingId}` : `${API}/api/supplies`, {
                method: editingId ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                showMessage(data.message || "Failed to save needed supply.", true);
                return;
            }

            showMessage(editingId ? "Supply updated." : "Supply added.");
            setForm({ ...emptyForm });
            setEditingId(null);
            await fetchSupplies();
        } catch (error) {
            console.error(error);
            showMessage("Server error while saving supply.", true);
        } finally {
            setSubmitting(false);
        }
    }

    function handleEdit(supply) {
        setEditingId(supply._id);
        setForm({
            name: supply.name || "",
            category: supply.category || "Pet Food",
            quantityNeeded: supply.quantityNeeded || "",
            quantityReceived: supply.quantityReceived || 0,
            priority: supply.priority || "Medium",
            description: supply.description || "",
            status: supply.status || "active",
        });
        setMessage("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleCancelEdit() {
        setEditingId(null);
        setForm({ ...emptyForm });
        setMessage("");
    }

    async function handleDelete(supply) {
        const confirmed = await askConfirm({
            title: `Delete ${supply.name}?`,
            message: "This can't be undone.",
            confirmLabel: "Delete",
            danger: true,
        });
        if (!confirmed) return;

        try {
            setMessage("");
            const response = await fetch(`${API}/api/supplies/${supply._id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                showMessage(data.message || "Failed to delete supply.", true);
                return;
            }

            if (editingId === supply._id) handleCancelEdit();
            showMessage("Supply deleted.");
            await fetchSupplies();
        } catch (error) {
            console.error(error);
            showMessage("Server error while deleting supply.", true);
        }
    }

    async function handleStatusChange(supplyId, status) {
        try {
            setMessage("");
            const response = await fetch(`${API}/api/supplies/${supplyId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                showMessage(data.message || "Failed to update supply status.", true);
                return;
            }

            showMessage(status === "active" ? "Supply reopened." : `Marked as ${STATUS_LABELS[status].toLowerCase()}.`);
            await fetchSupplies();
        } catch (error) {
            console.error(error);
            showMessage("Server error while updating status.", true);
        }
    }

    useEffect(() => {
        fetchSupplies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const counts = useMemo(() => {
        const result = { all: supplies.length, active: 0, fulfilled: 0, inactive: 0, urgent: 0 };
        supplies.forEach((supply) => {
            const status = supply.status || "active";
            result[status] = (result[status] || 0) + 1;
            if (status === "active" && ["Urgent", "High"].includes(supply.priority)) result.urgent += 1;
        });
        return result;
    }, [supplies]);

    const shown = useMemo(() => {
        const term = search.trim().toLowerCase();
        return supplies
            .filter((supply) => statusFilter === "all" || (supply.status || "active") === statusFilter)
            .filter((supply) => !categoryFilter || supply.category === categoryFilter)
            .filter((supply) => !priorityFilter || supply.priority === priorityFilter)
            .filter((supply) => !term || [supply.name, supply.category, supply.description].join(" ").toLowerCase().includes(term))
            .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
    }, [supplies, statusFilter, categoryFilter, priorityFilter, search]);

    return (
        <section className="rs2-page">
            <div className="um-strip rs2-strip">
                <div className="um-strip-total">
                    <b>{counts.all}</b>
                    <small>Total supplies</small>
                </div>
                <div>
                    <small>Still needed</small>
                    <b>{counts.active}</b>
                </div>
                <div>
                    <small>High or urgent</small>
                    <b>{counts.urgent}</b>
                </div>
                <div>
                    <small>Closed</small>
                    <b>{counts.fulfilled}</b>
                </div>
            </div>

            {message && (
                <p className={`rs2-msg ${isError ? "is-error" : ""}`} role={isError ? "alert" : "status"}>
                    {message}
                </p>
            )}

            <div className="rs2-grid">
                {/* Add / edit */}
                <form className="rs2-card rs2-form" onSubmit={handleSubmit}>
                    <h3>{editingId ? "Edit supply" : "Add supply"}</h3>
                    <p className="rs2-sub">
                        {editingId ? "Update counts as donations come in. Set status to Inactive to hide it." : "Active supplies show on the donation page."}
                    </p>

                    <label className="rs2-field">
                        <span>
                            Item name <em>*</em>
                        </span>
                        <input
                            value={form.name}
                            onChange={(event) => updateField("name", event.target.value)}
                            placeholder="e.g. Dog food (adult)"
                            maxLength={100}
                            required
                        />
                    </label>

                    <div className="rs2-two">
                        <label className="rs2-field">
                            <span>Category</span>
                            <select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="rs2-field">
                            <span>Priority</span>
                            <select value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>
                                {priorities.map((priority) => (
                                    <option key={priority} value={priority}>
                                        {priority}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="rs2-two">
                        <label className="rs2-field">
                            <span>
                                Needed <em>*</em>
                            </span>
                            <input
                                type="number"
                                min="1"
                                value={form.quantityNeeded}
                                onChange={(event) => updateField("quantityNeeded", event.target.value)}
                                placeholder="e.g. 20"
                                required
                            />
                        </label>

                        <label className="rs2-field">
                            <span>Received</span>
                            <input
                                type="number"
                                min="0"
                                value={form.quantityReceived}
                                onChange={(event) => updateField("quantityReceived", event.target.value)}
                            />
                        </label>
                    </div>

                    {editingId && (
                        <label className="rs2-field">
                            <span>Status</span>
                            <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <label className="rs2-field">
                        <span>Description</span>
                        <textarea
                            rows={3}
                            value={form.description}
                            onChange={(event) => updateField("description", event.target.value)}
                            placeholder="Brand, size or any details donors should know"
                            maxLength={500}
                        />
                    </label>

                    <button type="submit" className="rs2-submit" disabled={submitting}>
                        {submitting ? "Saving..." : editingId ? "Save changes" : "Add supply"}
                    </button>

                    {editingId && (
                        <button type="button" className="rs2-link rs2-cancel-edit" onClick={handleCancelEdit}>
                            Cancel edit
                        </button>
                    )}
                </form>

                {/* List */}
                <section className="rs2-card">
                    <div className="rs2-head">
                        <h3>Supplies</h3>
                        <div className="rs2-chips">
                            {[
                                ["all", "All"],
                                ["active", "Active"],
                                ["fulfilled", "Closed"],
                                ["inactive", "Inactive"],
                            ].map(([value, label]) => (
                                <button
                                    type="button"
                                    key={value}
                                    className={statusFilter === value ? "on" : ""}
                                    onClick={() => setStatusFilter(value)}
                                >
                                    {label}
                                    <em>{counts[value]}</em>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rs2-tools">
                        <label className="rs2-search">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                            <input
                                type="search"
                                value={search}
                                placeholder="Search item or description..."
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </label>

                        <select className="rs2-select" value={categoryFilter} aria-label="Category" onChange={(event) => setCategoryFilter(event.target.value)}>
                            <option value="">All categories</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>

                        <select className="rs2-select" value={priorityFilter} aria-label="Priority" onChange={(event) => setPriorityFilter(event.target.value)}>
                            <option value="">All priorities</option>
                            {priorities.map((priority) => (
                                <option key={priority} value={priority}>
                                    {priority}
                                </option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <p className="rs2-empty">Loading supplies...</p>
                    ) : shown.length === 0 ? (
                        <p className="rs2-empty">
                            {supplies.length === 0 ? "No supplies yet. Add the first one on the left." : "No supplies match these filters."}
                        </p>
                    ) : (
                        <div className="rs2-table-wrap">
                            <table className="rs2-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Progress</th>
                                        <th>Remaining</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th className="rs2-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shown.map((supply) => {
                                        const status = supply.status || "active";
                                        const percent = getPercent(supply);

                                        return (
                                            <tr key={supply._id} className={editingId === supply._id ? "is-editing" : ""}>
                                                <td>
                                                    <b>{supply.name}</b>
                                                    <small>
                                                        {supply.category}
                                                        {supply.description ? ` · ${supply.description}` : ""}
                                                    </small>
                                                </td>
                                                <td>
                                                    <div className="ns2-progress" title={`${percent}% received`}>
                                                        <span style={{ width: `${percent}%` }} className={percent >= 100 ? "is-done" : ""} />
                                                    </div>
                                                    <small>
                                                        {supply.quantityReceived || 0} of {supply.quantityNeeded} received
                                                    </small>
                                                </td>
                                                <td className="ns2-remaining">{getRemaining(supply)}</td>
                                                <td>
                                                    <span className={`rs2-priority is-${String(supply.priority || "Medium").toLowerCase()}`}>
                                                        {supply.priority || "Medium"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`rs2-status ${STATUS_CLASS[status] || ""}`}>{STATUS_LABELS[status] || status}</span>
                                                </td>
                                                <td>
                                                    <div className="ns2-actions">
                                                        <button type="button" className="rs2-mini" onClick={() => handleEdit(supply)}>
                                                            Edit
                                                        </button>
                                                        {status === "active" ? (
                                                            <button type="button" className="rs2-mini is-go" onClick={() => handleStatusChange(supply._id, "fulfilled")}>
                                                                Close
                                                            </button>
                                                        ) : (
                                                            <button type="button" className="rs2-mini" onClick={() => handleStatusChange(supply._id, "active")}>
                                                                Reopen
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="rs2-icon"
                                                            title="Delete"
                                                            aria-label={`Delete ${supply.name}`}
                                                            onClick={() => handleDelete(supply)}
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                                                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && supplies.length > 0 && (
                        <p className="rs2-foot">
                            Showing {shown.length} of {supplies.length}
                        </p>
                    )}
                </section>
            </div>
        </section>
    );
}
