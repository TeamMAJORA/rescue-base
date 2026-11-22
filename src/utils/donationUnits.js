// Units offered on the donor form and the staff "Record donation" form.
// "Other" lets the person type their own unit.
export const DONATION_UNITS = [
    "Pieces",
    "Boxes",
    "Bags",
    "Sacks",
    "Cans",
    "Pouches",
    "Sachets",
    "Bottles",
    "Tubes",
    "Packs",
    "Rolls",
    "Pairs",
    "Sets",
    "Kilograms",
    "Grams",
    "Liters",
    "Milliliters",
    "Other",
];

// The unit to save: the typed one when "Other" was picked
export function resolveUnit(unit, otherUnit) {
    return unit === "Other" ? String(otherUnit || "").trim() : unit;
}
