import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatPetStatus } from "../../utils/petStatus";
import { useSavedPets } from "../../utils/savedPets";
import PetTypeIcon from "../system/PetTypeIcon";
import Icon from "../system/Icon";
import "../../styles/components/PetProfile.css";

const CLOSE_ANIMATION_MS = 150; // matches rb-modal-out in App.css
const FOCUSABLE = 'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const UNKNOWN_VALUES = ["", "Unknown", "—"];

function PetPhoto({ pet }) {
    return pet.image ? (
        <img src={pet.image} alt={pet.name} />
    ) : (
        <span className="pdm-photo-empty"><PetTypeIcon type={pet.petType} /></span>
    );
}

// The profile itself, in reading order: who → story (the hook) → personality → ideal home → health.
function PetProfileBody({ pet, nameId, storyId }) {
    const facts = [pet.age, pet.gender, pet.size].filter((value) => value && !UNKNOWN_VALUES.includes(value));
    const breedLine = [pet.type || "Pet", pet.breed || "Unknown breed", pet.color].filter(Boolean).join(" · ");

    return (
        <>
            <header className="pdm-head">
                <span className={`adopter-status ${pet.status || "not_available"}`}>{formatPetStatus(pet.status)}</span>
                <h2 id={nameId}>{pet.name}</h2>
                <p className="pdm-breed">{breedLine}</p>
                <ul className="pdm-facts" aria-label="Key facts">
                    {facts.map((fact) => <li key={fact}>{fact}</li>)}
                    <li className="pdm-facts-place"><Icon name="pin" />{pet.location || "RescueBase Shelter"}</li>
                </ul>
            </header>

            <section className="pdm-section pdm-story">
                <h3>Rescue story</h3>
                <p id={storyId}>{pet.story}</p>
            </section>

            <section className="pdm-section">
                <h3>Personality</h3>
                {pet.personalityTags?.length > 0 && (
                    <ul className="pdm-chips">
                        {pet.personalityTags.map((tag) => <li key={tag}>{tag}</li>)}
                    </ul>
                )}
                <p className="pdm-line">{pet.personality || "Behavior information has not been added yet."}</p>
            </section>

            {pet.idealHomeTags?.length > 0 && (
                <section className="pdm-section">
                    <h3>Ideal home</h3>
                    <ul className="pdm-chips pdm-chips-home">
                        {pet.idealHomeTags.map((tag) => <li key={tag}><Icon name="home" />{tag}</li>)}
                    </ul>
                </section>
            )}

            {pet.healthItems?.length > 0 && (
                <section className="pdm-section">
                    <h3>Health</h3>
                    <ul className="pdm-chips pdm-chips-health">
                        {pet.healthItems.map((item) => (
                            <li key={item.label} className={item.ok ? "is-ok" : "is-watch"}>
                                {item.ok && <Icon name="check" />}
                                {item.label}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}

// Inline profile (Adoption Application page): photo on top, profile below, extra content after.
export default function PetDetailPanel({ className = "", pet, children }) {
    const nameId = useId();
    const storyId = useId();

    if (!pet?._id) {
        return (
            <aside className={className}>
                <div className="browse-pet-empty-details">
                    <span><PetTypeIcon /></span>
                    <h3>No animal selected</h3>
                    <p>Select an available animal from the list to view its profile.</p>
                </div>
            </aside>
        );
    }

    return (
        <aside className={`pdm-inline ${className}`.trim()} aria-labelledby={nameId}>
            <div className="pdm-inline-photo"><PetPhoto pet={pet} /></div>
            <PetProfileBody pet={pet} nameId={nameId} storyId={storyId} />
            {children}
        </aside>
    );
}

// The one main action. Never a dead, disabled button: pending → their application, unavailable → other pets.
function getPrimaryAction({ pet, hasPendingApplication, applicationStatus, applyNote, onApply, onViewApplication, onSeeSimilar }) {
    if (hasPendingApplication) {
        const pendingFor = applicationStatus?.petName;
        return {
            label: "View my application",
            onClick: onViewApplication,
            note: pendingFor ? `You have a pending application for ${pendingFor}.` : "You have a pending application.",
        };
    }

    if (pet.status !== "available") {
        return { label: "See similar pets", onClick: () => onSeeSimilar(pet), note: `${pet.name} isn't available for adoption right now.` };
    }

    return { label: `Apply to adopt ${pet.name}`, onClick: () => onApply?.(pet), note: applyNote, icon: "arrow-right" };
}

// The pet profile as a pop-up: photo pinned left (top on phones), profile scrolls, action bar stays visible.
export function PetDetailModal({
    pet,
    onClose,
    onApply,
    onViewApplication,
    onSeeSimilar,
    hasPendingApplication = false,
    applicationStatus,
    applyNote,
    showSave = false,
}) {
    const nameId = useId();
    const storyId = useId();
    const dialogRef = useRef(null);
    const [isClosing, setIsClosing] = useState(false);
    const { isSaved, toggleSaved } = useSavedPets();

    // Play the exit animation, then unmount
    const requestClose = useCallback(() => setIsClosing(true), []);

    useEffect(() => {
        if (!isClosing) return undefined;
        const timer = setTimeout(onClose, CLOSE_ANIMATION_MS);
        return () => clearTimeout(timer);
    }, [isClosing, onClose]);

    // Focus moves into the dialog and stays there; Esc closes; the page behind stops scrolling;
    // focus goes back to what opened it.
    useEffect(() => {
        const dialog = dialogRef.current;
        const openedFrom = document.activeElement;
        const previousOverflow = document.body.style.overflow;

        function handleKey(event) {
            if (event.key === "Escape") {
                requestClose();
                return;
            }
            if (event.key !== "Tab") return;

            const focusable = [...dialog.querySelectorAll(FOCUSABLE)];
            if (!focusable.length) {
                event.preventDefault();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKey);
        dialog.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKey);
            openedFrom?.focus?.();
        };
    }, [requestClose]);

    const action = getPrimaryAction({
        pet,
        hasPendingApplication,
        applicationStatus,
        applyNote,
        onApply,
        onViewApplication: onViewApplication || requestClose,
        onSeeSimilar: onSeeSimilar || requestClose,
    });
    const saved = isSaved(pet._id);

    return (
        <div className={`pdm-backdrop${isClosing ? " is-closing" : ""}`} onClick={requestClose}>
            <div
                ref={dialogRef}
                className={`pdm-dialog${isClosing ? " is-closing" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={nameId}
                aria-describedby={storyId}
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
            >
                <button type="button" className="pdm-close" onClick={requestClose} aria-label="Close">
                    <Icon name="close" />
                </button>

                <div className="pdm-photo"><PetPhoto pet={pet} /></div>

                <div className="pdm-content">
                    <div className="pdm-scroll">
                        <PetProfileBody pet={pet} nameId={nameId} storyId={storyId} />
                    </div>

                    <footer className={`pdm-footer${showSave ? " has-save" : ""}`}>
                        {showSave && (
                            <button
                                type="button"
                                className={`pdm-save${saved ? " is-saved" : ""}`}
                                aria-pressed={saved}
                                aria-label={saved ? `Remove ${pet.name} from saved` : `Save ${pet.name}`}
                                onClick={() => toggleSaved(pet._id)}
                            >
                                <Icon name="heart" filled={saved} />
                            </button>
                        )}
                        <button type="button" className="pdm-apply" onClick={action.onClick}>
                            {action.label}
                            {action.icon && <Icon name={action.icon} />}
                        </button>
                        {action.note && <p className="pdm-footer-note">{action.note}</p>}
                    </footer>
                </div>
            </div>
        </div>
    );
}