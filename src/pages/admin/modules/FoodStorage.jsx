import { useCallback, useEffect, useMemo, useState } from "react";
import "../../../styles/admin/FoodStorage.css";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const URL = `${API}/api/food-inventory`;

const EMPTY_FORM = {
    name: "",
    quantityInStock: "0",
    unit: "kg",
    foodRatePerAnimalPerDay: "0.5",
    forecastDays: "30",
};

async function apiRequest(path = "", options = {}) {
    const token = localStorage.getItem("token");

    const response = await fetch(`${URL}${path}`, {
        ...options,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...options.headers,
        },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
        throw new Error(
            data.message || `Request failed (${response.status}).`
        );
    }

    return data;
}

function getItems(data) {
    if (Array.isArray(data)) return data;

    return (
        data.inventory ||
        data.items ||
        data.foodInventory ||
        []
    );
}

function formatNumber(value, digits = 2) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number.toLocaleString(undefined, {
              maximumFractionDigits: digits,
          })
        : "—";
}

function ItemModal({ item, onClose, onSaved }) {
    const editing = Boolean(item?._id);

    const [form, setForm] = useState(() => ({
        ...EMPTY_FORM,
        ...(item
            ? {
                  name: item.name || "",
                  quantityInStock: String(
                      item.quantityInStock ?? 0
                  ),
                  unit: item.unit || "kg",
                  foodRatePerAnimalPerDay: String(
                      item.foodRatePerAnimalPerDay ?? 0.5
                  ),
                  forecastDays: String(
                      item.forecastDays ?? 30
                  ),
              }
            : {}),
    }));

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function update(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    async function submit(event) {
        event.preventDefault();
        setError("");

        const stock = Number(form.quantityInStock);
        const rate = Number(form.foodRatePerAnimalPerDay);
        const days = Number(form.forecastDays);

        if (!form.name.trim()) {
            setError("Enter a food name.");
            return;
        }

        if (!Number.isFinite(stock) || stock < 0) {
            setError("Stock cannot be negative.");
            return;
        }

        if (!Number.isFinite(rate) || rate < 0) {
            setError("Consumption rate cannot be negative.");
            return;
        }

        if (
            !Number.isInteger(days) ||
            days < 1 ||
            days > 365
        ) {
            setError("Forecast period must be 1–365 days.");
            return;
        }

        const payload = {
            name: form.name.trim(),
            quantityInStock: stock,
            unit: form.unit,
            foodRatePerAnimalPerDay: rate,
            forecastDays: days,
        };

        try {
            setSaving(true);

            const data = await apiRequest(
                editing ? `/${item._id}` : "",
                {
                    method: editing ? "PATCH" : "POST",
                    body: JSON.stringify(payload),
                }
            );

            onSaved(
                data,
                editing
                    ? "Food item updated."
                    : "Food item added."
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fs-overlay"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !saving
                ) {
                    onClose();
                }
            }}
        >
            <section
                className="fs-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="fs-item-title"
            >
                <header className="fs-modal-head">
                    <div>
                        <span className="fs-eyebrow">
                            FOOD INVENTORY
                        </span>

                        <h2 id="fs-item-title">
                            {editing
                                ? "Edit food item"
                                : "Add food item"}
                        </h2>

                        <p>
                            Manage current stock and forecast settings.
                        </p>
                    </div>

                    <button
                        className="fs-close"
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </header>

                <form className="fs-form" onSubmit={submit}>
                    <label className="fs-wide">
                        Food name

                        <input
                            value={form.name}
                            onChange={(event) =>
                                update("name", event.target.value)
                            }
                            maxLength={120}
                            placeholder="e.g. Dry Dog Food"
                            required
                        />
                    </label>

                    <label>
                        Current quantity

                        <input
                            type="number"
                            min="0"
                            max="100000"
                            step="0.01"
                            value={form.quantityInStock}
                            onChange={(event) =>
                                update(
                                    "quantityInStock",
                                    event.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Unit

                        <select
                            value={form.unit}
                            onChange={(event) =>
                                update("unit", event.target.value)
                            }
                        >
                            <option value="kg">
                                Kilograms (kg)
                            </option>
                        </select>
                    </label>

                    <label>
                        Consumption per animal/day (kg)

                        <input
                            type="number"
                            min="0"
                            max="50"
                            step="0.01"
                            value={form.foodRatePerAnimalPerDay}
                            onChange={(event) =>
                                update(
                                    "foodRatePerAnimalPerDay",
                                    event.target.value
                                )
                            }
                            required
                        />

                        <small>
                            Default: 0.5 kg per animal per day.
                        </small>
                    </label>

                    <label>
                        Forecast period (days)

                        <input
                            type="number"
                            min="1"
                            max="365"
                            step="1"
                            value={form.forecastDays}
                            onChange={(event) =>
                                update(
                                    "forecastDays",
                                    event.target.value
                                )
                            }
                            required
                        />
                    </label>

                    {error && (
                        <p
                            className="fs-error fs-wide"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    <div className="fs-actions fs-wide">
                        <button
                            type="button"
                            className="fs-btn fs-secondary"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            className="fs-btn fs-primary"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : editing
                                  ? "Save changes"
                                  : "Add to inventory"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

function AdjustStockModal({ item, onClose, onSaved }) {
    const [action, setAction] = useState("add");
    const [quantity, setQuantity] = useState("");
    const [reason, setReason] = useState(
        "Delivery / donation"
    );
    const [note, setNote] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function submit(event) {
        event.preventDefault();
        setError("");

        const amount = Number(quantity);

        if (!Number.isFinite(amount) || amount <= 0) {
            setError("Enter a quantity greater than zero.");
            return;
        }

        if (
            action === "remove" &&
            amount > Number(item.quantityInStock)
        ) {
            setError(
                "You cannot remove more than the current stock."
            );
            return;
        }

        try {
            setSaving(true);

            const data = await apiRequest(
                `/${item._id}/adjust`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        action,
                        quantity: amount,
                        reason,
                        note: note.trim(),
                    }),
                }
            );

            onSaved(data, "Stock adjusted successfully.");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fs-overlay"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !saving
                ) {
                    onClose();
                }
            }}
        >
            <section
                className="fs-modal fs-modal-small"
                role="dialog"
                aria-modal="true"
                aria-labelledby="fs-adjust-title"
            >
                <header className="fs-modal-head">
                    <div>
                        <span className="fs-eyebrow">
                            STOCK ADJUSTMENT
                        </span>

                        <h2 id="fs-adjust-title">{item.name}</h2>

                        <p>
                            Current stock:{" "}
                            <strong>
                                {formatNumber(item.quantityInStock)}{" "}
                                {item.unit || "kg"}
                            </strong>
                        </p>
                    </div>

                    <button
                        className="fs-close"
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </header>

                <form className="fs-form" onSubmit={submit}>
                    <div className="fs-wide">
                        <span className="fs-label">
                            Adjustment type
                        </span>

                        <div className="fs-toggle">
                            <button
                                type="button"
                                className={
                                    action === "add"
                                        ? "selected add"
                                        : ""
                                }
                                onClick={() => setAction("add")}
                            >
                                + Add stock
                            </button>

                            <button
                                type="button"
                                className={
                                    action === "remove"
                                        ? "selected remove"
                                        : ""
                                }
                                onClick={() => setAction("remove")}
                            >
                                − Remove stock
                            </button>
                        </div>
                    </div>

                    <label className="fs-wide">
                        Quantity ({item.unit || "kg"})

                        <input
                            type="number"
                            min="0.01"
                            max="100000"
                            step="0.01"
                            value={quantity}
                            onChange={(event) =>
                                setQuantity(event.target.value)
                            }
                            required
                        />
                    </label>

                    <label className="fs-wide">
                        Reason

                        <select
                            value={reason}
                            onChange={(event) =>
                                setReason(event.target.value)
                            }
                        >
                            <option>Delivery / donation</option>
                            <option>Food used</option>
                            <option>Damaged / spoiled</option>
                            <option>Stock count correction</option>
                            <option>Other</option>
                        </select>
                    </label>

                    <label className="fs-wide">
                        Note (optional)

                        <textarea
                            rows="3"
                            maxLength={500}
                            value={note}
                            onChange={(event) =>
                                setNote(event.target.value)
                            }
                            placeholder="Add a short note..."
                        />
                    </label>

                    {error && (
                        <p
                            className="fs-error fs-wide"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    <div className="fs-actions fs-wide">
                        <button
                            type="button"
                            className="fs-btn fs-secondary"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            className={`fs-btn ${
                                action === "remove"
                                    ? "fs-danger"
                                    : "fs-primary"
                            }`}
                            disabled={saving}
                        >
                            {saving
                                ? "Updating..."
                                : action === "add"
                                  ? "Add stock"
                                  : "Remove stock"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

export default function FoodStorage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const [itemModal, setItemModal] = useState(null);
    const [addOpen, setAddOpen] = useState(false);
    const [adjustItem, setAdjustItem] = useState(null);
    const [notice, setNotice] = useState("");

    const loadInventory = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await apiRequest();
            setItems(getItems(data));
        } catch (err) {
            setError(
                err.message || "Could not load food inventory."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInventory();
    }, [loadInventory]);

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();

        return items.filter(
            (item) =>
                !query ||
                String(item.name || "")
                    .toLowerCase()
                    .includes(query)
        );
    }, [items, search]);

    const totalKg = items.reduce(
        (sum, item) =>
            sum +
            (item.unit === "kg" || !item.unit
                ? Number(item.quantityInStock || 0)
                : 0),
        0
    );

    const outOfStock = items.filter(
        (item) => Number(item.quantityInStock || 0) <= 0
    ).length;

    function handleSaved(data, fallbackMessage) {
        setNotice(data.message || fallbackMessage);
        setAddOpen(false);
        setItemModal(null);
        setAdjustItem(null);

        const updatedItem =
            data.item ||
            data.inventoryItem ||
            (!Array.isArray(data.inventory)
                ? data.inventory
                : null);

        if (updatedItem?._id) {
            setItems((current) => {
                const exists = current.some(
                    (item) => item._id === updatedItem._id
                );

                return exists
                    ? current.map((item) =>
                          item._id === updatedItem._id
                              ? updatedItem
                              : item
                      )
                    : [updatedItem, ...current];
            });
        } else {
            loadInventory();
        }

        window.setTimeout(() => setNotice(""), 3500);
    }

    return (
        <section className="food-storage-page">
            <header className="fs-page-header">
                <div>
                    <span className="fs-eyebrow">
                        SUPPLY MANAGEMENT
                    </span>

                    <h2>Food Storage</h2>

                    <p>
                        Track available food, record deliveries and
                        usage, and keep forecasts up to date.
                    </p>
                </div>

                <button
                    className="fs-btn fs-primary"
                    type="button"
                    onClick={() => setAddOpen(true)}
                >
                    + Add food
                </button>
            </header>

            {notice && (
                <div className="fs-success" role="status">
                    {notice}
                </div>
            )}

            {error && (
                <div className="fs-error-banner" role="alert">
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={loadInventory}
                    >
                        Retry
                    </button>
                </div>
            )}

            <div className="fs-stats">
                <article>
                    <span className="fs-stat-icon">▤</span>
                    <div>
                        <p>Food types</p>
                        <strong>
                            {loading ? "—" : items.length}
                        </strong>
                        <small>Tracked inventory items</small>
                    </div>
                </article>

                <article>
                    <span className="fs-stat-icon green">⚖</span>
                    <div>
                        <p>Total stock (kg)</p>
                        <strong>
                            {loading ? "—" : formatNumber(totalKg)}
                        </strong>
                        <small>Combined kilogram stock</small>
                    </div>
                </article>

                <article>
                    <span className="fs-stat-icon amber">!</span>
                    <div>
                        <p>Out of stock</p>
                        <strong>
                            {loading ? "—" : outOfStock}
                        </strong>
                        <small>Items with zero quantity</small>
                    </div>
                </article>
            </div>

            <section className="fs-panel">
                <header className="fs-panel-head">
                    <div>
                        <h3>Inventory list</h3>
                        <p>
                            Record deliveries, usage, spoilage, or
                            stock corrections using Adjust stock.
                        </p>
                    </div>

                    <label className="fs-search">
                        ⌕
                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search food..."
                            aria-label="Search food inventory"
                        />
                    </label>
                </header>

                {loading ? (
                    <div className="fs-empty">
                        <span className="fs-spinner" />
                        Loading food inventory...
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="fs-empty">
                        <span className="fs-empty-icon">▤</span>

                        <strong>
                            {search
                                ? "No matching food items"
                                : "No food inventory yet"}
                        </strong>

                        <p>
                            {search
                                ? "Try another search term."
                                : "Add your first food item to start tracking current stock."}
                        </p>

                        {!search && (
                            <button
                                className="fs-btn fs-primary"
                                type="button"
                                onClick={() => setAddOpen(true)}
                            >
                                Add first food item
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="fs-table-wrap">
                        <table className="fs-table">
                            <thead>
                                <tr>
                                    <th>Food item</th>
                                    <th>Current stock</th>
                                    <th>Rate / animal / day</th>
                                    <th>Forecast</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredItems.map((item) => {
                                    const empty =
                                        Number(
                                            item.quantityInStock || 0
                                        ) <= 0;

                                    return (
                                        <tr key={item._id || item.name}>
                                            <td>
                                                <div className="fs-food-name">
                                                    <span className="fs-food-icon">
                                                        ▤
                                                    </span>

                                                    <div>
                                                        <strong>
                                                            {item.name}
                                                        </strong>
                                                        <small>
                                                            Food inventory
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <strong>
                                                    {formatNumber(
                                                        item.quantityInStock
                                                    )}{" "}
                                                    <span className="fs-muted">
                                                        {item.unit || "kg"}
                                                    </span>
                                                </strong>
                                            </td>

                                            <td>
                                                {formatNumber(
                                                    item.foodRatePerAnimalPerDay ??
                                                        0.5
                                                )}{" "}
                                                kg
                                            </td>

                                            <td>
                                                {item.forecastDays ?? 30} days
                                            </td>

                                            <td>
                                                <span
                                                    className={`fs-status ${
                                                        empty
                                                            ? "empty"
                                                            : "ok"
                                                    }`}
                                                >
                                                    <i />
                                                    {empty
                                                        ? "Out of stock"
                                                        : "Tracked"}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="fs-row-actions">
                                                    <button
                                                        className="fs-action-adjust"
                                                        type="button"
                                                        onClick={() =>
                                                            setAdjustItem(item)
                                                        }
                                                    >
                                                        Adjust stock
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setItemModal(item)
                                                        }
                                                    >
                                                        Edit
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

                <footer className="fs-panel-foot">
                    <span>
                        {loading
                            ? "Loading..."
                            : `${filteredItems.length} of ${items.length} items`}
                    </span>

                    <button
                        type="button"
                        onClick={loadInventory}
                        disabled={loading}
                    >
                        ↻ Refresh
                    </button>
                </footer>
            </section>

            <aside className="fs-note">
                <span>i</span>
                <p>
                    <strong>Forecast connection:</strong> the forecast
                    uses the saved current quantity. Needed Supplies
                    tracks requests and receipts, not current stock.
                </p>
            </aside>

            {addOpen && (
                <ItemModal
                    onClose={() => setAddOpen(false)}
                    onSaved={handleSaved}
                />
            )}

            {itemModal && (
                <ItemModal
                    item={itemModal}
                    onClose={() => setItemModal(null)}
                    onSaved={handleSaved}
                />
            )}

            {adjustItem && (
                <AdjustStockModal
                    item={adjustItem}
                    onClose={() => setAdjustItem(null)}
                    onSaved={handleSaved}
                />
            )}
        </section>
    );
}