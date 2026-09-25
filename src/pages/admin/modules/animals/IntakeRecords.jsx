
import { useEffect, useMemo, useState } from "react";
import { isAdmin } from "../../../../utils/auth";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api/animals`;

const initialForm = {
    animalName: "",
    animalType: "Dog",
    intakeType: "Rescued",
    rescueLocation: "",
    intakeDate: "",
    rescuedBy: "",
    condition: "Healthy",
    notes: "",
};

const token = localStorage.getItem("token");

function getHeaders(includeJson = false) {
    const token = localStorage.getItem("token");

    const headers = {};

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (includeJson) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

async function parseResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        throw new Error(
            "Your session has expired. Please log in again."
        );
    }

    if (response.status === 403) {
        throw new Error(
            data.message ||
            "You do not have permission to perform this action."
        );
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Something went wrong with the request."
        );
    }

    return data;
}

function formatDate(date) {
    if (!date) {
        return "Unknown";
    }

    return new Date(date).toLocaleDateString();
}

export default function IntakeRecords() {
    const [records, setRecords] = useState([]);
    const [editingId, setEditingId] = useState(null);

    const [search, setSearch] = useState("");
    const [filterCondition, setFilterCondition] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");

    const [form, setForm] = useState(initialForm);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [actionId, setActionId] = useState(null);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // --------------------------------------------------
    // LOAD INTAKE RECORDS
    // --------------------------------------------------

    async function loadIntakes() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${API_BASE_URL}/intakes`,
                {
                    method: "GET",
                    headers: getHeaders(),
                }
            );

            const data = await parseResponse(response);

            setRecords(data.intakes || []);
        } catch (err) {
            setError(
                err.message ||
                "Failed to load intake records."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadIntakes();
    }, []);

    function updateForm(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function resetForm() {
        setForm(initialForm);
        setEditingId(null);
    }

    function handleEditRecord(record) {
        setEditingId(record._id);

        setForm({
            animalName: record.name || "",
            animalType: record.type || "Dog",
            intakeType: record.intakeType || "Rescued",
            rescueLocation: record.location || "",
            intakeDate: record.intakeDate
                ? String(record.intakeDate).slice(0, 10)
                : "",
            rescuedBy: record.rescuedBy || "",
            condition: record.intakeCondition || "Healthy",
            notes: record.description || "",
        });

        setError("");
        setSuccessMessage("");
    }

    function getCurrentUserRole() {
        try {
            const user = JSON.parse(
                localStorage.getItem("rescuebase_user")
            );

            return user?.role?.toLowerCase() || "";
        } catch {
            return "";
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const userRole = getCurrentUserRole();

        if (!["admin", "staff"].includes(userRole)) {
            setError(
                "Only administrators and staff can manage intake records."
            );
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            setSuccessMessage("");

            const payload = {
                name: form.animalName.trim(),
                type: form.animalType,
                intakeType: form.intakeType,
                location: form.rescueLocation.trim(),
                intakeDate: form.intakeDate || undefined,
                rescuedBy: form.rescuedBy.trim(),
                intakeCondition: form.condition,
                description: form.notes.trim(),
            };

            const endpoint = editingId
                ? `${API_BASE_URL}/${editingId}`
                : API_BASE_URL;

            const method = editingId ? "PATCH" : "POST";

            const response = await fetch(endpoint, {
                method,
                headers: getHeaders(true),
                body: JSON.stringify(payload),
            });

            await parseResponse(response);

            setSuccessMessage(
                editingId
                    ? "Intake record updated successfully."
                    : "Intake record submitted for review."
            );

            resetForm();
            await loadIntakes();
        } catch (err) {
            setError(
                err.message ||
                "Failed to save intake record."
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleApprove(id) {
        if (!["admin", "staff"].includes(getCurrentUserRole())) {
            setError(
                "Only administrators and staff can reject intake records."
            );
            return;
        }
        const confirmed = window.confirm(
            "Are you sure you want to approve this intake?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setActionId(id);
            setError("");
            setSuccessMessage("");

            const response = await fetch(
                `${API_BASE_URL}/${id}/approve-intake`,
                {
                    method: "PATCH",
                    headers: getHeaders(true),
                }
            );

            await parseResponse(response);

            setSuccessMessage(
                "Intake approved successfully."
            );

            await loadIntakes();
        } catch (err) {
            setError(
                err.message ||
                "Failed to approve intake."
            );
        } finally {
            setActionId(null);
        }
    }

    async function handleReject(id) {
        if (!["admin", "staff"].includes(getCurrentUserRole())) {
            setError(
                "Only administrators and staff can reject intake records."
            );
            return;
        }

        const reason = window.prompt(
            "Enter the reason for rejecting this intake:"
        );

        if (reason === null) {
            return;
        }

        const trimmedReason = reason.trim();

        if (!trimmedReason) {
            setError(
                "A rejection reason is required."
            );
            return;
        }

        try {
            setActionId(id);
            setError("");
            setSuccessMessage("");

            const response = await fetch(
                `${API_BASE_URL}/${id}/reject-intake`,
                {
                    method: "PATCH",
                    headers: getHeaders(true),
                    body: JSON.stringify({
                        reason: trimmedReason,
                    }),
                }
            );

            await parseResponse(response);

            setSuccessMessage(
                "Intake rejected successfully."
            );

            await loadIntakes();
        } catch (err) {
            setError(
                err.message ||
                "Failed to reject intake."
            );
        } finally {
            setActionId(null);
        }
    }

    async function handleDeleteRecord(id) {
        if (!["admin", "staff"].includes(getCurrentUserRole())) {
            setError(
                "Only administrators and staff can reject intake records."
            );
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to delete this intake record?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setActionId(id);
            setError("");
            setSuccessMessage("");

            const response = await fetch(
                `${API_BASE_URL}/${id}`,
                {
                    method: "DELETE",
                    headers: getHeaders(),
                }
            );

            await parseResponse(response);

            setSuccessMessage(
                "Intake record deleted successfully."
            );

            if (editingId === id) {
                resetForm();
            }

            await loadIntakes();
        } catch (err) {
            setError(
                err.message ||
                "Failed to delete intake record."
            );
        } finally {
            setActionId(null);
        }
    }

    const filteredRecords = useMemo(() => {
        const normalizedSearch = search.toLowerCase().trim();

        return records.filter((record) => {
            const animalName = String(
                record.name || ""
            ).toLowerCase();

            const animalType = String(
                record.type || ""
            ).toLowerCase();

            const condition = record.intakeCondition || "Unknown";
            const status = record.intakeStatus || "pending";

            const matchesSearch =
                animalName.includes(normalizedSearch) ||
                animalType.includes(normalizedSearch);

            const matchesCondition =
                filterCondition === "All" ||
                condition === filterCondition;

            const matchesStatus =
                filterStatus === "All" ||
                status === filterStatus;

            return (
                matchesSearch &&
                matchesCondition &&
                matchesStatus
            );
        });
    }, [
        records,
        search,
        filterCondition,
        filterStatus,
    ]);

    return (
        <section className="admin-intake-page">
            {error && (
                <div className="admin-error-message">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="admin-success-message">
                    {successMessage}
                </div>
            )}

            <section className="admin-panel admin-intake-form-panel">
                <div className="admin-panel-heading">
                    <h2>
                        {editingId
                            ? "Edit Intake Record"
                            : "New Intake Record"}
                    </h2>
                </div>

                <form
                    className="admin-intake-form"
                    onSubmit={handleSubmit}
                >
                    <label>
                        Animal Name
                        <input
                            value={form.animalName}
                            onChange={(e) =>
                                updateForm(
                                    "animalName",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Animal Type
                        <select
                            value={form.animalType}
                            onChange={(e) =>
                                updateForm(
                                    "animalType",
                                    e.target.value
                                )
                            }
                        >
                            <option value="Dog">Dog</option>
                            <option value="Cat">Cat</option>
                            <option value="Other">Other</option>
                        </select>
                    </label>

                    <label>
                        Intake Type
                        <select
                            value={form.intakeType}
                            onChange={(e) =>
                                updateForm(
                                    "intakeType",
                                    e.target.value
                                )
                            }
                        >
                            <option value="Rescued">
                                Rescued
                            </option>
                            <option value="Owner Surrender">
                                Owner Surrender
                            </option>
                            <option value="Transferred">
                                Transferred
                            </option>
                            <option value="Stray">
                                Stray
                            </option>
                        </select>
                    </label>

                    <label>
                        Rescue Location
                        <input
                            value={form.rescueLocation}
                            onChange={(e) =>
                                updateForm(
                                    "rescueLocation",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Intake Date
                        <input
                            type="date"
                            value={form.intakeDate}
                            onChange={(e) =>
                                updateForm(
                                    "intakeDate",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label>
                        Rescued By
                        <input
                            value={form.rescuedBy}
                            onChange={(e) =>
                                updateForm(
                                    "rescuedBy",
                                    e.target.value
                                )
                            }
                        />
                    </label>

                    <label>
                        Initial Condition
                        <select
                            value={form.condition}
                            onChange={(e) =>
                                updateForm(
                                    "condition",
                                    e.target.value
                                )
                            }
                        >
                            <option value="Healthy">
                                Healthy
                            </option>
                            <option value="Injured">
                                Injured
                            </option>
                            <option value="Sick">
                                Sick
                            </option>
                            <option value="Under Observation">
                                Under Observation
                            </option>
                            <option value="Unknown">
                                Unknown
                            </option>
                        </select>
                    </label>

                    <label className="admin-intake-notes-field">
                        Notes
                        <textarea
                            rows="4"
                            value={form.notes}
                            onChange={(e) =>
                                updateForm(
                                    "notes",
                                    e.target.value
                                )
                            }
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={submitting}
                    >
                        {submitting
                            ? "Saving..."
                            : editingId
                                ? "Update Intake Record"
                                : "Save Intake Record"}
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={resetForm}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                    )}
                </form>
            </section>

            <section className="admin-panel admin-intake-list-panel">
                <div className="admin-panel-heading">
                    <h2>Intake Records</h2>
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
                    value={filterCondition}
                    onChange={(e) =>
                        setFilterCondition(e.target.value)
                    }
                >
                    <option value="All">All Conditions</option>
                    <option value="Healthy">Healthy</option>
                    <option value="Injured">Injured</option>
                    <option value="Sick">Sick</option>
                    <option value="Under Observation">
                        Under Observation
                    </option>
                    <option value="Unknown">Unknown</option>
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) =>
                        setFilterStatus(e.target.value)
                    }
                >
                    <option value="All">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>

                <div className="admin-intake-list">
                    {loading ? (
                        <p>Loading intake records...</p>
                    ) : filteredRecords.length === 0 ? (
                        <p>No intake records found.</p>
                    ) : (
                        filteredRecords.map((record) => {
                            const status =
                                record.intakeStatus || "pending";

                            const isProcessing =
                                actionId === record._id;

                            return (
                                <article
                                    key={record._id}
                                    className="admin-intake-row"
                                >
                                    <div>
                                        <h3>
                                            {record.name}
                                        </h3>

                                        <p>
                                            <strong>
                                                Animal:
                                            </strong>{" "}
                                            {record.type}
                                        </p>

                                        <p>
                                            <strong>
                                                Intake:
                                            </strong>{" "}
                                            {record.intakeType}
                                        </p>

                                        <p>
                                            <strong>
                                                Location:
                                            </strong>{" "}
                                            {record.location}
                                        </p>

                                        <p>
                                            <strong>
                                                Date:
                                            </strong>{" "}
                                            {formatDate(
                                                record.intakeDate
                                            )}
                                        </p>

                                        <p>
                                            <strong>
                                                Rescued By:
                                            </strong>{" "}
                                            {record.rescuedBy ||
                                                "Not specified"}
                                        </p>

                                        <p>
                                            <strong>
                                                Condition:
                                            </strong>{" "}
                                            {record.intakeCondition}
                                        </p>

                                        <p>
                                            <strong>
                                                Status:
                                            </strong>{" "}
                                            {status
                                                .charAt(0)
                                                .toUpperCase() +
                                                status.slice(1)}
                                        </p>

                                        {record.rejectionReason && (
                                            <p>
                                                <strong>
                                                    Rejection Reason:
                                                </strong>{" "}
                                                {
                                                    record.rejectionReason
                                                }
                                            </p>
                                        )}

                                        <span>
                                            {record.description}
                                        </span>

                                        <div className="admin-intake-actions">
                                            <button
                                                type="button"
                                                className="admin-edit-button"
                                                onClick={() =>
                                                    handleEditRecord(
                                                        record
                                                    )
                                                }
                                                disabled={
                                                    isProcessing
                                                }
                                            >
                                                Edit
                                            </button>

                                            {status === "pending" &&
                                                ["admin", "staff"].includes(getCurrentUserRole()) && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="admin-approve-button"
                                                            onClick={() =>
                                                                handleApprove(
                                                                    record._id
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
                                                        >
                                                            {isProcessing
                                                                ? "Processing..."
                                                                : "Approve"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="admin-reject-button"
                                                            onClick={() =>
                                                                handleReject(
                                                                    record._id
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}

                                            {isAdmin() && (
                                                <button
                                                    type="button"
                                                    className="admin-delete-button"
                                                    onClick={() =>
                                                        handleDeleteRecord(
                                                            record._id
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </section>
        </section>
    );
}