import {
    useState
} from "react";

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

    const [recordForm, setRecordForm] = useState({
        animalName : "",
        recordType : "Checkup",
        vetName : "",
        recordDate : "",
        notes : "",
    });

    function handleAddRecord(e) {
        e.preventDefault();

        const newRecord = {
            id : Date.now(),
            ...recordForm,
        };

        setRecords((current) => [newRecord, ...current]);

        setRecordForm({
            animalName : "",
            recordType : "Checkup",
            vetName : "",
            recordDate : "",
            notes : "",
        });
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
                                    animalName : e.target.value,
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
                                starterRecords({
                                    ...recordForm,
                                    recordType : e.type.value,
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
                                    recordDate : e.target.value,
                                })
                            }
                            required
                        />
                    </label>

                    <label className="admin-medical-notes-field">
                        Notes
                            <textarea
                                value = {recordForm.notes}
                                onChange={(e) =>
                                    setRecordForm({
                                        ...recordForm,
                                        notes : e.target.value,
                                    })
                                }
                                placeholder="Write medical details here..."
                                required
                            />
                    </label>
                    <button type="submit">Add Medical Record</button>
                </form>
            </section>

            <section className="admin-panel admin-medical0list-panel">
                <div className="admin-panel-heading">
                    <h2>Medical Records</h2>
                </div>

                <div className="admin-medical-list">
                    {records.map((record) => (
                        <article className="admin-medical-row" key={record.id}>
                            <div>
                                <h3>{record.animalName}</h3>

                                <p>
                                    {record.recordType} • {record.vetName} •{""}
                                    {record.recordDate}
                                </p>

                                <span>{record.notes}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </section>
    );
}