import { useEffect, useMemo, useRef, useState } from "react";
import {
    FACTORS,
    calculateRecommendation,
    isPetAvailable,
} from "../../../utils/matchScore";

function formatStatus(value) {
    return String(value || "available").replaceAll("_", " ");
}

function readSavedQuiz() {
    try {
        return JSON.parse(
            localStorage.getItem("rescuebase_matchmaking_quiz") || "null"
        );
    } catch {
        return null;
    }
}

// Colour of a factor bar: green 80+, orange 50-79, red below 50, grey when not assessed
function factorTone(value) {
    if (value === null) return "is-none";
    if (value >= 80) return "is-high";
    if (value >= 50) return "is-mid";
    return "is-low";
}

export default function Recommendations({
    pets = [],
    loading,
    error,
    onRefresh,
    onApply,
    hasPendingApplication,
    applicationStatus,
    onTakeQuiz,
    onBrowsePets,
    onViewPet,
}) {
    const quiz = useMemo(() => readSavedQuiz(), []);

    const recommendations = useMemo(() => {
        if (!quiz) {
            return [];
        }

        return pets
            .map((pet) => calculateRecommendation(pet, quiz))
            .sort((first, second) => second.score - first.score);
    }, [pets, quiz]);

    
    // Carousel: which recommendation is shown in full below
    const [activeIndex, setActiveIndex] = useState(0);
    const carouselRef = useRef(null);
    const safeIndex = Math.min(activeIndex, Math.max(recommendations.length - 1, 0));

    // Keep the selected card centred in the carousel
    useEffect(() => {
        const track = carouselRef.current;
        const card = track?.children[safeIndex];

        if (!track || !card) return;

        track.scrollTo({
            left: card.offsetLeft - track.clientWidth / 2 + card.clientWidth / 2,
            behavior: "smooth",
        });
    }, [safeIndex, recommendations.length]);

    
    // Mouse wheel over the carousel steps through the animals (one per wheel notch)
    const wheelLockRef = useRef(0);

    useEffect(() => {
        const track = carouselRef.current;
        const total = recommendations.length;

        if (!track || total < 2) return;

        function handleWheel(event) {
            const delta =
                Math.abs(event.deltaY) >= Math.abs(event.deltaX)
                    ? event.deltaY
                    : event.deltaX;

            if (Math.abs(delta) < 4) return;

            const direction = delta > 0 ? 1 : -1;
            const atEdge =
                (direction < 0 && safeIndex === 0) ||
                (direction > 0 && safeIndex === total - 1);

            // On the first/last animal, let the page scroll normally
            if (atEdge) return;

            event.preventDefault();

            // Ignore the burst of events a single notch or swipe sends
            const now = Date.now();
            if (now - wheelLockRef.current < 250) return;
            wheelLockRef.current = now;

            setActiveIndex(Math.min(Math.max(safeIndex + direction, 0), total - 1));
        }

        track.addEventListener("wheel", handleWheel, { passive: false });
        return () => track.removeEventListener("wheel", handleWheel);
    }, [loading, error, recommendations.length, safeIndex]);

    const perfectMatches = recommendations.filter(
        (recommendation) => recommendation.score >= 80
    ).length;

    // Podium: 2nd · 1st · 3rd (only the places that exist)
    // Only "Perfect Paw Match" and "Paws for Thought" (60%+) count as real matches
    const realMatches = recommendations.filter((item) => item.tier.key !== "no-match");
    const hasResults = !loading && !error && recommendations.length > 0;
    const showPodium = hasResults && realMatches.length > 0;
    const showNoMatch = hasResults && realMatches.length === 0;

    const podium = [
        { place: 2, item: realMatches[1] },
        { place: 1, item: realMatches[0] },
        { place: 3, item: realMatches[2] },
    ].filter((slot) => slot.item);

    function scrollToRecommendation(pet) {
        const index = recommendations.findIndex((item) => item.pet === pet);

        if (index >= 0) setActiveIndex(index);

        document
            .getElementById("rec-browser")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (!quiz) {
        return (
            <section className="recommendations-module">
                <div className="recommendations-empty-state">
                    <span>🐾</span>

                    <h2>Complete Your Matchmaking Quiz</h2>

                    <p>
                        RescueBase needs your lifestyle and behavioral
                        preferences before it can calculate pet compatibility.
                    </p>

                    <button
                        type="button"
                        onClick={() => onTakeQuiz?.()}
                    >
                        Take Matchmaking Quiz
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="recommendations-module">
                {showPodium ? (
                    <header className="rec-podium">
                        <img className="rec-podium-paw is-left" src="/icons/heroPaw.svg" alt="" aria-hidden="true" />
                        <img className="rec-podium-paw is-right" src="/icons/heroPaw.svg" alt="" aria-hidden="true" />
                        <span className="rec-podium-bubble is-one" aria-hidden="true" />
                        <span className="rec-podium-bubble is-two" aria-hidden="true" />
                        <span className="rec-podium-bubble is-three" aria-hidden="true" />

                        <div className="rec-podium-actions">
                            <button type="button" onClick={() => onTakeQuiz?.()}>
                                Retake Quiz
                            </button>
                            <button type="button" onClick={() => onRefresh?.()} disabled={loading}>
                                {loading ? "Refreshing..." : "Refresh"}
                            </button>
                        </div>

                        <div className="rec-podium-title">
                            <span>Your top matches</span>
                            <h2>Best paw-sibilities for you</h2>
                        </div>

                        <div className="rec-podium-stage">
                            {podium.map(({ place, item }) => (
                                <button
                                    key={place}
                                    type="button"
                                    className={`rec-podium-spot is-place-${place}`}
                                    onClick={() => scrollToRecommendation(item.pet)}
                                    title={`See ${item.pet.name || "this pet"}'s details`}
                                >
                                    <span className="rec-podium-card">
                                        {place === 1 && (
                                            <span className="rec-podium-crown" aria-hidden="true">
                                                <svg viewBox="0 0 24 24">
                                                    <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z" />
                                                </svg>
                                            </span>
                                        )}

                                        <span className="rec-podium-photo">
                                            {item.pet.image ? (
                                                <img src={item.pet.image} alt={item.pet.name} />
                                            ) : (
                                                <img className="is-placeholder" src="/icons/brown paw.svg" alt="" />
                                            )}
                                        </span>

                                        <b>{item.pet.name || "Unnamed"}</b>
                                        <small>
                                            {item.pet.type || item.pet.species || "Pet"} · {item.pet.breed || "Unknown breed"}
                                        </small>
                                        <strong className={`rec-podium-score ${item.tier.key}`}>
                                            {item.score}%
                                        </strong>
                                    </span>

                                    {place === 1 && (
                                        <span className={`rec-podium-label ${item.tier.key}`}>
                                            {item.tier.label}
                                        </span>
                                    )}

                                    <span className="rec-podium-base">{place}</span>
                                </button>
                            ))}
                        </div>
                </header>
            ) : showNoMatch ? (
                <>
                    <header className="rec-podium is-empty">
                        <span className="rec-podium-bubble is-one" aria-hidden="true" />
                        <span className="rec-podium-bubble is-two" aria-hidden="true" />
                        <span className="rec-podium-bubble is-three" aria-hidden="true" />

                        <div className="rec-podium-title">
                            <span>Your top matches</span>
                            <h2>No paw-sibilities yet</h2>
                        </div>

                        <div className="rec-podium-stage" aria-hidden="true">
                            {[2, 1, 3].map((place) => (
                                <div key={place} className={`rec-podium-spot is-place-${place}`}>
                                    <span className="rec-podium-ghost">
                                        <span className="rec-podium-ghost-photo">?</span>
                                        <span className="rec-podium-ghost-line" />
                                        <span className="rec-podium-ghost-line is-short" />
                                    </span>
                                    <span className="rec-podium-base">{place}</span>
                                </div>
                            ))}
                        </div>
                    </header>

                    <section className="rec-nomatch-card">
                        <h2>We could not find a match for you yet</h2>
                        <p>
                            None of the available animals fit your quiz answers right now.
                            New animals arrive often, so check back soon or try a different
                            set of answers.
                        </p>

                        <div className="rec-nomatch-actions">
                            <button type="button" className="is-primary" onClick={() => onBrowsePets?.()}>
                                Browse all available pets
                            </button>
                            <button type="button" onClick={() => onTakeQuiz?.()}>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M4 11a8 8 0 1 1 2.3 5.7" />
                                    <path d="M4 4v7h7" />
                                </svg>
                                Retake Quiz
                            </button>
                        </div>

                        <div className="rec-nomatch-tips">
                            <article>
                                <b>Animals change daily</b>
                                <p>New rescues are added by staff, so check this page again later for new matches.</p>
                            </article>
                            <article>
                                <b>Broaden your answers</b>
                                <p>Choosing &quot;Any&quot; for animal type or size lets more animals match.</p>
                            </article>
                            <article>
                                <b>Browse without the quiz</b>
                                <p>You can still see every available pet and apply for one directly.</p>
                            </article>
                        </div>
                    </section>
                </>
            ) : (
                <header className="recommendations-header">
                        <div>
                            <span>Behavioral Matching Results</span>

                            <h2>Your Recommended Pets</h2>

                            <p>
                                These compatibility scores compare your matchmaking
                                preferences with each animal’s behavioral assessment.
                            </p>
                        </div>

                        <div className="recommendations-header-actions">
                            <button
                                type="button"
                                className="recommendations-retake-button"
                                onClick={() => onTakeQuiz?.()}
                            >
                                Retake Quiz
                            </button>

                            <button
                                type="button"
                                className="recommendations-refresh-button"
                                onClick={() => onRefresh?.()}
                                disabled={loading}
                            >
                                {loading ? "Refreshing..." : "Refresh Results"}
                            </button>
                        </div>
                    </header>
                 )}

            {hasPendingApplication && (
                <section className="recommendations-pending-banner">
                    <div>
                        <span>Pending Adoption Application</span>

                        <h3>
                            Your application for{" "}
                            {applicationStatus?.petName || "an animal"} is
                            currently under review
                        </h3>

                        <p>
                            You may view your recommendations, but you cannot
                            submit another application until the current review
                            is completed.
                        </p>
                    </div>

                    {applicationStatus?.petImage && (
                        <img
                            src={applicationStatus.petImage}
                            alt={
                                applicationStatus.petName ||
                                "Applied animal"
                            }
                        />
                    )}
                </section>
            )}

            {loading && (
                <div className="recommendations-message-state">
                    <span>🐾</span>
                    <h3>Calculating your matches...</h3>
                    <p>Please wait while RescueBase evaluates the animals.</p>
                </div>
            )}

            {!loading && error && (
                <div className="recommendations-message-state error">
                    <span>!</span>
                    <h3>Recommendations could not be loaded</h3>
                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={() => onRefresh?.()}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {!loading &&
                !error &&
                recommendations.length === 0 && (
                    <div className="recommendations-message-state">
                        <span>🐾</span>
                        <h3>No animals are available</h3>
                        <p>
                            Refresh the page later when new animal profiles are
                            available.
                        </p>
                    </div>
                )}

            {showNoMatch && (
                <div className="rec-low-heading">
                    <h3>Animals below 60%</h3>
                    <p>
                        These animals did not fit your answers well, but you can still
                        read why and apply if one feels right for you.
                    </p>
                </div>
            )}

            {!loading && !error && recommendations.length > 0 && (
                <section className="rec-carousel" id="rec-browser">
                    <button
                        type="button"
                        className="rec-carousel-arrow is-prev"
                        onClick={() => setActiveIndex(Math.max(safeIndex - 1, 0))}
                        disabled={safeIndex === 0}
                        aria-label="Previous animal"
                    >
                        ‹
                    </button>

                    <div className="rec-carousel-track" ref={carouselRef}>
                        {recommendations.map((item, index) => (
                            <button
                                key={item.pet._id || item.pet.id || index}
                                type="button"
                                className={`rec-carousel-card ${item.tier.key} ${index === safeIndex ? "is-active" : ""}`}
                                onClick={() => setActiveIndex(index)}
                                aria-pressed={index === safeIndex}
                            >
                                <span className="rec-carousel-photo">
                                    {item.pet.image ? (
                                        <img src={item.pet.image} alt={item.pet.name} />
                                    ) : (
                                        <img className="is-placeholder" src="/icons/brown paw.svg" alt="" />
                                    )}

                                    <span className="rec-carousel-rank">
                                        {item.tier.key === "no-match" ? "–" : `#${index + 1}`}
                                    </span>
                                    <span className={`rec-carousel-score ${item.tier.key}`}>{item.score}%</span>
                                </span>

                                <b>{item.pet.name || "Unnamed"}</b>
                                <small>
                                    {item.pet.type || item.pet.species || "Pet"} · {item.pet.breed || "Unknown breed"}
                                </small>
                                {index === safeIndex && (
                                    <em className={item.tier.key}>{item.tier.label}</em>
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="rec-carousel-arrow is-next"
                        onClick={() => setActiveIndex(Math.min(safeIndex + 1, recommendations.length - 1))}
                        disabled={safeIndex === recommendations.length - 1}
                        aria-label="Next animal"
                    >
                        ›
                    </button>

                    <div className="rec-carousel-dots">
                        {recommendations.length <= 12 ? (
                            recommendations.map((item, index) => (
                                <button
                                    key={item.pet._id || item.pet.id || index}
                                    type="button"
                                    className={index === safeIndex ? "is-active" : ""}
                                    onClick={() => setActiveIndex(index)}
                                    aria-label={`Show ${item.pet.name || `animal ${index + 1}`}`}
                                />
                            ))
                        ) : (
                            <span>{safeIndex + 1} / {recommendations.length}</span>
                        )}
                    </div>
                </section>
            )}

            {!loading &&
                !error &&
                recommendations.length > 0 && (
                    <div className="recommendations-list">
                        {recommendations.slice(safeIndex, safeIndex + 1).map(
                            (recommendation) => {
                                const index = safeIndex;
                                const {
                                    pet,
                                    score,
                                    tier,
                                    breakdown,
                                    measuredCount,
                                    matchesPreferredType,
                                    matchesPreferredSize,
                                } = recommendation;

                                const available =
                                    isPetAvailable(pet);

                                                                return (
                                    <article
                                        className={`rcard ${tier.key}`}
                                        key={pet._id || pet.id || index}
                                        id={`rec-card-${pet._id || pet.id}`}
                                    >
                                        <div className="rcard-photo">
                                            {pet.image ? (
                                                <img src={pet.image} alt={pet.name} />
                                            ) : (
                                                <img className="is-placeholder" src="/icons/brown paw.svg" alt="" />
                                            )}

                                            {tier.key !== "no-match" && (
                                                <span className="rcard-rank">#{index + 1}</span>
                                            )}
                                        </div>

                                        <div className="rcard-body">
                                            <div className="rcard-top">
                                                <div className="rcard-title">
                                                    <span className={`rcard-tier ${tier.key}`}>{tier.label}</span>
                                                    <h3>{pet.name || "Unnamed Animal"}</h3>
                                                    <p>
                                                        {pet.type || pet.species || "Pet"} · {pet.breed || "Unknown breed"}
                                                    </p>
                                                </div>

                                                <div
                                                    className={`rcard-ring ${tier.key}`}
                                                    style={{ "--score": score }}
                                                    aria-label={`${score}% compatibility`}
                                                >
                                                    <span>{score}%</span>
                                                </div>
                                            </div>

                                            <div className="rcard-chips">
                                                <span>{pet.age || "Unknown age"}</span>
                                                <span>{pet.gender || "Unknown gender"}</span>
                                                <span>{pet.size || "Unknown size"}</span>
                                                <span>{formatStatus(pet.status || pet.adoptionStatus)}</span>
                                            </div>

                                            <p className={`rcard-note ${tier.key}`}>{tier.description}</p>

                                            {(!matchesPreferredType || !matchesPreferredSize) && (
                                                <p className="rcard-pref">
                                                    {!matchesPreferredType && "Pet type differs from your preference. "}
                                                    {!matchesPreferredSize && "Pet size differs from your preference."}
                                                </p>
                                            )}

                                            <div className="rcard-section-head">
                                                <h4>Behavioral Compatibility</h4>
                                                <span>{measuredCount}/{FACTORS.length} factors assessed</span>
                                            </div>

                                            <div className="rcard-factors">
                                                {breakdown.map((factor) => {
                                                    const value =
                                                        factor.compatibility === null
                                                            ? null
                                                            : Math.round(factor.compatibility);

                                                    return (
                                                        <div className={`rcard-factor ${factorTone(value)}`} key={factor.key}>
                                                            <div>
                                                                <span>{factor.label}</span>
                                                                <strong>{value === null ? "N/A" : `${value}%`}</strong>
                                                            </div>
                                                            <span className="rcard-track">
                                                                <span style={{ width: `${value ?? 0}%` }} />
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="rcard-actions">
                                                <button
                                                    type="button"
                                                    className="is-primary"
                                                    onClick={() => onViewPet?.(pet)}
                                                >
                                                    View pet profile
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={hasPendingApplication || !available}
                                                    onClick={() => onApply?.(pet)}
                                                >
                                                    {hasPendingApplication
                                                        ? `Pending application for ${applicationStatus?.petName || "another animal"}`
                                                        : available
                                                            ? `Apply to adopt ${pet.name || "this pet"}`
                                                            : "Currently not available"}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            }
                        )}
                    </div>
                )}
        </section>
    );
}