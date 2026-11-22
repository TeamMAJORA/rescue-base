// Matchmaking display helpers shared by the adopter Recommendations page and the admin
// adoption review. Scores are NOT calculated here: both pages show the server's scores
// (services/matchmakingService.js), so the two sides always show the same numbers.

// How many top matches the adopter sees; staff see the same list
export const TOP_RECOMMENDATION_COUNT = 4;

export const FACTORS = [
    {
        key: "energy",
        label: "Energy Level",
        quizKey: "energyPreference",
        type: "preference",
    },
    {
        key: "friendliness",
        label: "Friendliness",
        quizKey: "friendlinessPreference",
        type: "preference",
    },
    {
        key: "humanSociability",
        label: "Human Sociability",
        quizKey: "humanSociabilityPreference",
        type: "preference",
    },
    {
        key: "animalSociability",
        label: "Animal Sociability",
        quizKey: "animalSociabilityPreference",
        type: "preference",
    },
    {
        key: "trainability",
        label: "Trainability",
        quizKey: "trainabilityPreference",
        type: "preference",
    },
    {
        key: "anxiety",
        label: "Anxiety Compatibility",
        quizKey: "anxietyTolerance",
        type: "tolerance",
    },
    {
        key: "aggression",
        label: "Aggression Compatibility",
        quizKey: "aggressionTolerance",
        type: "tolerance",
    },
    {
        key: "activity",
        label: "Activity Level",
        quizKey: "activityPreference",
        type: "preference",
    },
];

function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

export function getTier(score) {
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

// Scored server matches, best first (the server already sorted them; unscored ones are dropped)
export function topScoredMatches(matches = [], count = TOP_RECOMMENDATION_COUNT) {
    return matches.filter((match) => match.score != null).slice(0, count);
}

// One server match -> what the Recommendations page shows.
// floor, not round: the server caps conflicts at 59.99 and that must stay below 60.
export function buildRecommendation(match, pet) {
    const score = Math.floor(match.score);

    const breakdown = FACTORS.map((factor) => {
        const result = match.factorResults?.[factor.key] || {};
        return {
            ...factor,
            adopterValue: result.adopterValue ?? null,
            animalValue: result.animalValue ?? null,
            compatibility: result.similarity == null ? null : Math.round(result.similarity * 100),
        };
    });

    return {
        pet,
        score,
        tier: getTier(score),
        breakdown,
        measuredCount: breakdown.filter((factor) => factor.compatibility !== null).length,
    };
}

export function isPetAvailable(pet) {
    const status = normalizeText(
        pet?.status ||
            pet?.adoptionStatus ||
            pet?.availabilityStatus ||
            "available"
    );

    return status === "available";
}