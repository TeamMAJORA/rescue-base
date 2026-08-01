import { useState } from "react";

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

        const newTransfer = {
            newTransfer,
            ...form,
        }

        setTransfer((current) => [
            newTransfer,
            ...current
        ]);

        setForm({
            animalName: "",
            fromLocation: "",
            toLocation: "",
            transferDate: "",
            reason: "",
            status: "Pending",
        });
    }

    return (
        <section className="admin-transfer-page">
            <section className="admin-panel admin-transfer-form-panel">
                <div className="admin-panel-heading">
                    <h2>

                        Animal Transfer

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
                            onChange={(e)=>
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
                            onChange={(e)=>
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
                            onChange={(e)=>
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
                            onChange={(e)=>
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
                            onChange={(e)=>
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
                            onChange={(e)=>
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
                        Save Transfer
                    </button>
                </form>
            </section>

            <section className="admin-panel admin-transfer-list-panel">
                <div className="admin-panel-heading">
                    <h2>
                        Transfer History
                    </h2>
                </div>

                <div className="admin-transfer-list">
                    {
                        transfers.map((transfer)=>(
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
                                    className={`transfer-status ${transfer.status.toLowerCase().replace(/\s+/g,"-")}`}
                                >
                                    {transfer.status}
                                </span>
                            </article>
                        ))
                    }
                </div>
            </section>
        </section>
    );
}