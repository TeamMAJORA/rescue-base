import { useMemo, useState } from "react";

const starterFeedback = [
    {
        id: 1,
        name: "Maria Santos",
        email: "maria@example.com",
        role: "Adopter",
        category: "Adoption Process",
        rating: 5,
        message: "The adoption process was easy to understand and the pet details were helpful.",
        status: "new",
        date: "2026-06-29",
    },
    {
        id: 2,
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        role: "Foster",
        category: "Foster Care",
        rating: 4,
        message: "The foster dashboard is useful, but it would be nice to upload more photos.",
        status: "reviewed",
        date: "2026-06-28",
    },
    {
        id: 3,
        name: "Ana Reyes",
        email: "ana@example.com",
        role: "Visitor",
        category: "Lost & Found",
        rating: 4,
        message: "Lost and found reports are clear. A map feature would make it better.",
        status: "new",
        date: "2026-06-27",
    },
]

export default function Feedback() {
    const [feedbackList, setFeedbackList] = useState(starterFeedback);
    const [filter, setFilter] = useState("all");

    const filteredFeedback = useMemo(() => {
        if (filter === "all") return feedbackList;
        return feedbackList.filter((feedback) => feedback.status === filter);
    }, [feedbackList, filter]);

    const newFeedback = useMemo(() => {
        return feedbackList.filter((feedback) => feedback.status === "new").length;
    }, [feedbackList]);

    const averageRating = useMemo(() => {
        if (feedbackList.length === 0) return 0;

        const total = feedbackList.reduce(
            (sum, feedback) => sum + Number(feedback.rating || 0),
            0
        );
        return (total / feedbackList.length).toFixed(1);
    }, [feedbackList]);

    function handleMarkReviewed(id) {
        setFeedbackList((current) =>
            current.map((feedback) =>
                feedback.id === id ? { ...feedback, status: "reviewed" } : feedback
            )
        );
    }

    function handleDeleteFeedback(id) {
        setFeedbackList((current) =>
            current.filter((feedback) => feedback.id !== id)
        );
    }

    return (
        <section className="admin-feedback-page">
            <section className="admin-feedback-stats">
                <article className="admin-panel admin-feedback-stat-card">
                    <span>Total Feedback</span>
                    <strong>{feedbackList.length}</strong>
                </article>

                <article className="admin-panel admin-feedback-stat-card">
                    <span>New Feedback</span>
                    <strong>{newFeedback}</strong>
                </article>

                <article className="admin-panel admin-feedback-stat-card">
                    <span>Average Rating</span>
                    <strong>{averageRating}/5</strong>
                </article>
            </section>

            <section className="admin-panel admin-feedback-list-panel">
                <div className="admin-panel-heading">
                    <h2>User Feedback</h2>

                    <select
                        className="admin-feedback-filter"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Feedback</option>
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                    </select>
                </div>

                {filteredFeedback.length === 0 ? (
                    <p className="admin-empty">No feedback found.</p>
                ) : (
                    <div className="admin-feedback-list">
                        {filteredFeedback.map((feedback) => (
                            <article className="admin-feedback-row" key={feedback.id}>
                                <div>
                                    <h3>{feedback.name}</h3>

                                    <p>
                                        {feedback.email} • {feedback.role} •{" "}
                                        {feedback.category}
                                    </p>

                                    <small>
                                        Rating: {feedback.rating}/5 • {feedback.date}
                                    </small>

                                    <span>{feedback.message}</span>
                                </div>

                                <div className="admin-feedback-actions">
                                    <span className={`admin-status-pill ${feedback.status}`}>
                                        {feedback.status}
                                    </span>

                                    {feedback.status === "new" && (
                                        <button
                                            type="button"
                                            onClick={() => handleMarkReviewed(feedback.id)}
                                        >
                                            Mark Reviewed
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="danger"
                                        onClick={() => handleDeleteFeedback(feedback.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}