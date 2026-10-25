import {
    useMemo, useState
} from "react"
// TO BE REMOVE
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

    const stats = useMemo(() => {
        const count = (status) =>
            recommendations.filter((item) => item.status === status).length;

        const averageMatch = recommendations.length
            ? Math.round(
                recommendations.reduce((sum, item) => sum + Number(item.score || 0), 0) /
                recommendations.length
            )
            : 0;

        return {
            waiting: count("review"),
            approved: count("approved"),
            rejected: count("rejected"),
            averageMatch,
        };
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
            <div className="um-strip">
                <div className="um-strip-total">
                    <b>{stats.waiting}</b>
                    <small>Waiting for review</small>
                </div>
                <div>
                    <small>Approved</small>
                    <b>{stats.approved}</b>
                </div>
                <div>
                    <small>Rejected</small>
                    <b>{stats.rejected}</b>
                </div>
                <div>
                    <small>Average match</small>
                    <b>{stats.averageMatch}%</b>
                </div>
            </div>

            <section className="admin-recommendation-grid">
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