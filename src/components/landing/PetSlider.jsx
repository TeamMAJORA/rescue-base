import { useRef, useState } from "react";
import PetCard from "./PetCard";

export default function PetSlider({ pets }) {
    const trackRef = useRef(null);
    const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
    const [dragging, setDragging] = useState(false);

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

    // ---------- Click (left or right) and drag to slide ----------
    // Touch screens keep their normal swipe, so this only handles the mouse.
    function handlePointerDown(e) {
        if (e.pointerType !== "mouse" || (e.button !== 0 && e.button !== 2)) return;

        const track = trackRef.current;
        drag.current = {
            active: true,
            startX: e.clientX,
            startScroll: track.scrollLeft,
            moved: false,
        };
        track.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e) {
        const state = drag.current;
        if (!state.active) return;

        const distance = e.clientX - state.startX;

        if (!state.moved && Math.abs(distance) > 5) {
            state.moved = true;
            setDragging(true);
        }

        if (state.moved) {
            trackRef.current.scrollLeft = state.startScroll - distance;
        }
    }

    function handlePointerUp(e) {
        if (!drag.current.active) return;

        drag.current.active = false;
        setDragging(false);

        if (trackRef.current.hasPointerCapture?.(e.pointerId)) {
            trackRef.current.releasePointerCapture(e.pointerId);
        }
    }

    // Don't open the right-click menu after a right-click drag
    function handleContextMenu(e) {
        if (drag.current.moved) {
            e.preventDefault();
            drag.current.moved = false;
        }
    }

    // Don't treat the end of a drag as a click on a card
    function handleClickCapture(e) {
        if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
        }
    }

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
                className={`pet-track${dragging ? " dragging" : ""}`}
                ref={trackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onContextMenu={handleContextMenu}
                onClickCapture={handleClickCapture}
                onDragStart={(e) => e.preventDefault()}
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
