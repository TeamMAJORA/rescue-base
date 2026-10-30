import { useCallback, useEffect, useMemo, useState } from "react";
import "../../../styles/admin/FoodStorage.css";
import NeededSupplies from "./NeededSupplies";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const URL = `${API}/api/food-inventory`;

const EMPTY_FORM = {
    name: "",
    quantityInStock: "0",
    unit: "kg",
    foodRatePerAnimalPerDay: "0.5",
    forecastDays: "30",
    forAnimals: "All",
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

const LOW_STOCK_DAYS = 5;

// Which animals eat a food item, guessed from its name ("Dog food adult" -> dogs)
function foodSpeciesOf(name) {
    const text = String(name || "").toLowerCase();
    if (/\b(dog|puppy|puppies)\b/.test(text)) return "Dog";
    if (/\b(cat|kitten|kittens)\b/.test(text)) return "Cat";
    return "";
}

// Who eats it: the saved choice, or a guess from the name for older items
function foodEatersOf(item) {
    if (item.forAnimals === "All") return "";
    return item.forAnimals || foodSpeciesOf(item.name);
}

// Days of food left at the current headcount (null when nothing eats it)
function getStockLevel(item, animalsInCare) {
    const species = foodEatersOf(item);
    const eaters = species
        ? animalsInCare.filter((animal) => animal.type === species).length
        : animalsInCare.length;
    const stockKg = Number(item.quantityInStock) || 0;
    const dailyKg = eaters * (Number(item.foodRatePerAnimalPerDay) || 0);
    const targetDays = Number(item.forecastDays) || 30;
    const daysLeft = dailyKg > 0 ? Math.floor(stockKg / dailyKg) : null;
    const status =
        stockKg <= 0
            ? "out"
            : daysLeft !== null && daysLeft <= LOW_STOCK_DAYS
              ? "low"
              : "ok";

    return {
        species,
        eaters,
        daysLeft,
        coverage:
            stockKg <= 0
                ? 0
                : daysLeft === null
                  ? 100
                  : Math.min(100, (daysLeft / targetDays) * 100),
        status,
    };
}

const STATUS_TEXT = { ok: "In stock", low: "Low", out: "Out of stock" };

function eatersLabel(level) {
    const plural = level.eaters === 1 ? "" : "s";
    const noun = level.species ? level.species.toLowerCase() : "animal";
    return `${level.eaters} ${noun}${plural} eating`;
}

const MAX_SUPPLY_QUANTITY = 10000;

// Kg needed to get back up to the item's forecast goal
function suggestedRequestKg(item, level) {
    const dailyKg = level.eaters * (Number(item.foodRatePerAnimalPerDay) || 0);
    const goalKg = dailyKg * (Number(item.forecastDays) || 30);
    // Round to 2 decimals first so float noise (72.0000001) doesn't round up to 73
    const missing = Math.ceil(
        Math.round((goalKg - (Number(item.quantityInStock) || 0)) * 100) / 100
    );
    return Math.min(MAX_SUPPLY_QUANTITY, Math.max(1, missing));
}

function RequestMoreModal({ item, level, onClose, onSaved }) {
    const [quantity, setQuantity] = useState(String(suggestedRequestKg(item, level)));
    const [priority, setPriority] = useState(level.status === "out" ? "Urgent" : "High");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function submit(event) {
        event.preventDefault();
        setError("");

        const amount = Number(quantity);

        if (!Number.isInteger(amount) || amount < 1 || amount > MAX_SUPPLY_QUANTITY) {
            setError(`Enter a whole number from 1 to ${MAX_SUPPLY_QUANTITY.toLocaleString()}.`);
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`${API}/api/supplies`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    name: item.name,
                    category: "Pet Food",
                    quantityNeeded: amount,
                    quantityReceived: 0,
                    priority,
                    description: note.trim() || `Amount in kg. Received donations are added to ${item.name} stock.`,
                    foodInventoryId: item._id,
                }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.success === false) {
                throw new Error(data.message || "Could not create the request.");
            }

            onSaved(`Requested ${amount} kg of ${item.name}. It now shows in Needed supplies.`);
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
                if (event.target === event.currentTarget && !saving) onClose();
            }}
        >
            <section className="fs-modal fs-modal-small" role="dialog" aria-modal="true" aria-labelledby="fs-request-title">
                <header className="fs-modal-head">
                    <div>
                        <span className="fs-eyebrow">REQUEST MORE</span>
                        <h2 id="fs-request-title">{item.name}</h2>
                        <p>
                            {formatNumber(item.quantityInStock)} kg left
                            {level.daysLeft !== null ? ` · about ${level.daysLeft} days` : ""}
                        </p>
                    </div>

                    <button className="fs-close" type="button" onClick={onClose} disabled={saving} aria-label="Close">
                        ×
                    </button>
                </header>

                <form className="fs-form" onSubmit={submit}>
                    <label>
                        Amount needed (kg)
                        <input
                            type="number"
                            min="1"
                            max={MAX_SUPPLY_QUANTITY}
                            step="1"
                            value={quantity}
                            onChange={(event) => setQuantity(event.target.value)}
                            required
                        />
                        <small>Suggested: enough for {item.forecastDays ?? 30} days.</small>
                    </label>

                    <label>
                        Priority
                        <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                            <option>Urgent</option>
                        </select>
                    </label>

                    <label className="fs-wide">
                        Note for donors (optional)
                        <textarea
                            rows="2"
                            maxLength={300}
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="e.g. Any brand of adult dry dog food"
                        />
                    </label>

                    <p className="fs-request-info fs-wide">
                        Shown to all users. Received donations are added to stock automatically.
                    </p>

                    {error && (
                        <p className="fs-error fs-wide" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="fs-actions fs-wide">
                        <button type="button" className="fs-btn fs-secondary" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button className="fs-btn fs-primary" disabled={saving}>
                            {saving ? "Requesting..." : "Request"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

function HistoryModal({ item, onClose }) {
    const [history, setHistory] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        apiRequest(`/${item._id}/history`)
            .then((data) => setHistory(data.history || []))
            .catch((err) => setError(err.message || "Could not load history."));
    }, [item._id]);

    return (
        <div
            className="fs-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                className="fs-modal fs-modal-small"
                role="dialog"
                aria-modal="true"
                aria-labelledby="fs-history-title"
            >
                <header className="fs-modal-head">
                    <div>
                        <span className="fs-eyebrow">STOCK HISTORY</span>
                        <h2 id="fs-history-title">{item.name}</h2>
                        <p>
                            Current stock:{" "}
                            <strong>
                                {formatNumber(item.quantityInStock)} {item.unit || "kg"}
                            </strong>
                        </p>
                    </div>

                    <button className="fs-close" type="button" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </header>

                <div className="fs-history">
                    {error ? (
                        <p className="fs-error">{error}</p>
                    ) : history === null ? (
                        <p className="fs-history-empty">Loading history...</p>
                    ) : history.length === 0 ? (
                        <p className="fs-history-empty">No stock changes recorded yet.</p>
                    ) : (
                        <ul>
                            {history.map((entry) => (
                                <li key={entry._id}>
                                    <span className={`fs-history-amount ${entry.action}`}>
                                        {entry.action === "add" ? "+" : "−"}
                                        {formatNumber(entry.quantity)} kg
                                    </span>
                                    <div>
                                        <b>{entry.reason || "Adjustment"}</b>
                                        {entry.note && <small>{entry.note}</small>}
                                        <small>
                                            {formatNumber(entry.previousStock)} → {formatNumber(entry.newStock)} kg ·{" "}
                                            {new Date(entry.adjustedAt).toLocaleString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })}
                                        </small>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="fs-actions fs-history-foot">
                    <button type="button" className="fs-btn fs-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </section>
        </div>
    );
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
                  forAnimals: item.forAnimals || foodSpeciesOf(item.name) || "All",
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
            forAnimals: form.forAnimals,
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
                        Current quantity (kg)

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
                        For
                        <select
                            value={form.forAnimals}
                            onChange={(event) => update("forAnimals", event.target.value)}
                        >
                            <option value="Dog">Dogs</option>
                            <option value="Cat">Cats</option>
                            <option value="All">All animals</option>
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
    const [historyItem, setHistoryItem] = useState(null);
    const [requestItem, setRequestItem] = useState(null);
    const [openRequests, setOpenRequests] = useState({});
    const [statusFilter, setStatusFilter] = useState("all");
    const [animalsInCare, setAnimalsInCare] = useState([]);
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

    // Animals still in the shelter's care eat the food (adopted ones don't)
    useEffect(() => {
        fetch(`${API}/api/animals`)
            .then((response) => response.json())
            .then((data) =>
                setAnimalsInCare(
                    (data.animals || []).filter(
                        (animal) => animal.adoptionStatus !== "adopted"
                    )
                )
            )
            .catch(() => setAnimalsInCare([]));
    }, []);

    // Open Needed-supplies requests made from this page, by food item
    const loadOpenRequests = useCallback(() => {
        const token = localStorage.getItem("token");

        return fetch(`${API}/api/supplies`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then((response) => response.json())
            .then((data) => {
                const requests = {};
                (data.supplies || []).forEach((supply) => {
                    if (supply.foodInventoryId && supply.status === "active") {
                        requests[supply.foodInventoryId] = supply;
                    }
                });
                setOpenRequests(requests);
            })
            .catch(() => setOpenRequests({}));
    }, []);

    useEffect(() => {
        loadOpenRequests();
    }, [loadOpenRequests]);

    function handleRequested(message) {
        setRequestItem(null);
        setNotice(message);
        loadOpenRequests();
        window.setTimeout(() => setNotice(""), 3500);
    }

    const stockLevels = useMemo(() => {
        const levels = {};
        items.forEach((item) => {
            levels[item._id || item.name] = getStockLevel(item, animalsInCare);
        });
        return levels;
    }, [items, animalsInCare]);

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();

        return items.filter((item) => {
            const matchesSearch =
                !query ||
                String(item.name || "")
                    .toLowerCase()
                    .includes(query);
            const level = stockLevels[item._id || item.name];
            const matchesStatus =
                statusFilter === "all" || level?.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [items, search, statusFilter, stockLevels]);

    const lowStock = Object.values(stockLevels).filter(
        (level) => level.status === "low"
    ).length;

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

    const isEmpty = !loading && items.length === 0;

    return (
        <section className="food-storage-page">
            {notice && (
                <div className="fs-success" role="status">
                    {notice}
                </div>
            )}

            {error && (
                <div className="fs-error-banner" role="alert">
                    <span>{error}</span>

                    <button type="button" onClick={loadInventory}>
                        Retry
                    </button>
                </div>
            )}

            <div className="fs-stats">
                <article className="is-hero">
                    <small>Total stock</small>
                    <strong>{loading ? "—" : `${formatNumber(totalKg)} kg`}</strong>
                    <span>Across all food items</span>
                </article>

                <article>
                    <small>Food items</small>
                    <strong>{loading ? "—" : items.length}</strong>
                    <span>Tracked in inventory</span>
                </article>

                <article className={lowStock > 0 ? "is-warn" : ""}>
                    <small>Low stock</small>
                    <strong>{loading ? "—" : lowStock}</strong>
                    <span>{LOW_STOCK_DAYS} days or less left</span>
                </article>

                <article className={outOfStock > 0 ? "is-warn" : ""}>
                    <small>Out of stock</small>
                    <strong>{loading ? "—" : outOfStock}</strong>
                    <span>Items at 0 kg</span>
                </article>
            </div>

            <section className="fs-panel">
                {!isEmpty && (
                    <div className="fs-toolbar">
                        <label className="fs-search">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-3.5-3.5" />
                            </svg>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search food..."
                                aria-label="Search food inventory"
                            />
                        </label>

                        <div className="fs-chips">
                            {[
                                ["all", "All"],
                                ["low", "Low"],
                                ["out", "Out of stock"],
                            ].map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={statusFilter === key ? "active" : ""}
                                    onClick={() => setStatusFilter(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <button className="fs-btn fs-primary" type="button" onClick={() => setAddOpen(true)}>
                            + Add food
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="fs-empty">
                        <span className="fs-spinner" />
                        Loading food inventory...
                    </div>
                ) : isEmpty ? (
                    <div className="fs-empty">
                        <span className="fs-empty-icon">
                            <img src="/icons/sidebar/supplies-brown.svg" alt="" aria-hidden="true" />
                        </span>
                        <strong>No food items yet</strong>
                        <p>Add your first food item to start tracking stock.</p>
                        <button className="fs-btn fs-primary" type="button" onClick={() => setAddOpen(true)}>
                            + Add food
                        </button>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="fs-empty">
                        <strong>No matching food items</strong>
                        <p>Try another search or filter.</p>
                    </div>
                ) : (
                    <div className="fs-table-wrap">
                        <table className="fs-table">
                            <thead>
                                <tr>
                                    <th>Food item</th>
                                    <th>Stock</th>
                                    <th>Per animal / day</th>
                                    <th>Forecast goal</th>
                                    <th>Status</th>
                                    <th className="fs-th-actions">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredItems.map((item) => {
                                    const level = stockLevels[item._id || item.name];

                                    return (
                                        <tr key={item._id || item.name}>
                                            <td>
                                                <div className="fs-food-name">
                                                    <strong>{item.name}</strong>
                                                    <small>{eatersLabel(level)}</small>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="fs-stock">
                                                    <strong>
                                                        {formatNumber(item.quantityInStock)} {item.unit || "kg"}
                                                    </strong>
                                                    <div className="fs-meter" title={`Goal: ${item.forecastDays ?? 30} days of stock`}>
                                                        <i
                                                            className={`is-${level.status}`}
                                                            style={{ width: `${level.coverage}%` }}
                                                        />
                                                    </div>
                                                    <small>
                                                        {level.status === "out"
                                                            ? "No stock left"
                                                            : level.daysLeft === null
                                                              ? "No animals eating this now"
                                                              : `about ${level.daysLeft} day${level.daysLeft === 1 ? "" : "s"} left`}
                                                    </small>
                                                </div>
                                            </td>

                                            <td>{formatNumber(item.foodRatePerAnimalPerDay ?? 0.5)} kg</td>

                                            <td>{item.forecastDays ?? 30} days</td>

                                            <td>
                                                <span className={`fs-status is-${level.status}`}>
                                                    {STATUS_TEXT[level.status]}
                                                </span>
                                                {openRequests[item._id] && (
                                                    <small className="fs-requested">
                                                        Requested {formatNumber(openRequests[item._id].quantityNeeded)} kg ·{" "}
                                                        {formatNumber(openRequests[item._id].quantityReceived)} received
                                                    </small>
                                                )}
                                            </td>

                                            <td>
                                                <div className="fs-row-actions">
                                                    {level.status !== "ok" && !openRequests[item._id] && (
                                                        <button className="fs-action-request" type="button" onClick={() => setRequestItem(item)}>
                                                            Request more
                                                        </button>
                                                    )}
                                                    <button className="fs-action-adjust" type="button" onClick={() => setAdjustItem(item)}>
                                                        Adjust stock
                                                    </button>
                                                    <button type="button" onClick={() => setItemModal(item)}>
                                                        Edit
                                                    </button>
                                                    <button type="button" onClick={() => setHistoryItem(item)}>
                                                        History
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

                {!isEmpty && (
                    <footer className="fs-panel-foot">
                        <span>
                            {loading ? "Loading..." : `Showing ${filteredItems.length} of ${items.length}`}
                        </span>

                        <button type="button" onClick={loadInventory} disabled={loading}>
                            Refresh
                        </button>
                    </footer>
                )}
            </section>

            <p className="fs-note">Days left are based on the animals currently in care.</p>

            {addOpen && (
                <ItemModal onClose={() => setAddOpen(false)} onSaved={handleSaved} />
            )}

            {itemModal && (
                <ItemModal item={itemModal} onClose={() => setItemModal(null)} onSaved={handleSaved} />
            )}

            {adjustItem && (
                <AdjustStockModal item={adjustItem} onClose={() => setAdjustItem(null)} onSaved={handleSaved} />
            )}

            {historyItem && (
                <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
            )}

            {requestItem && (
                <RequestMoreModal
                    item={requestItem}
                    level={stockLevels[requestItem._id || requestItem.name]}
                    onClose={() => setRequestItem(null)}
                    onSaved={handleRequested}
                />
            )}
        </section>
    );
}

const SUPPLY_TABS = [
    { key: "food", label: "Food stock" },
    { key: "needed", label: "Needed supplies" },
];

// One "Supplies" page: what the shelter has (food stock) and what it asks donors for
export function SuppliesPage({ initialTab = "food" }) {
    const [tab, setTab] = useState(initialTab);

    return (
        <div className="ap-tabs-page">
            <nav className="ap-tabs" aria-label="Supplies">
                {SUPPLY_TABS.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        className={tab === item.key ? "is-active" : ""}
                        aria-current={tab === item.key ? "page" : undefined}
                        onClick={() => setTab(item.key)}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            {tab === "food" ? <FoodStorage /> : <NeededSupplies />}
        </div>
    );
}
