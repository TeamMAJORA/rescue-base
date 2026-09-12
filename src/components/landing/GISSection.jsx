import PublicGISMap from "../system/PublicGISMap";

export default function GISSection() {
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
                    <button
                        className="gis-filter gis-filter-active"
                        type="button"
                    >
                        <span>◉</span>
                        Shelters
                    </button>

                    <button
                        className="gis-filter"
                        type="button"
                    >
                        <span>◷</span>
                        Last 30 Days
                    </button>
                </div>

                <div className="gis-filter-group gis-animal-filters">
                    <button
                        className="gis-filter"
                        type="button"
                    >
                        Dog
                    </button>

                    <button
                        className="gis-filter"
                        type="button"
                    >
                        Cats
                    </button>
                </div>
            </div>

            <div className="gis-map-container">
                <PublicGISMap landingMode />
            </div>
        </section>
    );
}