import { useState, useEffect } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function FosterHistory() {
    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    const fosterEmail = String(
        savedUser.email || ""
    )
        .trim()
        .toLowerCase();

    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [message, setMessage] = useState("");

    async function loadHistory() {
        try {
            setLoading(true);

            const response = await fetch(
                `${API}/api/foster/assignments/foster/${encodeURIComponent(
                    fosterEmail
                )}/history`
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setHistory([]);

                setMessage(
                    data.message ||
                    "Unable tto load foster history."
                );
                return;
            }

            setHistory(
                data.history || []
            );

            setMessage("");
        } catch (error) {
            console.error(error);
            setHistory([]);

            setMessage(
                "Server error while loading foster history."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (fosterEmail) {
            loadHistory();
        }
    }, []);

    function formatDate(date) {
        if (!date) return "N/A";

        return new Date(date).toLocaleDateString(
            "en-PH",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
            }
        );
    }

    if (loading) {
        return (
            <section className="foster-panel">
                <div className="foster-loading">
                    Loading foster history....
                </div>
            </section>
        );
    }

    return (
        <section className="foster-history-page">
            <section className="foster-panel">
                <div className="foster-section-title">
                    <div>
                        <span className="foster-label">

                            Foster Records
                        </span>
                        <h2>
                            Foster History
                        </h2>
                        <p>
                            View all of your completed foster assignments.
                        </p>
                    </div>
                </div>
            </section>
            {
                history.length === 0 ? (
                    <section className="foster-panel foster-empty">
                        <h3>
                            No Foster History
                        </h3>
                        <p>
                            Completed foster assignments
                            will appear here.
                        </p>
                    </section>
                )
                    :
                    (
                        <section className="foster-history-list">
                            {
                                history.map((item) => (
                                    <article
                                        className="foster-history-card"
                                        key={item._id}
                                    >
                                        <div className="history-image">
                                            <img
                                                src={
                                                    item.petImage ||
                                                    "https://placehold.co/220x220?text=Pet"
                                                }
                                                alt={item.petName}
                                            />
                                        </div>
                                        <div className="history-content">
                                            <h3>
                                                {item.petName}
                                            </h3>
                                            <p>
                                                <strong>Breed:</strong>{" "}
                                                {item.petBreed}
                                            </p>
                                            <p>
                                                <strong>Started:</strong>{" "}
                                                {formatDate(item.startDate)}
                                            </p>
                                            <p>
                                                <strong>Completed:</strong>{" "}
                                                {formatDate(item.endDate)}
                                            </p>
                                            <p>
                                                <strong>Status:</strong>{" "}
                                                {item.status}
                                            </p>
                                            <div className="history-notes">
                                                <h4>
                                                    Care Instructions
                                                </h4>
                                                <p>
                                                    {item.careInstructions}
                                                </p>
                                            </div>
                                        </div>
                                    </article>
                                ))
                            }
                        </section>
                    )
            } {
                message && (
                    <div className="assignment-message">

                        {message}

                    </div>
                )
            }
        </section>
    )
}