import { lazy, Suspense, useEffect, useRef, useState } from "react";

// Leaflet is heavy, so the map code only downloads once the section is near the screen
const PublicGISMap = lazy(() =>
    import("../system/PublicGISMap").catch(() => ({ default: MapCodeFailedToLoad }))
);

function MapCodeFailedToLoad({ onUnavailable }) {
    useEffect(() => onUnavailable(), [onUnavailable]);
    return null;
}

// Report types shown on the map, with the same pin icons as the map itself
const TYPE_FILTERS = [
    { key: "stray", label: "Strays", icon: "/gis/stray-marker.svg" },
    { key: "lost", label: "Lost pets", icon: "/gis/lost-pet-marker.svg" },
    { key: "found", label: "Found pets", icon: "/gis/found-pet-marker.svg" },
    { key: "shelter", label: "Shelters", icon: "/gis/shelter-pin.svg" },
];

const TIME_FILTERS = [
    { days: 30, label: "Last 30 days" },
    { days: null, label: "All time" },
];

const REPORT_ACTIONS = ["Report a lost pet", "Report a found pet", "Report a stray"];

export default function GISSection({ onSignup }) {
    const sectionRef = useRef(null);
    const [isNearScreen, setIsNearScreen] = useState(false);
    const [isMapUnavailable, setIsMapUnavailable] = useState(false);
    const [types, setTypes] = useState(TYPE_FILTERS.map((filter) => filter.key));
    const [dogs, setDogs] = useState(true);
    const [cats, setCats] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        const section = sectionRef.current;
        if (!section || !("IntersectionObserver" in window)) {
            setIsNearScreen(true);
            return undefined;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                setIsNearScreen(true);
                observer.disconnect();
            },
            { rootMargin: "400px 0px" }
        );
        observer.observe(section);
        return () => observer.disconnect();
    }, []);

    function toggleType(key) {
        setTypes((current) =>
            current.includes(key) ? current.filter((type) => type !== key) : [...current, key]
        );
    }

    return (
        <section
            className={`gis-section${isMapUnavailable ? " is-map-unavailable" : ""}`}
            id="lost-found-map"
            ref={sectionRef}
        >
            <div className="gis-heading">
                <h2>Lost a pet, found one, or spotted a stray?</h2>
                <p>See recent reports near you and add your own.</p>
            </div>

            <div className="gis-report-actions">
                {REPORT_ACTIONS.map((label) => (
                    <button key={label} type="button" className="gis-report-btn" onClick={onSignup}>
                        {label}
                    </button>
                ))}
            </div>
            <p className="gis-report-note">A free account is needed to send a report.</p>

            {isMapUnavailable ? (
                <p className="gis-unavailable">
                    The map isn't available right now. You can still report a pet using the buttons above.
                </p>
            ) : (
                <>
                    <div className="gis-filters">
                        <div className="gis-filter-group">
                            {TYPE_FILTERS.map((filter) => (
                                <button
                                    key={filter.key}
                                    type="button"
                                    className={`gis-filter ${types.includes(filter.key) ? "gis-filter-active" : ""}`}
                                    aria-pressed={types.includes(filter.key)}
                                    onClick={() => toggleType(filter.key)}
                                >
                                    <img src={filter.icon} alt="" aria-hidden="true" />
                                    {filter.label}
                                </button>
                            ))}
                        </div>

                        <div className="gis-filter-group gis-animal-filters">
                            <button
                                type="button"
                                className={`gis-filter ${dogs ? "gis-filter-active" : ""}`}
                                aria-pressed={dogs}
                                onClick={() => setDogs((value) => !value)}
                            >
                                Dogs
                            </button>
                            <button
                                type="button"
                                className={`gis-filter ${cats ? "gis-filter-active" : ""}`}
                                aria-pressed={cats}
                                onClick={() => setCats((value) => !value)}
                            >
                                Cats
                            </button>
                        </div>
                    </div>

                    <div className="gis-map-container">
                        {isNearScreen && (
                            <Suspense fallback={<div className="public-gis-message">Loading map...</div>}>
                                <PublicGISMap
                                    landingMode
                                    filters={{ types, dogs, cats, days }}
                                    onUnavailable={() => setIsMapUnavailable(true)}
                                />
                            </Suspense>
                        )}

                        {/* Time range sits on the map */}
                        <div className="gis-time-toggle" role="group" aria-label="Time range">
                            {TIME_FILTERS.map((filter) => (
                                <button
                                    key={filter.label}
                                    type="button"
                                    className={days === filter.days ? "is-active" : ""}
                                    aria-pressed={days === filter.days}
                                    onClick={() => setDays(filter.days)}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
