import { formatAge } from "./formatAge";

// Behaviour scores are staff ratings from 1 to 5 (Behavior Assessment). 4+ is high, 2 or less is low.
const HIGH = 4;
const LOW = 2;

function averageScore(...scores) {
    const rated = scores.map(Number).filter((score) => score >= 1 && score <= 5);
    if (!rated.length) return null;
    return rated.reduce((sum, score) => sum + score, 0) / rated.length;
}

// "Ideal home" chips, built only from the staff behaviour scores. Mid scores add nothing.
export function getIdealHomeTags(animal) {
    const tags = [];
    const energy = averageScore(animal.energyLevel, animal.activityLevel);
    const people = averageScore(animal.humanSociability, animal.friendliness);
    const otherPets = averageScore(animal.animalSociability);
    const trainability = averageScore(animal.trainability);
    const anxiety = averageScore(animal.anxietyLevel);

    if (energy >= HIGH) tags.push("Active home with daily play");
    else if (energy !== null && energy <= LOW) tags.push("Calm, quieter home");

    if (people >= HIGH) tags.push("Loves people and attention");
    else if (people !== null && people <= LOW) tags.push("Needs a patient adopter");

    if (otherPets >= HIGH) tags.push("Social with other animals");
    else if (otherPets !== null && otherPets <= LOW) tags.push("Best as the only pet");

    if (trainability >= HIGH) tags.push("Quick learner");
    if (anxiety >= HIGH) tags.push("Gentle routine, quiet space");

    return tags;
}

// Health as short items ("Neutered", "Anti-rabies and 4-in-1 complete" …). `ok: false` flags things to watch.
const NEEDS_CARE = /sick|injur|observation|positive|treatment|recover|wound|infect/i;

// "Spayed" for females, "Neutered" for males; nothing when staff don't know yet.
const SPAY_NEUTER_WORDS = { Female: "Spayed", Male: "Neutered" };

function getSpayNeuterItem(animal) {
    const word = SPAY_NEUTER_WORDS[animal.gender] || "Spayed/Neutered";
    if (animal.spayNeuterStatus === "Yes") return { label: word, ok: true };
    if (animal.spayNeuterStatus === "No") return { label: `Not yet ${word.toLowerCase()}`, ok: false };
    return null;
}

export function getHealthItems(animal) {
    const text = String(animal.medicalStatus || "").trim();
    const labels = text
        ? text.split(/[.;]\s*/).map((item) => item.trim()).filter(Boolean)
        : [animal.intakeCondition].filter((condition) => condition && condition !== "Unknown");

    const items = labels.map((label) => ({ label, ok: !NEEDS_CARE.test(label) }));
    const spayNeuterItem = getSpayNeuterItem(animal);
    return spayNeuterItem ? [spayNeuterItem, ...items] : items;
}

// Shapes an animal from the API into what the pet cards and the pet profile pop-up show.
// Used by the adopter dashboard and the public landing page.
export function toPetProfile(animal) {
    const isAvailable =
        animal.availabilityStatus === "available" &&
        animal.adoptionStatus === "available";

    return {
        ...animal,
        id: animal._id,
        status: isAvailable ? "available" : "not_available",
        age: formatAge(animal.age),
        personalityTags: animal.personality?.tags || [],
        personality: animal.personality?.summary || animal.behaviorNotes || "",
        story:
            animal.description ||
            `${animal.name} is currently under the care of RescueBase.`,
        idealHomeTags: getIdealHomeTags(animal),
        healthItems: getHealthItems(animal),
        petType: animal.type,
    };
}
