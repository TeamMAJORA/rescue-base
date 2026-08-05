import { useState } from "react";
import { isAdmin } from "../../../../utils/auth";

const starterTransfers = [
    {
        id: 1,
        animalName: "Bella",
        fromLocation: "Koronadal Shelter",
        toLocation: "General Santos Shelter",
        transferDate: "2026-07-20",
        reason: "Shelter Capacity",
        status: "Completed",
    },
    {
        id: 2,
        animalName: "Max",
        fromLocation: "Koronadal Shelter",
        toLocation: "City Veterinary Office",
        transferDate: "2026-07-27",
        reason: "Medical Treatment",
        status: "Pending",
    },
];

export default function AnimalTransfers() {
    const [transfers, setTransfer] = useState(starterTransfers);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");

    const [form, setForm] = useState({
        animalName: "",
        fromLocation: "",
        toLocation: "",
        transferDate: "",
        reason: "",
        status: "Pending",
    });

    function updateField(name, value) {
        setForm({
            ...form,
            [name]: value,
        });
    }

    function handleSubmit(e) {
        e.preventDefault();

        if (editingId) {
            setTransfer((current) =>
                current.map((transfer) =>
                    transfer.id === editingId
                        ? {
                            ...transfer,
                            ...form,
                        }
                        : transfer
                )
            );

            setEditingId(null);
        } else {
            const newTransfer = {
                id: Date.now(),
                ...form
            };

            setTransfer((current) => [
                newTransfer,
                ...current
            ])
        }

        setForm({
            animalName: "",
            fromLocation: "",
            toLocation: "",
            transferDate: "",
            reason: "",
            status: "Pending",
        });
    }

    function handleEditTransfer(transfer) {
        setEditingId(transfer.id);

        setForm({
            animalName: transfer.animalName,
            fromLocation: transfer.fromLocation,
            toLocation: transfer.toLocation,
            transferDate: transfer.transferDate,
            reason: transfer.reason,
            status: transfer.status,
        });
    }

    function handleDeleteTransfer(id) {
        if (!isAdmin()) {
            alert("Only administrators can delete transfers");
            return;
        }

        setTransfer((current) =>
            current.filter(
                (transfer) => transfer.id !== id
            )
        );
    }

    return (
        <section className="admin-transfer-page">
            <section className="admin-panel admin-transfer-form-panel">
                <div className="admin-panel-heading">
                    <h2>
                        {editingId
                            ? "Edit Animal Transfer"
                            : "Animal Transfer"
                        }
                    </h2>
                </div>

                <form
                    className="admin-transfer-form"
                    onSubmit={handleSubmit}
                >

                    <label>
                        Animal Name
                        <input
                            value={form.animalName}
                            onChange={(e) =>
                                updateField(
                                    "animalName",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        From
                        <input
                            value={form.fromLocation}
                            onChange={(e) =>
                                updateField(
                                    "fromLocation",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        To
                        <input
                            value={form.toLocation}
                            onChange={(e) =>
                                updateField(
                                    "toLocation",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Transfer Date
                        <input
                            type="date"
                            value={form.transferDate}
                            onChange={(e) =>
                                updateField(
                                    "transferDate",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Reason
                        <input
                            value={form.reason}
                            onChange={(e) =>
                                updateField(
                                    "reason",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Status
                        <select
                            value={form.status}
                            onChange={(e) =>
                                updateField(
                                    "status",
                                    e.target.value
                                )
                            }
                        >
                            <option>
                                Pending
                            </option>
                            <option>
                                In Transit
                            </option>
                            <option>
                                Completed
                            </option>
                            <option>
                                Cancelled
                            </option>
                        </select>
                    </label>
                    <button type="submit">
                        {editingId
                            ? "Update Transfer"
                            : "Save Transfer"
                        }
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={() => {
                                setEditingId(null);

                                setForm({
                                    animalName: "",
                                    fromLocation: "",
                                    toLocation: "",
                                    transferDate: "",
                                    reason: "",
                                    status: "Pending",
                                });
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </form>
            </section>

            <section className="admin-panel admin-transfer-list-panel">
                <div className="admin-panel-heading">
                    <h2>
                        Transfer History
                    </h2>
                </div>

                <input
                    type="text"
                    placeholder="Search Animal..."
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                />

                <select
                    value={filterStatus}
                    onChange={(e) =>
                        setFilterStatus(e.target.value)
                    }
                >
                    <option value="All">All</option>
                    <option value="Pending">Pending</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>

                <div className="admin-transfer-list">
                    {
                        transfers.filter((transfer) => {
                            const matchesSearch = transfer.animalName.toLowerCase().includes(search.toLowerCase());
                            const matchesStatus = filterStatus === "All" || transfer.status === filterStatus;
                            return matchesSearch && matchesStatus;
                        }).map((transfer) => (
                            <article
                                key={transfer.id}
                                className="admin-transfer-row"
                            >
                                <div>
                                    <h3>
                                        {transfer.animalName}
                                    </h3>
                                    <p>
                                        <strong>From:</strong>{" "}
                                        {transfer.fromLocation}
                                    </p>
                                    <p>
                                        <strong>To:</strong>{" "}
                                        {transfer.toLocation}
                                    </p>
                                    <p>
                                        <strong>Date:</strong>{" "}
                                        {transfer.transferDate}
                                    </p>
                                    <p>
                                        <strong>Reason:</strong>{" "}
                                        {transfer.reason}
                                    </p>
                                </div>

                                <span
                                    className={`transfer-status ${transfer.status.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                    {transfer.status}
                                </span>

                                <div className="admin-transfer-actions">
                                    <button
                                        type="button"
                                        className="admin-edit-button"
                                        onClick={() =>
                                            handleEditTransfer(transfer)
                                        }
                                    >
                                        Edit
                                    </button>

                                    {isAdmin() && (
                                        <button
                                            type="button"
                                            className="admin-delete-button"
                                            onClick={() =>
                                                handleDeleteTransfer(transfer.id)
                                            }
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))
                    }
                </div>
            </section>
        </section>
    );
}