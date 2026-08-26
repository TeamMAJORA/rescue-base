import { useState } from "react";

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

            onSubmitted?.(data.feedback);
        } catch (error) {
            console.error("Submit feedback error:", error);
            setError(error.message || "Failed to submit feedback");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form
            className="feedback-form"
            onSubmit={handleSubmit}
        >
            <div className="feedback-form-header">
                <h2>
                    Share Your Feedback
                </h2>

                <p>
                    Tell us about your
                    experience with
                    RescueBase.
                </p>
            </div>

            {error && (
                <div className="feedback-message feedback-error">
                    {error}
                </div>
            )}

            {success && (
                <div className="feedback-message feedback-success">
                    {success}
                </div>
            )}

            <div className="feedback-field">
                <label>
                    Rating
                </label>

                <div className="feedback-stars">
                    {[1, 2, 3, 4, 5].map(
                        (star) => (
                            <button
                                key={star}
                                type="button"
                                className={
                                    star <=
                                        rating
                                        ? "selected"
                                        : ""
                                }
                                onClick={() =>
                                    setRating(
                                        star
                                    )
                                }
                                aria-label={`Rate ${star} out of 5`}
                            >
                                ★
                            </button>
                        )
                    )}
                </div>

                <span className="feedback-rating-text">
                    {rating === 0
                        ? "Select a rating"
                        : `${rating} out of 5`}
                </span>
            </div>

            <div className="feedback-field">
                <label htmlFor="feedback-category">
                    Category
                </label>

                <select
                    id="feedback-category"
                    value={category}
                    onChange={(e) =>
                        setCategory(
                            e.target.value
                        )
                    }
                >
                    {categories.map(
                        (item) => (
                            <option
                                key={
                                    item.value
                                }
                                value={
                                    item.value
                                }
                            >
                                {item.label}
                            </option>
                        )
                    )}
                </select>
            </div>

            <div className="feedback-field">
                <label htmlFor="feedback-message">
                    Your Feedback
                </label>

                <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) =>
                        setMessage(
                            e.target.value
                        )
                    }
                    maxLength={2000}
                    rows={6}
                    placeholder="Tell us about your experience or suggestions..."
                />

                <span className="feedback-character-count">
                    {message.length}/2000
                </span>
            </div>

            <button
                type="submit"
                className="feedback-submit"
                disabled={loading}
            >
                {loading
                    ? "Submitting..."
                    : "Submit Feedback"}
            </button>
        </form>
    );
}