import {
    useState
} from "react";
import { getCurrentUser, isAdmin, isStaff } from "../../../../utils/auth"

const starterRecords = [
    {
        id: 1,
        animalName: "Max",
        recordType: "Vaccine",
        vetName: "Dr. Santos",
        recordDate: "2026-06-20",
        notes: "Anti-rabies vaccine completed.",
    },
    {
        id: 2,
        animalName: "Luna",
        recordType: "Checkup",
        vetName: "Dr. Reyes",
        recordDate: "2026-06-22",
        notes: "General checkup. Healthy condition.",
    },
];

export default function MedicalRecords() {
    const [records, setRecords] = useState(starterRecords);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("All");

    const [recordForm, setRecordForm] = useState({
        animalName: "",
        recordType: "Checkup",
        vetName: "",
        recordDate: "",
        notes: "",
    });

    function handleAddRecord(e) {
        e.preventDefault();

        if (editingId) {
            setRecords((current) =>
                current.map((record) =>
                    record.id === editingId
                        ? {
                            ...record,
                            ...recordForm
                        }
                        : record
                )
            );

            setEditingId(null);
        } else {
            const newRecord = {
                id: Date.now(),
                ...recordForm,
            };

            setRecords((current) => [
                newRecord,
                ...current,
            ]);
        }

        setRecordForm({
            animalName: "",
            recordType: "Checkup",
            vetName: "",
            recordDate: "",
            notes: "",
        });
    }

    function handleEditRecord(record) {
        setEditingId(record.id);

        setRecordForm({
            animalName: record.animalName,
            recordType: record.recordType,
            vetName: record.vetName,
            recordDate: record.recordDate,
            notes: record.notes,
        });
    }

    function handleDeleteRecord(id) {
        if (!isAdmin()) {
            alert("Only adminitrators can delete medical records");
            return;
        }

        setRecords((current) =>
            current.filter(
                (record) => record.id !== id
            )
        );
    }

    return (
        <section className="admin-medical-page">
            <section className="admin-panel admin-medical-form-panel">
                <div className="admin-panel-heading">
                    <h2>Add Medical Record</h2>
                </div>

                <form className="admin-medical-form" onSubmit={handleAddRecord}>
                    <label>
                        Animal Name
                        <input
                            type="text"
                            value={recordForm.animalName}
                            onChange={(e) =>
                                setRecordForm({
                                    ...recordForm,
                                    animalName: e.target.value,
                                })
                            }
                            placeholder="Example: Max"
                            required
                        />
                    </label>

                    <label>
                        Record Type
                        <select
                            value={recordForm.recordType}
                            onChange={(e) =>
                                setRecordForm({
                                    ...recordForm,
                                    recordType: e.target.value,
                                })
                            }
                        >
                            <option value="Checkup">Checkup</option>
                            <option value="Vaccine">Vaccine</option>
                            <option value="Treatment">Treatment</option>
                            <option value="Surgery">Surgery</option>
                            <option value="Deworming">Deworming</option>
                        </select>
                    </label>

                    <label>
                        Veterinarian
                        <input
                            type="text"
                            value={recordForm.vetName}
                            onChange={(e) =>
                                setRecordForm({
                                    ...recordForm,
                                    vetName: e.target.value,
                                })
                            }
                            placeholder="Example: Dr. Santos"
                            required
                        />
                    </label>

                    <label>
                        Date
                        <input
                            type="date"
                            value={recordForm.recordDate}
                            onChange={(e) =>
                                setRecordForm({
                                    ...recordForm,
                                    recordDate: e.target.value,
                                })
                            }
                            required
                        />
                    </label>

                    <label className="admin-medical-notes-field">
                        Notes
                        <textarea
                            value={recordForm.notes}
                            onChange={(e) =>
                                setRecordForm({
                                    ...recordForm,
                                    notes: e.target.value,
                                })
                            }
                            placeholder="Write medical details here..."
                            required
                        />
                    </label>
                    <button type="submit">
                        {
                            editingId
                                ? "Update Medical Record"
                                : "Add Medical Record"
                        }
                    </button>
                    {
                        editingId && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingId(null);

                                    setRecordForm({
                                        animalName: "",
                                        recordType: "Checkup",
                                        vetName: "",
                                        recordDate: "",
                                        notes: "",
                                    });
                                }}
                            >
                                Cancel
                            </button>
                        )
                    }
                </form>
            </section>

            <section className="admin-panel admin-medical0list-panel">
                <div className="admin-panel-heading">
                    <h2>Medical Records</h2>
                </div>

                <input
                    type="text"
                    placeholder="Search animal..."
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                />

                <select
                    value={filterType}
                    onChange={(e) =>
                        setFilterType(e.target.value)
                    }
                >
                    <option value="All">All</option>
                    <option value="Checkup">Checkup</option>
                    <option value="Vaccine">Vaccine</option>
                    <option value="Treatment">Treatment</option>
                    <option value="Surgery">Surgery</option>
                    <option value="Deworming">Deworming</option>
                </select>

                <div className="admin-medical-list">
                    {records.filter((record) => {
                        const matchesSearch = record.animalName.toLowerCase().includes(search.toLowerCase());
                        const matchesType = filterType === "All" || record.recordType === filterType;

                        return matchesSearch && matchesType
                    }).map((record) => (
                        <article className="admin-medical-row" key={record.id}>
                            <div>
                                <h3>{record.animalName}</h3>

                                <p>
                                    {record.recordType} • {record.vetName} •{""}
                                    {record.recordDate}
                                </p>

                                <span>{record.notes}</span>

                                <div className="admin-medical-actions">
                                    <button
                                        type="button"
                                        onClick={() => handleEditRecord(record)}
                                    >
                                        Edit
                                    </button>

                                    {isAdmin() && (
                                        <button
                                            type="button"
                                            className="delete"
                                            onClick={() =>
                                                handleDeleteRecord(record.id)
                                            }
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>

                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </section>
    );
}