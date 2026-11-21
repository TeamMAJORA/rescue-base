export function formatPetStatus(status) {
    return String(status || "not_available").replaceAll("_", " ");
}

// One status for an animal, the same on the admin pages and the public QR page
export function getAnimalStatus(animal) {
    if (animal.adoptionStatus === "adopted") return "adopted";
    if (animal.fosterStatus === "in_foster") return "fostered";
    if (animal.adoptionStatus === "pending") return "pending";
    if (animal.availabilityStatus === "available") return "available";
    return "unavailable";
}
