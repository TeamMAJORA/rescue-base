import { useRef } from "react";
import PetCard from "./PetCard";

export default function PetSlider({ pets }) {
    const trackRef = useRef(null);

    const scrollByCard = (direction) => {
        const track = trackRef.current;

        if (!track) {
            return;
        }

        const firstSlide =
            track.querySelector(".pet-slide");

        const slideWidth = firstSlide
            ? firstSlide.getBoundingClientRect().width
            : 261;

        track.scrollBy({
            left: direction * (slideWidth + 32),
            behavior: "smooth",
        });
    };

    return (
        <div className="pet-slider">
            <button
                className="pet-slider-arrow pet-slider-prev"
                type="button"
                onClick={() => scrollByCard(-1)}
                aria-label="Previous pets"
            >
                ‹
            </button>

            <div
                className="pet-track"
                ref={trackRef}
            >
                {pets.map((pet) => (
                    <div
                        className="pet-slide"
                        key={pet.id || pet.name}
                    >
                        <PetCard pet={pet} />
                    </div>
                ))}
            </div>

            <button
                className="pet-slider-arrow pet-slider-next"
                type="button"
                onClick={() => scrollByCard(1)}
                aria-label="Next pets"
            >
                ›
            </button>
        </div>
    );
}