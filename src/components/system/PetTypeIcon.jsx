// Pet icon that replaces the 🐶 🐱 🐾 emoji. 1em wide, so it scales like the emoji did.
// Dog and cat use /icons/dog-brown.svg and /icons/cat-brown.svg; until those files exist
// (or for any other type) it shows the brown paw.
const PET_TYPE_ICONS = {
    dog: "/icons/dog-brown.svg",
    cat: "/icons/cat-brown.svg",
};
const PAW_ICON = "/icons/brown paw.svg";

export default function PetTypeIcon({ type, className = "" }) {
    const petTypeKey = String(type || "").trim().toLowerCase();

    return (
        <img
            className={`pet-type-icon ${className}`.trim()}
            src={PET_TYPE_ICONS[petTypeKey] || PAW_ICON}
            alt=""
            aria-hidden="true"
            onError={(event) => {
                if (!event.currentTarget.src.includes("brown%20paw")) event.currentTarget.src = PAW_ICON;
            }}
        />
    );
}
