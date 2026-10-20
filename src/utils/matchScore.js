// Shared matchmaking score (used by the adopter Recommendations page and the admin Quiz Results page)
// Keep all scoring here so both pages always show the same numbers.

export const FACTORS = [
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
        petKeys: ["anxietyLevel", "anxiety"],
        type: "tolerance",
    },
    {
        key: "aggression",
        label: "Aggression Compatibility",
        quizKey: "aggressionTolerance",
        petKeys: ["aggressionLevel", "aggression"],
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

export function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
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

export function calculateRecommendation(pet, quiz) {
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

export function isPetAvailable(pet) {
    const status = normalizeText(
        pet?.status ||
            pet?.adoptionStatus ||
            pet?.availabilityStatus ||
            "available"
    );

    return status === "available";
}