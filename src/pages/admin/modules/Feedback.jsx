import { useEffect, useState } from "react";

const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL;

const CATEGORY_LABELS = {
    general: "General",
    adoption: "Adoption",
    foster: "Foster Care",
    volunteer: "Volunteer",
    donation: "Donation",
    lost_found: "Lost & Found",
    medical: "Medical",
    website: "Website",
    other: "Other",
};

export default function Feedback() {
    const [feedback, setFeedback] =
        useState([]);

    const [status, setStatus] =
        useState("active");

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [selectedFeedback, setSelectedFeedback] =
        useState(null);

    async function loadFeedback() {
        const token =
            localStorage.getItem("token");

        if (!token) {
            setError(
                "Authentication token is missing."
            );
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response =
                await fetch(
                    `${BACKEND_URL}/api/feedback?status=${status}`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to load feedback."
                );
            }

            setFeedback(
                data.feedback || []
            );
        } catch (error) {
            console.error(
                "Load feedback error:",
                error
            );

            setError(
                error.message ||
                "Failed to load feedback."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadFeedback();
    }, [status]);

    async function updateFeedback(
        id,
        action
    ) {
        const token =
            localStorage.getItem("token");

        if (!token) return;

        try {
            const response =
                await fetch(
                    `${BACKEND_URL}/api/feedback/${id}/${action}`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    `Failed to ${action} feedback.`
                );
            }

            await loadFeedback();

            setSelectedFeedback(
                null
            );
        } catch (error) {
            console.error(
                `Feedback ${action} error:`,
                error
            );

            setError(
                error.message ||
                `Failed to ${action} feedback.`
            );
        }
    }

    async function deleteFeedback(
        id
    ) {
        const confirmed =
            window.confirm(
                "Are you sure you want to permanently delete this feedback?"
            );

        if (!confirmed) return;

        const token =
            localStorage.getItem("token");

        if (!token) return;

        try {
            const response =
                await fetch(
                    `${BACKEND_URL}/api/feedback/${id}`,
                    {
                        method: "DELETE",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to delete feedback."
                );
            }

            await loadFeedback();

            setSelectedFeedback(
                null
            );
        } catch (error) {
            console.error(
                "Delete feedback error:",
                error
            );

            setError(
                error.message ||
                "Failed to delete feedback."
            );
        }
    }

    function renderStars(rating) {
        return (
            <span className="feedback-table-stars">
                {[1, 2, 3, 4, 5].map(
                    (star) => (
                        <span
                            key={star}
                            className={
                                star <=
                                    rating
                                    ? "filled"
                                    : ""
                            }
                        >
                            ★
                        </span>
                    )
                )}
            </span>
        );
    }

    return (
        <section className="feedback-management">
            <div className="feedback-management-header">
                <div>
                    <h2>
                        Feedback Management
                    </h2>

                    <p>
                        Review feedback
                        submitted by
                        RescueBase users.
                    </p>
                </div>

                <select
                    value={status}
                    onChange={(e) =>
                        setStatus(
                            e.target.value
                        )
                    }
                >
                    <option value="active">
                        Active Feedback
                    </option>

                    <option value="archived">
                        Archived Feedback
                    </option>
                </select>
            </div>

            {error && (
                <div className="feedback-message feedback-error">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="feedback-loading">
                    Loading feedback...
                </div>
            ) : feedback.length ===
                0 ? (
                <div className="feedback-empty">
                    No feedback found.
                </div>
            ) : (
                <div className="feedback-table-wrapper">
                    <table className="feedback-table">
                        <thead>
                            <tr>
                                <th>
                                    User
                                </th>

                                <th>
                                    Role
                                </th>

                                <th>
                                    Category
                                </th>

                                <th>
                                    Rating
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Date
                                </th>

                                <th>
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {feedback.map(
                                (item) => (
                                    <tr
                                        key={
                                            item._id
                                        }
                                    >
                                        <td>
                                            <strong>
                                                {
                                                    item.userName
                                                }
                                            </strong>

                                            <small>
                                                {
                                                    item.userEmail
                                                }
                                            </small>
                                        </td>

                                        <td>
                                            <span className="feedback-role">
                                                {
                                                    item.role
                                                }
                                            </span>
                                        </td>

                                        <td>
                                            {
                                                CATEGORY_LABELS[
                                                item
                                                    .category
                                                ] ||
                                                item.category
                                            }
                                        </td>

                                        <td>
                                            {renderStars(
                                                item.rating
                                            )}
                                        </td>

                                        <td>
                                            <span
                                                className={`feedback-status ${item.status}`}
                                            >
                                                {
                                                    item.status
                                                }
                                            </span>
                                        </td>

                                        <td>
                                            {new Date(
                                                item.createdAt
                                            ).toLocaleDateString()}
                                        </td>

                                        <td>
                                            <div className="feedback-actions">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedFeedback(
                                                            item
                                                        )
                                                    }
                                                >
                                                    View
                                                </button>

                                                {item.status ===
                                                    "active" ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateFeedback(
                                                                item._id,
                                                                "archive"
                                                            )
                                                        }
                                                    >
                                                        Archive
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateFeedback(
                                                                item._id,
                                                                "restore"
                                                            )
                                                        }
                                                    >
                                                        Restore
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="danger"
                                                    onClick={() =>
                                                        deleteFeedback(
                                                            item._id
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedFeedback && (
                <div
                    className="feedback-modal-overlay"
                    onClick={() =>
                        setSelectedFeedback(
                            null
                        )
                    }
                >
                    <div
                        className="feedback-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >
                        <div className="feedback-modal-header">
                            <h3>
                                Feedback Details
                            </h3>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedFeedback(
                                        null
                                    )
                                }
                            >
                                ✕
                            </button>
                        </div>

                        <div className="feedback-detail">
                            <strong>
                                User
                            </strong>

                            <p>
                                {
                                    selectedFeedback.userName
                                }
                            </p>

                            <small>
                                {
                                    selectedFeedback.userEmail
                                }
                            </small>
                        </div>

                        <div className="feedback-detail">
                            <strong>
                                Role
                            </strong>

                            <p>
                                {
                                    selectedFeedback.role
                                }
                            </p>
                        </div>

                        <div className="feedback-detail">
                            <strong>
                                Category
                            </strong>

                            <p>
                                {CATEGORY_LABELS[
                                    selectedFeedback
                                        .category
                                ] ||
                                    selectedFeedback.category}
                            </p>
                        </div>

                        <div className="feedback-detail">
                            <strong>
                                Rating
                            </strong>

                            <div>
                                {renderStars(
                                    selectedFeedback.rating
                                )}
                            </div>
                        </div>

                        <div className="feedback-detail">
                            <strong>
                                Feedback
                            </strong>

                            <p>
                                {
                                    selectedFeedback.message
                                }
                            </p>
                        </div>

                        <div className="feedback-detail">
                            <strong>
                                Submitted
                            </strong>

                            <p>
                                {new Date(
                                    selectedFeedback.createdAt
                                ).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}