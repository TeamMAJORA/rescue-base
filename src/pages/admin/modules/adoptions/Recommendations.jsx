import {
    useMemo, useState
} from "react"

const starterRecommendations = [
    {
        id: 1,
        adopterName: "Maria Santos",
        email: "maria@example.com",
        recommendedPet: "Max",
        petType: "Dog",
        reason: "High activity level matches Max's playful personality.",
        score: 94,
        status: "recommended",
    },
    {
        id: 2,
        adopterName: "Juan Dela Cruz",
        email: "juan@example.com",
        recommendedPet: "Luna",
        petType: "Cat",
        reason: "Calm lifestyle and apartment home match Luna's needs.",
        score: 88,
        status: "review",
    },
];

export default function Recommendations() {
    const [recommendations, setRecommendations] = useState(starterRecommendations);

    const [recommendationForm, setRecommendationForm] = useState({
        adopterName: "",
        email: "",
        recommendedPet: "",
        petType: "Dog",
        reason: "",
        score: "",
        status: "recommended"
    });

    const highMatches = useMemo(() => {
        return recommendations.filter(
            (recommendation) => (recommendation.score) >= 85
        ).length;
    }, [recommendations]);

    function handleAddRecommendations(e) {
        e.preventDefault();

        const newRecommendation = {
            id: Date.now(),
            ...recommendationForm,
            score: Number(recommendationForm.score),
        };

        setRecommendations((current) => [newRecommendation, ...current]);

        setRecommendationForm({
            adopterName: "",
            email: "",
            recommendedPet: "",
            petType: "Dog",
            reason: "",
            score: "",
            status: "recommended",
        });
    }

    return (
        <section className="admin-recommendation-page">
            <section className="admin-recommendation-stats">
                <article className="admin-panel admin-recommendation-stat-card">
                    <span>Total Recommendations</span>
                    <strong>{recommendations.length}</strong>
                </article>

                <article className="admin-panel admin-recommendation-stat-card">
                    <span>High Match Results</span>
                    <strong>{highMatches}</strong>
                </article>
            </section>

            <section className="admin-recommendation-grid">
                <section className="admin-panel admin-recommendation-form-panel">
                    <div className="admin-panel-heading">
                        <h2>Add Recommendation</h2>
                    </div>

                    <form
                        className="admin-recommendation-form"
                        onSubmit={handleAddRecommendations}
                    >
                        <label>
                            Adopter Name
                            <input
                                type="text"
                                value={recommendationForm.adopterName}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        adopterName: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Email
                            <input
                                type="email"
                                value={recommendationForm.email}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        email: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Recommended Pet
                            <input
                                type="text"
                                value={recommendationForm.recommendedPet}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        recommendedPet: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Pet Type
                            <select
                                value={recommendationForm.petType}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        petType: e.target.value,
                                    })
                                }
                            >
                                <option value="Dog">Dog</option>
                                <option value="Cat">Cat</option>
                                <option value="Any">Any</option>
                            </select>
                        </label>

                        <label>
                            Match Score
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={recommendationForm.score}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        score: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Status
                            <select
                                value={recommendationForm.status}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        status: e.target.value,
                                    })
                                }
                            >
                                <option value="recommended">Recommended</option>
                                <option value="review">Needs Review</option>
                            </select>
                        </label>

                        <label className="admin-recommendation-reason-field">
                            Reason
                            <textarea
                                value={recommendationForm.reason}
                                onChange={(e) =>
                                    setRecommendationForm({
                                        ...recommendationForm,
                                        reason: e.target.value,
                                    })
                                }
                                placeholder="Explain why this pet is recommended."
                                required
                            />
                        </label>

                        <button type="submit">Add Recommendation</button>
                    </form>
                </section>

                <section className="admin-panel admin-recommendation-list-panel">
                    <div className="admin-panel-heading">
                        <h2>Recommendations</h2>
                    </div>

                    <div className="admin-recommendation-list">
                        {recommendations.map((recommendation) => (
                            <article
                                className="admin-recommendation-row"
                                key={recommendation.id}
                            >
                                <div>
                                    <h3>{recommendation.adopterName}</h3>
                                    <p>{recommendation.email}</p>

                                    <small>
                                        {recommendation.petType} •{" "}
                                        {recommendation.recommendedPet}
                                    </small>

                                    <span>{recommendation.reason}</span>
                                </div>

                                <div className="admin-recommendation-score">
                                    <strong>{recommendation.score}%</strong>
                                    <span>{recommendation.status}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </section>
        </section>
    );
}