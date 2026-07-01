import { useMemo, useState } from "react";

const starterQuizResults = [
    {
        id: 1,
        applicantName: "Maria Santos",
        email: "maria@example.com",
        preferredPet: "Dog",
        lifestyle: "Active",
        homeSpace: "House with yard",
        matchScore: 92,
        recommendedPet: "Max",
    },
    {
        id: 2,
        applicantName: "Juan Dela Cruz",
        email: "juan@example.com",
        preferredPet: "Cat",
        lifestyle: "Calm",
        homeSpace: "Apartment",
        matchScore: 86,
        recommendedPet: "Luna",
    },
    {
        id: 3,
        applicantName: "Ana Reyes",
        email: "ana@example.com",
        preferredPet: "Dog",
        lifestyle: "Moderate",
        homeSpace: "Small house",
        matchScore: 78,
        recommendedPet: "Oreo",
    },
];

export default function MatchingQuizResults() {
    const [quizResults, setQuizResults] = useState(starterQuizResults);

    const [quizForm, setQuizForm] = useState({
        applicantName: "",
        email: "",
        preferredPet: "Dog",
        lifestyle: "Moderate",
        homeSpace: "",
        matchScore: "",
        recommendedPet: "",
    });

    const averageScore = useMemo(() => {
        if (quizResults.length === 0) return 0;

        const total = quizResults.reduce(
            (sum, result) => sum + Number(result.matchScore || 0),
            0
        );

        return Math.round(total / quizResults.length);
    }, [quizResults]);

    function handleAddQuizResult(e) {
        e.preventDefault();

        const newResult = {
            id: Date.now(),
            ...quizForm,
            matchScore: Number(quizForm.matchScore),
        };

        setQuizResults((current) => [newResult, ...current]);

        setQuizForm({
            applicantName: "",
            email: "",
            preferredPet: "Dog",
            lifestyle: "Moderate",
            homeSpace: "",
            matchScore: "",
            recommendedPet: "",
        });
    }

    return (
        <section className="admin-quiz-page">
            <section className="admin-quiz-stats">
                <article className="admin-panel admin-quiz-stat-card">
                    <span>Total Quiz Results</span>
                    <strong>{quizResults.length}</strong>
                </article>

                <article className="admin-panel admin-quiz-stat-card">
                    <span>Average Match Score</span>
                    <strong>{averageScore}%</strong>
                </article>
            </section>

            <section className="admin-quiz-grid">
                <section className="admin-panel admin-quiz-form-panel">
                    <div className="admin-panel-heading">
                        <h2>Add Quiz Result</h2>
                    </div>

                    <form className="admin-quiz-form" onSubmit={handleAddQuizResult}>
                        <label>
                            Applicant Name
                            <input
                                type="text"
                                value={quizForm.applicantName}
                                onChange={(e) =>
                                    setQuizForm({
                                        ...quizForm,
                                        applicantName: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Email
                            <input
                                type="email"
                                value={quizForm.email}
                                onChange={(e) =>
                                    setQuizForm({
                                        ...quizForm,
                                        email: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Preferred Pet
                            <select
                                value={quizForm.preferredPet}
                                onChange={(e) =>
                                    setQuizForm({
                                        ...quizForm,
                                        preferredPet: e.target.value,
                                    })
                                }
                            >
                                <option value="Dog">Dog</option>
                                <option value="Cat">Cat</option>
                                <option value="Any">Any</option>
                            </select>
                        </label>

                        <label>
                            Lifestyle
                            <select
                                value={quizForm.lifestyle}
                                onChange={(e) =>
                                    setQuizForm({
                                        ...quizForm,
                                        lifestyle: e.target.value,
                                    })
                                }
                            >
                                <option value="Calm">Calm</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Active">Active</option>
                            </select>
                        </label>

                        <label>
                            Home Space
                            <input
                                type="text"
                                value={quizForm.homeSpace}
                                onChange={(e) =>
                                    setQuizForm({
                                        ...quizForm,
                                        homeSpace: e.target.value,
                                    })
                                }
                                placeholder="Example: Apartment, house with yard"
                                required
                            />
                        </label>

                        <label>
                            Match Score
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={quizForm.matchScore}
                                onChange={(e) =>
                                    setQuizForm({
                                        ...quizForm,
                                        matchScore: e.target.value,
                                    })
                                }
                                placeholder="0 - 100"
                                required
                            />
                        </label>

                        <label>
                            Recommended Pet
                            <input
                                type="text"
                                value={quizForm.recommendedPet}
                                onChange={(e) =>
                                    setQuizForm({
                                        ...quizForm,
                                        recommendedPet: e.target.value,
                                    })
                                }
                                placeholder="Example: Max"
                                required
                            />
                        </label>

                        <button type="submit">Add Quiz Result</button>
                    </form>
                </section>

                <section className="admin-panel admin-quiz-list-panel">
                    <div className="admin-panel-heading">
                        <h2>Matching Quiz Results</h2>
                    </div>

                    <div className="admin-quiz-list">
                        {quizResults.map((result) => (
                            <article className="admin-quiz-row" key={result.id}>
                                <div>
                                    <h3>{result.applicantName}</h3>
                                    <p>{result.email}</p>

                                    <small>
                                        {result.preferredPet} • {result.lifestyle} •{" "}
                                        {result.homeSpace}
                                    </small>
                                </div>

                                <div className="admin-quiz-score">
                                    <strong>{result.matchScore}%</strong>
                                    <span>{result.recommendedPet}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </section>
        </section>
    );
}