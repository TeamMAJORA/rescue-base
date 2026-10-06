import { useState } from "react";
import { isAdmin } from "../../../../utils/auth";
import InfoTip from "../../../../components/system/InfoTip";

// Vaccines are recorded in the Vaccinations tab, not here
const RECORD_TYPES = ["Checkup", "Treatment", "Surgery", "Deworming"];

// "2026-06-25" → "Jun 25, 2026"; empty → "—"
function formatRecordDate(value) {
    if (!value) return "—";

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function todayLocal() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

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

export default function MedicalRecords({ lockedAnimal = null }) {
    const blankForm = {
        animalName: lockedAnimal?.name || "",
        recordType: "Checkup",
        vetName: "",
        recordDate: "",
        notes: "",
    };

    const [records, setRecords] = useState(starterRecords);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("All");
    const [recordForm, setRecordForm] = useState(blankForm);

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

        setRecordForm(blankForm);
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

    const filteredRecords = records.filter((record) => {
        const matchesAnimal = !lockedAnimal || record.animalName === lockedAnimal.name;
        const matchesSearch = record.animalName.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === "All" || record.recordType === filterType;

        return matchesAnimal && matchesSearch && matchesType;
    });

    const columnCount = lockedAnimal ? 5 : 6;

    return (
        <section className="admin-medical-page">
            {/* ===== Form ===== */}
            <section className="admin-panel admin-medical-form-panel">
                {!lockedAnimal && (
                    <div className="admin-panel-heading">
                        <h2>{editingId ? "Edit Medical Record" : "Add Medical Record"}</h2>
                    </div>
                )}

                <form className="admin-medical-form" onSubmit={handleAddRecord}>
                    <label>
                        <span className="admin-field-label">
                            Animal Name
                            {!lockedAnimal && <span className="admin-required">*</span>}
                        </span>
                        <input
                            type="text"
                            readOnly={Boolean(lockedAnimal)}
                            value={recordForm.animalName}
                            onChange={(e) =>
                                setRecordForm({ ...recordForm, animalName: e.target.value })
                            }
                            placeholder="e.g. Max"
                            required
                        />
                    </label>

                    <label>
                        <span className="admin-field-label">
                            Record Type <span className="admin-required">*</span>
                            <InfoTip text="Checkup: routine exam. Treatment: medicine or care for an illness or injury. Surgery: any operation, including spay/neuter. Deworming: parasite treatment. Vaccines go in the Vaccinations tab." />
                        </span>
                        <select
                            value={recordForm.recordType}
                            onChange={(e) =>
                                setRecordForm({ ...recordForm, recordType: e.target.value })
                            }
                            required
                        >
                            {RECORD_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                            {/* Keep older types (e.g. "Vaccine") selectable when editing */}
                            {recordForm.recordType && !RECORD_TYPES.includes(recordForm.recordType) && (
                                <option value={recordForm.recordType}>{recordForm.recordType}</option>
                            )}
                        </select>
                    </label>

                    <label>
                        <span className="admin-field-label">Veterinarian</span>
                        <input
                            type="text"
                            value={recordForm.vetName}
                            onChange={(e) =>
                                setRecordForm({ ...recordForm, vetName: e.target.value })
                            }
                            placeholder="e.g. Dr. Santos"
                        />
                    </label>

                    <label>
                        <span className="admin-field-label">
                            Date <span className="admin-required">*</span>
                        </span>
                        <input
                            type="date"
                            value={recordForm.recordDate}
                            max={todayLocal()}
                            onChange={(e) =>
                                setRecordForm({ ...recordForm, recordDate: e.target.value })
                            }
                            required
                        />
                    </label>

                    <label className="admin-medical-notes-field">
                        <span className="admin-field-label">
                            Notes
                            <InfoTip text="Free-text medical details. Staff only: adopters never see this text." />
                        </span>
                        <textarea
                            rows="3"
                            value={recordForm.notes}
                            onChange={(e) =>
                                setRecordForm({ ...recordForm, notes: e.target.value })
                            }
                            placeholder="Write medical details here..."
                        />
                    </label>

                    <button type="submit" className="admin-medical-save">
                        {editingId ? "Update Medical Record" : "Add Medical Record"}
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            className="admin-medical-cancel"
                            onClick={() => {
                                setEditingId(null);
                                setRecordForm(blankForm);
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </form>
            </section>

            {/* ===== List ===== */}
            <section className="admin-panel admin-medical-list-panel">
                <div className="admin-med-list-heading">
                    <h2>Medical Records</h2>

                    <div className="admin-med-list-controls">
                        {!lockedAnimal && (
                            <input
                                type="text"
                                className="admin-med-search"
                                placeholder="Search animal..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        )}

                        <select
                            className="admin-med-type-filter"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="All">Record Type: All</option>
                            {[...RECORD_TYPES, "Vaccine"].map((type) => (
                                <option key={type} value={type}>Record Type: {type}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="admin-med-table-wrap">
                    <table className="admin-med-table">
                        <thead>
                            <tr>
                                {!lockedAnimal && <th>Animal</th>}
                                <th>Record Type</th>
                                <th>Date</th>
                                <th>Veterinarian</th>
                                <th>Notes</th>
                                <th aria-label="Actions"></th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={columnCount} className="admin-med-empty">
                                        {records.length === 0
                                            ? "No medical records added yet."
                                            : "No medical records match this filter."}
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record.id}>
                                        {!lockedAnimal && <td>{record.animalName}</td>}
                                        <td className="admin-med-type">{record.recordType}</td>
                                        <td>{formatRecordDate(record.recordDate)}</td>
                                        <td>{record.vetName || "—"}</td>
                                        <td className="admin-med-notes">{record.notes || "—"}</td>
                                        <td>
                                            <div className="admin-med-actions">
                                                <button
                                                    type="button"
                                                    className="edit"
                                                    onClick={() => handleEditRecord(record)}
                                                >
                                                    Edit
                                                </button>

                                                {isAdmin() && (
                                                    <button
                                                        type="button"
                                                        className="delete"
                                                        onClick={() => handleDeleteRecord(record.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    );
}