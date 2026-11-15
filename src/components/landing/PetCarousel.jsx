import { useEffect, useRef, useState } from "react";
import BrowsePetCard from "../adopter/BrowsePetCard";

const WHEEL_STEP_GAP_MS = 250;
const SCROLL_SETTLE_MS = 140;

// Works like the adopter's Recommendations carousel: the centred pet is "active",
// the arrows, dots and mouse wheel step one pet at a time, and swiping scrolls freely.
// Tapping a side card brings it to the centre; tapping the centred card opens its profile.
export default function PetCarousel({ pets, onOpenPet }) {
    const trackRef = useRef(null);
    const wheelLockRef = useRef(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const safeIndex = Math.min(activeIndex, Math.max(pets.length - 1, 0));

    // Keep the active card centred
    useEffect(() => {
        const track = trackRef.current;
        const card = track?.children[safeIndex];
        if (!track || !card) return;

        track.scrollTo({
            left: card.offsetLeft - track.clientWidth / 2 + card.clientWidth / 2,
            behavior: "smooth",
        });
    }, [safeIndex, pets.length]);

    // Mouse wheel / trackpad: one pet per notch; at the first or last pet the page scrolls as normal
    useEffect(() => {
        const track = trackRef.current;
        if (!track || pets.length < 2) return undefined;

        function handleWheel(event) {
            const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
            if (Math.abs(delta) < 4) return;

            const direction = delta > 0 ? 1 : -1;
            const atEdge = (direction < 0 && safeIndex === 0) || (direction > 0 && safeIndex === pets.length - 1);
            if (atEdge) return;

            event.preventDefault();

            const now = Date.now();
            if (now - wheelLockRef.current < WHEEL_STEP_GAP_MS) return;
            wheelLockRef.current = now;

            setActiveIndex(safeIndex + direction);
        }

        track.addEventListener("wheel", handleWheel, { passive: false });
        return () => track.removeEventListener("wheel", handleWheel);
    }, [pets.length, safeIndex]);

    // After a swipe settles, the card nearest the centre becomes active
    useEffect(() => {
        const track = trackRef.current;
        if (!track) return undefined;

        let settleTimer = 0;

        function handleScroll() {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(() => {
                const centre = track.scrollLeft + track.clientWidth / 2;
                let nearestIndex = 0;
                let nearestDistance = Infinity;

                [...track.children].forEach((card, index) => {
                    const distance = Math.abs(card.offsetLeft + card.clientWidth / 2 - centre);
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestIndex = index;
                    }
                });

                setActiveIndex(nearestIndex);
            }, SCROLL_SETTLE_MS);
        }

        track.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            clearTimeout(settleTimer);
            track.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <section className="pet-carousel" aria-label="Rescued pets">
            <button
                type="button"
                className="pet-carousel-arrow is-prev"
                onClick={() => setActiveIndex(Math.max(safeIndex - 1, 0))}
                disabled={safeIndex === 0}
                aria-label="Previous pet"
            >
                ‹
            </button>

            <div className="pet-carousel-track" ref={trackRef}>
                {pets.map((pet, index) => (
                    <BrowsePetCard
                        key={pet.id}
                        pet={pet}
                        className={index === safeIndex ? "is-centred" : ""}
                        onClick={() => (index === safeIndex ? onOpenPet(pet) : setActiveIndex(index))}
                        onView={onOpenPet}
                    />
                ))}
            </div>

            <button
                type="button"
                className="pet-carousel-arrow is-next"
                onClick={() => setActiveIndex(Math.min(safeIndex + 1, pets.length - 1))}
                disabled={safeIndex === pets.length - 1}
                aria-label="Next pet"
            >
                ›
            </button>

            <div className="pet-carousel-dots">
                {pets.length <= 12 ? (
                    pets.map((pet, index) => (
                        <button
                            key={pet.id}
                            type="button"
                            className={index === safeIndex ? "is-active" : ""}
                            onClick={() => setActiveIndex(index)}
                            aria-label={`Show ${pet.name}`}
                        />
                    ))
                ) : (
                    <span>{safeIndex + 1} / {pets.length}</span>
                )}
            </div>
        </section>
    );
}
