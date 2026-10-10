
import { useEffect, useState } from "react";
import { isAdmin, isStaff } from "../../../../utils/auth";
import "../../../../styles/admin/QRTags.css";
const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api/qr-tags`;

export default function QRTags() {
    const [qrRecords, setQrRecords] = useState([]);
    const [animals, setAnimals] = useState([]);
    const [search, setSearch] = useState("");
    const [form, setForm] = useState({
        animalId: "",
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [zoom, setZoom] = useState(null);
    function getToken() {
        return (
            localStorage.getItem("token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("authToken")
        );
    }

    function getHeaders(includeJson = false) {
        const token = getToken();

        return {
            ...(includeJson && {
                "Content-Type": "application/json",
            }),
            ...(token && {
                Authorization: `Bearer ${token}`,
            }),
        };
    }

    async function parseResponse(response) {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message || "Request failed."
            );
        }

        return data;
    }

    async function loadAnimals() {
        const response = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/api/animals`,
            {
                headers: getHeaders(),
            }
        );

        const data = await parseResponse(response);

        const animalList = Array.isArray(data)
            ? data
            : data.animals || data.records || [];

        setAnimals(animalList);
    }

    async function loadQRTags() {
        const response = await fetch(API_BASE_URL, {
            headers: getHeaders(),
        });

        const data = await parseResponse(response);

        const records = Array.isArray(data)
            ? data
            : data.qrTags || data.records || [];

        setQrRecords(records);
    }

    async function loadData() {
        try {
            setLoading(true);
            setError("");

            await Promise.all([
                loadAnimals(),
                loadQRTags(),
            ]);
        } catch (err) {
            setError(
                err.message || "Failed to load QR tag records."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.animalId) {
            setError("Please select an animal.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            setMessage("");

            const response = await fetch(
                `${API_BASE_URL}/generate`,
                {
                    method: "POST",
                    headers: getHeaders(true),
                    body: JSON.stringify({
                        animalId: form.animalId,
                    }),
                }
            );

            await parseResponse(response);

            setMessage("QR tag generated successfully.");

            setForm({
                animalId: "",
            });

            await loadQRTags();
        } catch (err) {
            setError(
                err.message || "Failed to generate QR tag."
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id) {
        if (!(isAdmin() || isStaff())) {
            alert("Only administrators and staff members can delete QR tags.");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to delete this QR tag?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setMessage("");

            const response = await fetch(
                `${API_BASE_URL}/${id}`,
                {
                    method: "DELETE",
                    headers: getHeaders(),
                }
            );

            await parseResponse(response);

            setMessage("QR tag deleted successfully.");

            setQrRecords((current) =>
                current.filter((record) =>
                    record._id !== id
                )
            );
        } catch (err) {
            setError(
                err.message || "Failed to delete QR tag."
            );
        }
    }

    async function handleRegenerate(id) {
        if (!(isAdmin() || isStaff())) {
            alert(
                "Only administrators and staff members can regenerate QR tags."
            );
            return;
        }

        const confirmed = window.confirm(
            "Regenerate this QR tag?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setMessage("");

            const response = await fetch(
                `${API_BASE_URL}/${id}/regenerate`,
                {
                    method: "POST",
                    headers: getHeaders(),
                }
            );

            await parseResponse(response);

            setMessage("QR tag regenerated successfully.");

            await loadQRTags();
        } catch (err) {
            setError(
                err.message || "Failed to regenerate QR tag."
            );
        }
    }

    function getAnimalName(record) {
        return (
            record.animal?.name ||
            record.animalName ||
            "Unknown Animal"
        );
    }

    function getQRId(record) {
        return (
            record.tagCode ||
            record.qrId ||
            record.code ||
            "N/A"
        );
    }

    function getCreatedDate(record) {
        const date =
            record.createdAt || record.created_at;

        if (!date) {
            return "N/A";
        }

        return new Date(date)
            .toISOString()
            .split("T")[0];
    }

    function getQRImage(record) {
        return (
            record.qrImageUrl ||
            record.qr_image_url ||
            record.imageUrl ||
            ""
        );
    }

    const filteredRecords = qrRecords.filter((record) =>
        getAnimalName(record)
            .toLowerCase()
            .includes(search.toLowerCase())
    );
    
    const taggedIds = new Set(qrRecords.map((r) => r.animal?._id || r.animal));
    const untaggedAnimals = animals.filter((a) => !taggedIds.has(a._id));

    function downloadTag(record, qrImage) {
        const link = document.createElement("a");
        link.href = qrImage;
        link.download = `${getQRId(record)}.png`;
        link.click();
    }

    function printTag(record, qrImage) {
        const win = window.open("", "_blank", "width=400,height=500");
        if (!win) return;
        win.document.write(`
            <html><head><title>${getQRId(record)}</title></head>
            <body style="font-family:sans-serif;text-align:center;padding:24px">
                <img src="${qrImage}" style="width:240px;height:240px" onload="window.print();window.close()" />
                <h2 style="margin:8px 0 4px">${getAnimalName(record)}</h2>
                <p style="margin:0;font-size:12px">${getQRId(record)}</p>
                <p style="margin-top:6px;font-size:11px;color:#666">RescueBase</p>
            </body></html>
        `);
        win.document.close();
    }

       return (
        <section className="qrt-page">
            <div className="qrt-generate">
                <div className="qrt-generate-text">
                    <h2>Generate a QR Tag</h2>
                    <p>Pick an animal to create a printable tag for their collar or kennel.</p>
                </div>
                <form className="qrt-generate-form" onSubmit={handleSubmit}>
                    <select
                        value={form.animalId}
                        onChange={(e) => setForm({ animalId: e.target.value })}
                        required
                    >
                        <option value="">
                            {untaggedAnimals.length ? "Select an animal" : "All animals already have tags"}
                        </option>
                        {untaggedAnimals.map((animal) => (
                            <option key={animal._id} value={animal._id}>
                                {animal.name} ({animal.type})
                            </option>
                        ))}
                    </select>
                    <button type="submit" className="qrt-btn primary" disabled={submitting || !form.animalId}>
                        {submitting ? "Generating..." : "Generate"}
                    </button>
                </form>
            </div>

            {message && <p className="qrt-alert success">{message}</p>}
            {error && <p className="qrt-alert error">{error}</p>}

            <div className="qrt-list-panel">
                <div className="qrt-list-head">
                    <div>
                        <h2>QR Tag Records</h2>
                        <span className="qrt-count">
                            {filteredRecords.length} tag{filteredRecords.length === 1 ? "" : "s"}
                        </span>
                    </div>
                    <div className="qrt-tools">
                        <input
                            className="qrt-search"
                            type="search"
                            placeholder="Search by animal name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button type="button" className="qrt-btn ghost" onClick={loadData} disabled={loading}>
                            ↻ Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <p className="qrt-empty">Loading QR tags...</p>
                ) : filteredRecords.length === 0 ? (
                    <p className="qrt-empty">🐾 No QR tags found. Generate one above.</p>
                ) : (
                    <div className="qrt-grid">
                        {filteredRecords.map((record) => {
                            const qrImage = getQRImage(record);
                            const animal = record.animal || {};

                            return (
                                <article className="qrt-card" key={record._id}>
                                    <button
                                        type="button"
                                        className="qrt-qr"
                                        title="Click to enlarge"
                                        disabled={!qrImage}
                                        onClick={() =>
                                            setZoom({ image: qrImage, name: getAnimalName(record), code: getQRId(record) })
                                        }
                                    >
                                        {qrImage ? (
                                            <img src={qrImage} alt={`QR tag for ${getAnimalName(record)}`} />
                                        ) : (
                                            <span>No image</span>
                                        )}
                                    </button>

                                    <div className="qrt-name-row">
                                        {animal.image && <img className="qrt-avatar" src={animal.image} alt="" />}
                                        <div>
                                            <h3>{getAnimalName(record)}</h3>
                                            <span className="qrt-meta">
                                                {animal.type === "Cat" ? "🐱" : "🐶"} {animal.type || "Animal"} · {getCreatedDate(record)}
                                            </span>
                                        </div>
                                    </div>

                                    <code className="qrt-code">{getQRId(record)}</code>

                                    <div className="qrt-actions">
                                        <button type="button" className="qrt-btn small" onClick={() => downloadTag(record, qrImage)} disabled={!qrImage}>
                                            Download
                                        </button>
                                        <button type="button" className="qrt-btn small" onClick={() => printTag(record, qrImage)} disabled={!qrImage}>
                                            Print
                                        </button>
                                        {(isAdmin() || isStaff()) && (
                                            <>
                                                <button type="button" className="qrt-btn small" onClick={() => handleRegenerate(record._id)}>
                                                    Regenerate
                                                </button>
                                                <button type="button" className="qrt-btn small danger" onClick={() => handleDelete(record._id)}>
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {zoom && (
                <div className="qrt-zoom" onClick={() => setZoom(null)}>
                    <div className="qrt-zoom-box" onClick={(e) => e.stopPropagation()}>
                        <img src={zoom.image} alt="QR code" />
                        <h3>{zoom.name}</h3>
                        <code>{zoom.code}</code>
                        <button type="button" className="qrt-btn ghost" onClick={() => setZoom(null)}>Close</button>
                    </div>
                </div>
            )}
        </section>
    );
}