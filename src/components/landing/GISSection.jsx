import { useState } from "react";
import PublicGISMap from "../system/PublicGISMap";

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

export default function GISSection() {
    const [types, setTypes] = useState(TYPE_FILTERS.map((filter) => filter.key));
    const [dogs, setDogs] = useState(true);
    const [cats, setCats] = useState(true);
    const [days, setDays] = useState(30);

    function toggleType(key) {
        setTypes((current) =>
            current.includes(key) ? current.filter((type) => type !== key) : [...current, key]
        );
    }

    return (
        <section className="gis-section">
            <div className="gis-heading">
                <h2>
                    See where strays are being spotted
                </h2>

                <p>
                    Real-time volunteer updates help rescue teams act fast and keep shelters prepared.
                </p>
            </div>

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
                <PublicGISMap landingMode filters={{ types, dogs, cats, days }} />

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
        </section>
    );
}
