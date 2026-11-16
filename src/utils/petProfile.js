import { formatAge } from "./formatAge";

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
        personality:
            animal.personality?.summary ||
            animal.behaviorNotes ||
            "Behavior information has not been added yet.",
        idealHome:
            animal.description ||
            "Contact the shelter to learn about the ideal home.",
        health:
            animal.medicalStatus ||
            animal.intakeCondition ||
            "Health information is not available.",
        story:
            animal.description ||
            `${animal.name} is currently under the care of RescueBase.`,
        petType: animal.type,
    };
}
