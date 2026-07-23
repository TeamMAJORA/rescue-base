import { useMemo } from "react";

const FACTORS = [
    {
        key: "energy",
        label: "Energy Level",
        quizKey: "energyPreference",
        petKeys: ["energyLevel", "energy"],
        type: "preference",
    },
    {
        key: "friendliness",
        label: "Friendliness",
        quizKey: "friendlinessPreference",
        petKeys: ["friendliness"],
        type: "preference",
    },
    {
        key: "humanSociability",
        label: "Human Sociability",
        quizKey: "humanSociabilityPreference",
        petKeys: ["humanSociability"],
        type: "preference",
    },
    {
        key: "animalSociability",
        label: "Animal Sociability",
        quizKey: "animalSociabilityPreference",
        petKeys: ["animalSociability"],
        type: "preference",
    },
    {
        key: "trainability",
        label: "Trainability",
        quizKey: "trainabilityPreference",
        petKeys: ["trainability"],
        type: "preference",
    },
    {
        key: "anxiety",
        label: "Anxiety Compatibility",
        quizKey: "anxietyTolerance",
        petKeys: ["anxiety"],
        type: "tolerance",
    },
    {
        key: "aggression",
        label: "Aggression Compatibility",
        quizKey: "aggressionTolerance",
        petKeys: ["aggression"],
        type: "tolerance",
    },
    {
        key: "activity",
        label: "Activity Level",
        quizKey: "activityPreference",
        petKeys: ["activityLevel", "activity"],
        type: "preference",
    },
];

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}

function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function formatStatus(value) {
    return String(value || "available").replaceAll("_", " ");
}

function readSavedQuiz() {
    try {
        return JSON.parse(
            localStorage.getItem("rescuebase_matchmaking_quiz") || "null"
        );
    } catch {
        return null;
    }
}

function getBehaviorSources(pet) {
    return [
        pet?.behavioralAssessment,
        pet?.behaviorAssessment,
        pet?.behaviorScores,
        pet?.behavior,
        pet?.assessment,
        pet,
    ].filter(Boolean);
}

function getPetBehaviorScore(pet, keys) {
    const sources = getBehaviorSources(pet);

    for (const source of sources) {
        for (const key of keys) {
            const rawValue = source?.[key];
            const numericValue = Number(rawValue);

            if (
                Number.isFinite(numericValue) &&
                numericValue >= 1 &&
                numericValue <= 5
            ) {
                return numericValue;
            }
        }
    }

    return null;
}

function calculatePreferenceScore(preferredValue, animalValue) {
    const difference = Math.abs(preferredValue - animalValue);
    return clamp(100 - difference * 25, 0, 100);
}

function calculateToleranceScore(toleranceValue, animalValue) {
    if (animalValue <= toleranceValue) {
        return 100;
    }

    const excess = animalValue - toleranceValue;
    return clamp(100 - excess * 30, 0, 100);
}

function getTier(score) {
    if (score >= 80) {
        return {
            key: "perfect",
            label: "Perfect Paw Match",
            description:
                "This animal closely matches your lifestyle and behavioral preferences.",
        };
    }

    if (score >= 60) {
        return {
            key: "thought",
            label: "Paws for Thought",
            description:
                "This may be a suitable match, but some needs should be considered carefully.",
        };
    }

    return {
        key: "no-match",
        label: "No Paw-sible Match",
        description:
            "This animal currently has several needs that may not align with your preferences.",
    };
}

function calculateRecommendation(pet, quiz) {
    const breakdown = FACTORS.map((factor) => {
        const adopterValue = Number(quiz?.[factor.quizKey]);
        const animalValue = getPetBehaviorScore(pet, factor.petKeys);

        if (
            !Number.isFinite(adopterValue) ||
            adopterValue < 1 ||
            adopterValue > 5 ||
            animalValue === null
        ) {
            return {
                ...factor,
                adopterValue:
                    Number.isFinite(adopterValue) &&
                    adopterValue >= 1 &&
                    adopterValue <= 5
                        ? adopterValue
                        : null,
                animalValue,
                compatibility: null,
            };
        }

        const compatibility =
            factor.type === "tolerance"
                ? calculateToleranceScore(adopterValue, animalValue)
                : calculatePreferenceScore(adopterValue, animalValue);

        return {
            ...factor,
            adopterValue,
            animalValue,
            compatibility,
        };
    });

    const measuredFactors = breakdown.filter(
        (factor) => factor.compatibility !== null
    );

    let score =
        measuredFactors.length > 0
            ? measuredFactors.reduce(
                  (total, factor) => total + factor.compatibility,
                  0
              ) / measuredFactors.length
            : 0;

    const preferredPetType = normalizeText(quiz?.preferredPetType);
    const preferredSize = normalizeText(quiz?.preferredSize);
    const petType = normalizeText(pet?.type || pet?.species);
    const petSize = normalizeText(pet?.size);

    const matchesPreferredType =
        !preferredPetType ||
        preferredPetType === "any" ||
        preferredPetType === petType;

    const matchesPreferredSize =
        !preferredSize ||
        preferredSize === "any" ||
        preferredSize === petSize;

    if (!matchesPreferredType) {
        score -= 12;
    }

    if (!matchesPreferredSize) {
        score -= 8;
    }

    score = Math.round(clamp(score, 0, 100));

    const sortedMeasuredFactors = [...measuredFactors].sort(
        (first, second) =>
            second.compatibility - first.compatibility
    );

    const strongestFactors = sortedMeasuredFactors
        .slice(0, 2)
        .map((factor) => factor.label);

    const attentionFactors = [...measuredFactors]
        .sort(
            (first, second) =>
                first.compatibility - second.compatibility
        )
        .filter((factor) => factor.compatibility < 75)
        .slice(0, 2)
        .map((factor) => factor.label);

    return {
        pet,
        score,
        tier: getTier(score),
        breakdown,
        measuredCount: measuredFactors.length,
        strongestFactors,
        attentionFactors,
        matchesPreferredType,
        matchesPreferredSize,
    };
}

function isPetAvailable(pet) {
    const status = normalizeText(
        pet?.status ||
            pet?.adoptionStatus ||
            pet?.availabilityStatus ||
            "available"
    );

    return status === "available";
}

export default function Recommendations({
    pets = [],
    loading,
    error,
    onRefresh,
    onApply,
    hasPendingApplication,
    applicationStatus,
    onTakeQuiz,
}) {
    const quiz = useMemo(() => readSavedQuiz(), []);

    const recommendations = useMemo(() => {
        if (!quiz) {
            return [];
        }

        return pets
            .map((pet) => calculateRecommendation(pet, quiz))
            .sort((first, second) => second.score - first.score);
    }, [pets, quiz]);

    const perfectMatches = recommendations.filter(
        (recommendation) => recommendation.score >= 80
    ).length;

    const topRecommendation = recommendations[0] || null;

    if (!quiz) {
        return (
            <section className="recommendations-module">
                <div className="recommendations-empty-state">
                    <span>🐾</span>

                    <h2>Complete Your Matchmaking Quiz</h2>

                    <p>
                        RescueBase needs your lifestyle and behavioral
                        preferences before it can calculate pet compatibility.
                    </p>

                    <button
                        type="button"
                        onClick={() => onTakeQuiz?.()}
                    >
                        Take Matchmaking Quiz
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="recommendations-module">
            <header className="recommendations-header">
                <div>
                    <span>Behavioral Matching Results</span>

                    <h2>Your Recommended Pets</h2>

                    <p>
                        These compatibility scores compare your matchmaking
                        preferences with each animal’s behavioral assessment.
                    </p>
                </div>

                <div className="recommendations-header-actions">
                    <button
                        type="button"
                        className="recommendations-retake-button"
                        onClick={() => onTakeQuiz?.()}
                    >
                        Retake Quiz
                    </button>

                    <button
                        type="button"
                        className="recommendations-refresh-button"
                        onClick={() => onRefresh?.()}
                        disabled={loading}
                    >
                        {loading ? "Refreshing..." : "Refresh Results"}
                    </button>
                </div>
            </header>

            {hasPendingApplication && (
                <section className="recommendations-pending-banner">
                    <div>
                        <span>Pending Adoption Application</span>

                        <h3>
                            Your application for{" "}
                            {applicationStatus?.petName || "an animal"} is
                            currently under review
                        </h3>

                        <p>
                            You may view your recommendations, but you cannot
                            submit another application until the current review
                            is completed.
                        </p>
                    </div>

                    {applicationStatus?.petImage && (
                        <img
                            src={applicationStatus.petImage}
                            alt={
                                applicationStatus.petName ||
                                "Applied animal"
                            }
                        />
                    )}
                </section>
            )}

            <section className="recommendations-summary-grid">
                <article>
                    <span>Top Compatibility</span>

                    <strong>
                        {topRecommendation
                            ? `${topRecommendation.score}%`
                            : "0%"}
                    </strong>

                    <p>
                        {topRecommendation?.pet?.name ||
                            "No result available"}
                    </p>
                </article>

                <article>
                    <span>Perfect Paw Matches</span>
                    <strong>{perfectMatches}</strong>
                    <p>Animals scoring 80% or higher</p>
                </article>

                <article>
                    <span>Animals Evaluated</span>
                    <strong>{recommendations.length}</strong>
                    <p>Currently available RescueBase animals</p>
                </article>
            </section>

            {loading && (
                <div className="recommendations-message-state">
                    <span>🐾</span>
                    <h3>Calculating your matches...</h3>
                    <p>Please wait while RescueBase evaluates the animals.</p>
                </div>
            )}

            {!loading && error && (
                <div className="recommendations-message-state error">
                    <span>!</span>
                    <h3>Recommendations could not be loaded</h3>
                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={() => onRefresh?.()}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {!loading &&
                !error &&
                recommendations.length === 0 && (
                    <div className="recommendations-message-state">
                        <span>🐾</span>
                        <h3>No animals are available</h3>
                        <p>
                            Refresh the page later when new animal profiles are
                            available.
                        </p>
                    </div>
                )}

            {!loading &&
                !error &&
                recommendations.length > 0 && (
                    <div className="recommendations-list">
                        {recommendations.map(
                            (recommendation, index) => {
                                const {
                                    pet,
                                    score,
                                    tier,
                                    breakdown,
                                    measuredCount,
                                    strongestFactors,
                                    attentionFactors,
                                    matchesPreferredType,
                                    matchesPreferredSize,
                                } = recommendation;

                                const available =
                                    isPetAvailable(pet);

                                return (
                                    <article
                                        className={`recommendation-card ${tier.key}`}
                                        key={pet._id || pet.id || index}
                                    >
                                        <div className="recommendation-image">
                                            {pet.image ? (
                                                <img
                                                    src={pet.image}
                                                    alt={pet.name}
                                                />
                                            ) : (
                                                <span>
                                                    {pet.icon || "🐾"}
                                                </span>
                                            )}

                                            <div className="recommendation-rank">
                                                #{index + 1}
                                            </div>
                                        </div>

                                        <div className="recommendation-content">
                                            <div className="recommendation-title-row">
                                                <div>
                                                    <span
                                                        className={`recommendation-tier ${tier.key}`}
                                                    >
                                                        {tier.label}
                                                    </span>

                                                    <h3>
                                                        {pet.name ||
                                                            "Unnamed Animal"}
                                                    </h3>

                                                    <p>
                                                        {pet.type ||
                                                            pet.species ||
                                                            "Pet"}{" "}
                                                        •{" "}
                                                        {pet.breed ||
                                                            "Unknown breed"}
                                                    </p>
                                                </div>

                                                <div
                                                    className={`recommendation-score ${tier.key}`}
                                                >
                                                    <strong>
                                                        {score}%
                                                    </strong>

                                                    <span>
                                                        Compatibility
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="recommendation-tier-description">
                                                {tier.description}
                                            </p>

                                            <div className="recommendation-basic-details">
                                                <span>
                                                    {pet.age ||
                                                        "Unknown age"}
                                                </span>

                                                <span>
                                                    {pet.gender ||
                                                        "Unknown gender"}
                                                </span>

                                                <span>
                                                    {pet.size ||
                                                        "Unknown size"}
                                                </span>

                                                <span>
                                                    {formatStatus(
                                                        pet.status ||
                                                            pet.adoptionStatus
                                                    )}
                                                </span>
                                            </div>

                                            <section className="recommendation-breakdown">
                                                <div className="recommendation-section-heading">
                                                    <h4>
                                                        Behavioral Compatibility
                                                    </h4>

                                                    <span>
                                                        {measuredCount}/
                                                        {FACTORS.length} factors
                                                        assessed
                                                    </span>
                                                </div>

                                                <div className="recommendation-factor-grid">
                                                    {breakdown.map(
                                                        (factor) => (
                                                            <div
                                                                className="recommendation-factor"
                                                                key={
                                                                    factor.key
                                                                }
                                                            >
                                                                <div>
                                                                    <span>
                                                                        {
                                                                            factor.label
                                                                        }
                                                                    </span>

                                                                    <strong>
                                                                        {factor.compatibility ===
                                                                        null
                                                                            ? "N/A"
                                                                            : `${Math.round(
                                                                                  factor.compatibility
                                                                              )}%`}
                                                                    </strong>
                                                                </div>

                                                                <div className="recommendation-factor-track">
                                                                    <div
                                                                        style={{
                                                                            width:
                                                                                factor.compatibility ===
                                                                                null
                                                                                    ? "0%"
                                                                                    : `${factor.compatibility}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </section>

                                            <div className="recommendation-insights">
                                                <article>
                                                    <span>
                                                        Strongest Alignment
                                                    </span>

                                                    <p>
                                                        {strongestFactors.length
                                                            ? strongestFactors.join(
                                                                  " and "
                                                              )
                                                            : "Behavioral assessment data is incomplete."}
                                                    </p>
                                                </article>

                                                <article>
                                                    <span>
                                                        Needs Consideration
                                                    </span>

                                                    <p>
                                                        {attentionFactors.length
                                                            ? attentionFactors.join(
                                                                  " and "
                                                              )
                                                            : "No major behavioral concerns were detected."}
                                                    </p>
                                                </article>
                                            </div>

                                            {(!matchesPreferredType ||
                                                !matchesPreferredSize) && (
                                                <div className="recommendation-preference-note">
                                                    {!matchesPreferredType && (
                                                        <span>
                                                            Pet type differs
                                                            from your preferred
                                                            type.
                                                        </span>
                                                    )}

                                                    {!matchesPreferredSize && (
                                                        <span>
                                                            Pet size differs
                                                            from your preferred
                                                            size.
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                className="recommendation-apply-button"
                                                disabled={
                                                    hasPendingApplication ||
                                                    !available
                                                }
                                                onClick={() =>
                                                    onApply?.(pet)
                                                }
                                            >
                                                {hasPendingApplication
                                                    ? `Pending application for ${
                                                          applicationStatus?.petName ||
                                                          "another animal"
                                                      }`
                                                    : available
                                                      ? `Apply to Adopt ${
                                                            pet.name ||
                                                            "This Pet"
                                                        }`
                                                      : "Currently Not Available"}
                                            </button>
                                        </div>
                                    </article>
                                );
                            }
                        )}
                    </div>
                )}

            <section className="recommendations-method-note">
                <strong>How this score is calculated</strong>

                <p>
                    The current score compares the eight behavioral factors
                    from your quiz with each animal assessment. Pet type and
                    size preferences are also considered. This temporary
                    rule-based calculation can later be replaced by the trained
                    RescueBase matching model.
                </p>
            </section>
        </section>
    );
}