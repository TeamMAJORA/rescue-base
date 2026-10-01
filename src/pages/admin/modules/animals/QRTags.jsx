
import { useEffect, useState } from "react";
import { isAdmin } from "../../../../utils/auth";

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
        if (!isAdmin()) {
            alert("Only administrators can delete QR tags.");
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
        if (!isAdmin()) {
            alert(
                "Only administrators can regenerate QR tags."
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
                        Select Animal

                        <select
                            value={form.animalId}
                            onChange={(e) =>
                                setForm({
                                    animalId: e.target.value,
                                })
                            }
                            required
                        >
                            <option value="">
                                Select an animal
                            </option>

                            {animals.map((animal) => (
                                <option
                                    key={animal._id}
                                    value={animal._id}
                                >
                                    {animal.name} (
                                    {animal.type}
                                    )
                                </option>
                            ))}
                        </select>
                    </label>

                    <button
                        type="submit"
                        disabled={submitting}
                    >
                        {submitting
                            ? "Generating..."
                            : "Generate QR Tag"}
                    </button>
                </form>
            </section>

            {message && (
                <p className="success-message">
                    {message}
                </p>
            )}

            {error && (
                <p className="error-message">
                    {error}
                </p>
            )}

            <section className="admin-panel admin-qr-list-panel">
                <div className="admin-panel-heading">
                    <h2>QR Tag Records</h2>

                    <button
                        type="button"
                        onClick={loadData}
                        disabled={loading}
                    >
                        Refresh
                    </button>
                </div>

                <input
                    type="text"
                    placeholder="Search animal..."
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                />

                {loading ? (
                    <p>Loading QR tag records...</p>
                ) : filteredRecords.length === 0 ? (
                    <p>No QR tags found.</p>
                ) : (
                    <div className="admin-qr-list">
                        {filteredRecords.map((record) => {
                            const qrImage = getQRImage(record);

                            return (
                                <article
                                    className="admin-qr-row"
                                    key={record._id}
                                >
                                    <div className="admin-qr-placeholder">
                                        {qrImage ? (
                                            <img
                                                src={qrImage}
                                                alt={`QR tag for ${getAnimalName(record)}`}
                                            />
                                        ) : (
                                            "QR"
                                        )}
                                    </div>

                                    <div>
                                        <h3>
                                            {getAnimalName(record)}
                                        </h3>

                                        <p>
                                            <strong>
                                                QR ID:
                                            </strong>{" "}
                                            {getQRId(record)}
                                        </p>

                                        <span className="admin-status-pill active">
                                            Active
                                        </span>

                                        <p>
                                            <strong>
                                                Created:
                                            </strong>{" "}
                                            {getCreatedDate(record)}
                                        </p>
                                    </div>

                                    <div className="admin-qr-actions">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                window.open(
                                                    qrImage,
                                                    "_blank"
                                                )
                                            }
                                            disabled={!qrImage}
                                        >
                                            View
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!qrImage) {
                                                    return;
                                                }

                                                const link =
                                                    document.createElement(
                                                        "a"
                                                    );

                                                link.href = qrImage;
                                                link.download =
                                                    `${getQRId(record)}.png`;

                                                link.click();
                                            }}
                                            disabled={!qrImage}
                                        >
                                            Download
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                window.print()
                                            }
                                        >
                                            Print
                                        </button>

                                        {isAdmin() && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRegenerate(
                                                            record._id
                                                        )
                                                    }
                                                >
                                                    Regenerate
                                                </button>

                                                <button
                                                    type="button"
                                                    className="admin-delete-button"
                                                    onClick={() =>
                                                        handleDelete(
                                                            record._id
                                                        )
                                                    }
                                                >
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
            </section>
        </section>
    );
}