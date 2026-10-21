import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

const categories = [
    {
        value: "general",
        label: "General",
    },
    {
        value: "adoption",
        label: "Adoption",
    },
    {
        value: "foster",
        label: "Foster Care",
    },
    {
        value: "volunteer",
        label: "Volunteer",
    },
    {
        value: "donation",
        label: "Donation",
    },
    {
        value: "lost_found",
        label: "Lost & Found",
    },
    {
        value: "medical",
        label: "Medical",
    },
    {
        value: "website",
        label: "Website",
    },
    {
        value: "other",
        label: "Other",
    },
];

export default function FeedbackForm({ onSubmitted }) {
    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState("general");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const token = localStorage.getItem("token");
    const [viewingFeedback, setViewingFeedback] = useState(null);
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!token) {
            setError("You must be logged in to submit feedback");
            return;
        }

        if (rating < 1) {
            setError("Please select a rating.");
            return;
        }

        if (!message.trim()) {
            setError("Please enter your feedback.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `${API}/api/feedback`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        rating,
                        category,
                        message:
                            message.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to submit feedback.")
            }

            setRating(0);
            setCategory("general");
            setMessage("");

            setSuccess("Thank you! Your feedback has been submitted.");
            loadHistory();

            onSubmitted?.(data.feedback);
        } catch (error) {
            console.error("Submit feedback error:", error);
            setError(error.message || "Failed to submit feedback");
        } finally {
            setLoading(false);
        }
    }
        const [history, setHistory] = useState([]);
const [historyLoading, setHistoryLoading] = useState(true);

async function loadHistory() {
    const token = localStorage.getItem("token");
    if (!token) {
        setHistoryLoading(false);
        return;
    }

    try {
        setHistoryLoading(true);
        const response = await fetch(`${API}/api/feedback/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && data.success) setHistory(data.feedback || []);
    } catch (err) {
        console.error("Load feedback history error:", err);
    } finally {
        setHistoryLoading(false);
    }
}

useEffect(() => {
    loadHistory();
}, []);
    
        return (
        <>
            <section className="fb-hero">
                <span className="fb-hero-badge">Feedback</span>
                <h1>Help us make RescueBase better for every animal and adopter!</h1>
                <p>Tell us about your experience with RescueBase. It only takes a minute.</p>
            </section>

            <div className="fb-layout">
                <form className="fbf-form" onSubmit={handleSubmit}>
                    <div className="fbf-header">
                        <h2>Share your Feedback</h2>
                        <p>Rate your experience and leave a comment for us!</p>
                    </div>

                    {error && <div className="feedback-message feedback-error">{error}</div>}
                    {success && <div className="feedback-message feedback-success">{success}</div>}

                    <div className="fbf-field">
                        <span className="fbf-label">
                            Rating <em>*</em>
                        </span>

                        <div className="fbf-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <div className="fbf-star-cell" key={star}>
                                    <button
                                        type="button"
                                        className={`fbf-star ${star <= rating ? "is-on" : ""}`}
                                        onClick={() => setRating(star)}
                                        aria-label={`Rate ${star} out of 5`}
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M12 2.8l2.85 5.95 6.55.85-4.8 4.55 1.25 6.5L12 17.4l-5.85 3.25 1.25-6.5L2.6 9.6l6.55-.85z" />
                                        </svg>
                                    </button>
                                    {star === 1 && <small>Poor</small>}
                                    {star === 5 && <small>Excellent</small>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="fbf-field">
                        <label className="fbf-label" htmlFor="feedback-category">
                            Category <em>*</em>
                        </label>

                        <select
                            id="feedback-category"
                            className="fbf-input"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {categories.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="fbf-field">
                        <div className="fbf-label-row">
                            <label className="fbf-label" htmlFor="feedback-message">
                                Your Feedback
                            </label>
                            <small>Optional</small>
                        </div>

                        <textarea
                            id="feedback-message"
                            className="fbf-input"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={2000}
                            rows={6}
                            placeholder="Tell us about your experience or suggestions..."
                        />

                        <span className="fbf-count">{message.length} / 2000</span>
                    </div>

                    <button type="submit" className="fbf-submit" disabled={loading}>
                        {loading ? "Submitting..." : "Submit Feedback"}
                    </button>
                </form>

               <aside className="fb-side">
    <section className="fb-card">
        <h3>What happens next</h3>
        <ol className="fb-steps">
            <li><span>1</span>Your feedback goes to the shelter admin.</li>
            <li><span>2</span>The team reviews it and uses it to improve the system.</li>
            <li><span>3</span>You can send more feedback anytime.</li>
        </ol>
    </section>

    <section className="fb-card is-outline">
        <h3>Tips for useful feedback</h3>
        <ul className="fb-tips">
            <li>Say what you were trying to do.</li>
            <li>Describe what worked or didn't.</li>
            <li>Don't include passwords or payment details.</li>
        </ul>
    </section>

    <section className="fb-card">
        <h3>Your feedback history</h3>

        {historyLoading ? (
            <p className="fb-history-empty">Loading...</p>
        ) : history.length === 0 ? (
            <p className="fb-history-empty">You haven't sent any feedback yet.</p>
        ) : (
            <ul className="fb-history">
                {history.map((item) => (
    <li
        key={item._id}
        className="fb-history-item"
        role="button"
        tabIndex={0}
        onClick={() => setViewingFeedback(item)}
        onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setViewingFeedback(item);
            }
        }}
    >
        <div className="fb-history-top">
            <span className="fb-history-stars" aria-label={`${item.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={s <= item.rating ? "is-on" : ""}>★</span>
                ))}
            </span>
            <small>
                {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                })}
            </small>
        </div>

        <div className="fb-history-meta">
            <span className="fb-history-cat">
                {categories.find((c) => c.value === item.category)?.label || item.category}
            </span>
            <span className={`fb-history-status is-${item.status}`}>
                {item.status === "archived" ? "Reviewed" : "Received"}
            </span>
        </div>

        {item.message && <p>{item.message}</p>}
    </li>
))}
            </ul>
        )}
    </section>
</aside>
                        <ul className="fb-tips">
                            <li>Say what you were trying to do.</li>
                            <li>Describe what worked or didn't.</li>
                            <li>Don't include passwords or payment details.</li>
                        </ul>
                   
                
            </div>
            {viewingFeedback && (
    <div className="fb-modal-overlay" onClick={() => setViewingFeedback(null)}>
        <div
            className="fb-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Feedback details"
            onClick={(e) => e.stopPropagation()}
        >
            <header className="fb-modal-head">
                <h3>Feedback details</h3>
                <button
                    type="button"
                    className="fb-modal-close"
                    onClick={() => setViewingFeedback(null)}
                    aria-label="Close"
                >
                    ×
                </button>
            </header>

            <div className="fb-modal-stars" aria-label={`${viewingFeedback.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={s <= viewingFeedback.rating ? "is-on" : ""}>★</span>
                ))}
                <b>{viewingFeedback.rating} / 5</b>
            </div>

            <dl className="fb-modal-facts">
                <div>
                    <dt>Category</dt>
                    <dd>
                        {categories.find((c) => c.value === viewingFeedback.category)?.label ||
                            viewingFeedback.category}
                    </dd>
                </div>
                <div>
                    <dt>Status</dt>
                    <dd>
                        <span className={`fb-history-status is-${viewingFeedback.status}`}>
                            {viewingFeedback.status === "archived" ? "Reviewed" : "Received"}
                        </span>
                    </dd>
                </div>
                <div>
                    <dt>Submitted</dt>
                    <dd>
                        {new Date(viewingFeedback.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                        })}
                    </dd>
                </div>
                {viewingFeedback.archivedAt && (
                    <div>
                        <dt>Reviewed</dt>
                        <dd>
                            {new Date(viewingFeedback.archivedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })}
                        </dd>
                    </div>
                )}
            </dl>

            <h4>Your message</h4>
            <p className="fb-modal-message">{viewingFeedback.message}</p>

            <footer className="fb-modal-foot">
                <button type="button" className="fb-modal-btn" onClick={() => setViewingFeedback(null)}>
                    Close
                </button>
            </footer>
        </div>
    </div>
)}
        </>
    );
}

