import { useState } from "react";

const starterQRCodes = [
    {
        id: 1,
        animalName: "Bella",
        qrId: "RB-0001",
        status: "Active",
        createdAt: "2026-07-31",
    },
    {
        id: 2,
        animalName: "Max",
        qrId: "RB-0002",
        status: "Active",
        createdAt: "2026-07-30",
    },
];

export default function QRTags() {
    const [qrRecords, setQrRecords] = useState(starterQRCodes);
    const [form, setForm] = useState({
        animalName: "",
    });

    function generateQRId() {
        return (
            "RB-" +
            String(qrRecords.length + 1)
                .padStart(4, "0")
        );
    }

    function handleSubmit(e) {
        e.preventDefault();

        const newQR = {
            id: Date.now(),
            animalName: form.animalName,
            qrId: generateQRId(),
            status: "Active",
            createdAt: new Date()
                .toISOString()
                .split("T")[0],
        }

        setQrRecords((current) => [
            newQR,
            ...current,
        ]);

        setForm({
            animalName: "",
        });
    }

    return (
        <section className="admin-qr-page">
            <section className="admin-panel admin-qr-form-panel">
                <div className="admin-panel-heading">
                    <h2>Generate QR Tag</h2>
                </div>

                <form
                    className="admin-qr-form"
                    onSubmit={handleSubmit}
                >
                    <label>
                        Animal Name

                        <input
                            value={form.animalName}
                            onChange={(e) =>
                                setForm({
                                    animalName: e.target.value
                                })
                            }
                            placeholder="Example: Bella"
                            required
                        />
                    </label>
                    <button type="submit">
                        Generate QR Tag
                    </button>
                </form>
            </section>

            <section className="admin-panel admin-qr-list-panel">
                <div className="admin-panel-heading">
                    <h2>QR Tag Records</h2>
                </div>
                <div className="admin-qr-list">
                    {
                        qrRecords.map((record) => (
                            <article
                                className="admin-qr-row"
                                key={record.id}
                            >
                                <div className="admin-qr-placeholder">
                                    QR
                                </div>
                                <div>
                                    <h3>{record.animalName}</h3>
                                    <p>
                                        <strong>QR ID:</strong>
                                        {" "}
                                        {record.qrId}
                                    </p>
                                    <p>
                                        <strong>Status:</strong>
                                        {" "}
                                        {record.status}
                                    </p>
                                    <p>
                                        <strong>Created:</strong>
                                        {" "}
                                        {record.createdAt}
                                    </p>
                                </div>
                                <div className="admin-qr-actions">
                                    <button>View</button>
                                    <button>Download</button>
                                    <button>Print</button>
                                </div>
                            </article>
                        ))
                    }
                </div>
            </section>

        </section>
    )
}