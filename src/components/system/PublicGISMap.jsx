
import { useEffect, useState } from "react";

import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../styles/components/PublicGIS.css";

import assets from "../../data/assets.json";

const API = import.meta.env.VITE_BACKEND_URL;
const cebuCenter = [10.3157, 123.8854];

const createMarkerIcon = (image, className) =>
    L.divIcon({
        className,
        html: `<img src="${image}" alt="" />`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -36],
    });

const markerIcon = createMarkerIcon(
    assets.icons.straymapbrown,
    "public-gis-marker"
);

const shelterIcon = createMarkerIcon(
    assets.icons.pawpin,
    "public-gis-shelter-marker"
);

function hasValidCoordinates(item) {
    if (
        item.latitude === "" ||
        item.longitude === "" ||
        item.latitude == null ||
        item.longitude == null
    ) {
        return false;
    }

    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);

    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

async function fetchJSON(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "Failed to load map data."
        );
    }

    return data;
}

export default function PublicGISMap({
    landingMode = false,
}) {
    const [locations, setLocations] = useState([]);
    const [shelters, setShelters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [shelterError, setShelterError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadPublicMap() {
            setLoading(true);
            setError("");
            setShelterError("");

            const [locationsResult, sheltersResult] =
                await Promise.allSettled([
                    fetchJSON(`${API}/api/gis/public`),
                    fetchJSON(`${API}/api/gis/shelters`),
                ]);

            if (cancelled) return;

            if (locationsResult.status === "fulfilled") {
                setLocations(
                    locationsResult.value.locations || []
                );
            } else {
                console.error(
                    "Public GIS locations error:",
                    locationsResult.reason
                );

                setError(
                    locationsResult.reason?.message ||
                    "Unable to load animal reports."
                );
            }

            if (sheltersResult.status === "fulfilled") {
                setShelters(
                    sheltersResult.value.shelters || []
                );
            } else {
                console.error(
                    "Public GIS shelters error:",
                    sheltersResult.reason
                );

                setShelterError(
                    "Shelter locations could not be loaded."
                );
            }

            setLoading(false);
        }

        loadPublicMap();

        return () => {
            cancelled = true;
        };
    }, []);

    const validLocations = locations.filter(
        hasValidCoordinates
    );

    const validShelters = shelters.filter(
        (shelter) =>
            shelter.status === "active" &&
            hasValidCoordinates(shelter)
    );

    return (
        <section
            className={`public-gis-section ${
                landingMode ? "public-gis-landing" : ""
            }`}
        >
            {!landingMode && (
                <>
                    <header className="public-gis-heading">
                        <div className="public-gis-heading-icon">
                            <img
                                src={assets.icons.pawpin}
                                alt=""
                            />
                        </div>

                        <div>
                            <span className="public-gis-eyebrow">
                                RESCUEBASE GIS
                            </span>

                            <h2>Animal Rescue Map</h2>

                            <p>
                                Explore reported lost, found, and stray
                                animals alongside active shelters in
                                the community.
                            </p>
                        </div>
                    </header>

                    <div className="public-gis-stats">
                        <article className="public-gis-stat">
                            <div className="public-gis-stat-icon report">
                                <img
                                    src={assets.icons.straymapbrown}
                                    alt=""
                                />
                            </div>

                            <div className="public-gis-stat-content">
                                <span>Animal Reports</span>

                                <strong>
                                    {loading ? "—" : validLocations.length}
                                </strong>

                                <small>Mapped report locations</small>
                            </div>
                        </article>

                        <article className="public-gis-stat">
                            <div className="public-gis-stat-icon shelter">
                                <img
                                    src={assets.icons.pawpin}
                                    alt=""
                                />
                            </div>

                            <div className="public-gis-stat-content">
                                <span>Active Shelters</span>

                                <strong>
                                    {loading ? "—" : validShelters.length}
                                </strong>

                                <small>Available shelter locations</small>
                            </div>
                        </article>
                    </div>

                    <div className="public-gis-map-toolbar">
                        <div>
                            <h3>Community Locations</h3>
                            <p>Select a marker to view its details.</p>
                        </div>

                        <div className="public-gis-legend">
                            <span>
                                <img
                                    src={assets.icons.straymapbrown}
                                    alt=""
                                />
                                Reports
                            </span>

                            <span>
                                <img
                                    src={assets.icons.pawpin}
                                    alt=""
                                />
                                Shelters
                            </span>
                        </div>
                    </div>
                </>
            )}

            {loading && (
                <div className="public-gis-message">
                    Loading map data...
                </div>
            )}

            {error && (
                <div className="public-gis-message error">
                    {error}
                </div>
            )}

            {shelterError && !loading && (
                <div className="public-gis-message warning">
                    {shelterError}
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className="public-gis-map-wrap">
                        <MapContainer
                            center={cebuCenter}
                            zoom={11}
                            scrollWheelZoom={!landingMode}
                            className="public-gis-map"
                        >
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {validLocations.map((location) => (
                                <Marker
                                    key={`report-${location._id}`}
                                    position={[
                                        Number(location.latitude),
                                        Number(location.longitude),
                                    ]}
                                    icon={markerIcon}
                                >
                                    <Popup>
                                        <strong>
                                            {location.petName ||
                                                "Animal report"}
                                        </strong>

                                        <br />
                                        Report: {location.reportType}

                                        <br />
                                        Species: {location.species || "Unknown"}

                                        <br />
                                        Location: {location.locationName ||
                                            "Not specified"}

                                        {location.description && (
                                            <>
                                                <br />
                                                {location.description}
                                            </>
                                        )}
                                    </Popup>
                                </Marker>
                            ))}

                            {validShelters.map((shelter) => (
                                <Marker
                                    key={`shelter-${shelter._id}`}
                                    position={[
                                        Number(shelter.latitude),
                                        Number(shelter.longitude),
                                    ]}
                                    icon={shelterIcon}
                                >
                                    <Popup>
                                        <strong>
                                            {shelter.name || "Animal Shelter"}
                                        </strong>

                                        {shelter.address && (
                                            <>
                                                <br />
                                                {shelter.address}
                                            </>
                                        )}

                                        {shelter.description && (
                                            <>
                                                <br />
                                                {shelter.description}
                                            </>
                                        )}

                                        {shelter.contact && (
                                            <>
                                                <br />
                                                Contact: {shelter.contact}
                                            </>
                                        )}

                                        <br />
                                        <span>Active shelter</span>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>

                    {!landingMode && (
                        <footer className="public-gis-map-footer">
                            <span>
                                Showing{" "}
                                <strong>{validLocations.length}</strong>{" "}
                                animal reports
                            </span>

                            <span>
                                <strong>{validShelters.length}</strong>{" "}
                                active shelters
                            </span>
                        </footer>
                    )}
                </>
            )}
        </section>
    );
}
