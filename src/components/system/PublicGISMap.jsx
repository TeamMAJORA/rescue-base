
import { useEffect, useState } from "react";

import {
    Circle,
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    Tooltip,
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

// Same pins as the admin GIS map
const REPORT_ICONS = {
    stray: createMarkerIcon("/gis/stray-marker.svg", "public-gis-marker"),
    lost: createMarkerIcon("/gis/lost-pet-marker.svg", "public-gis-marker"),
    found: createMarkerIcon("/gis/found-pet-marker.svg", "public-gis-marker"),
};

const shelterIcon = createMarkerIcon(
    "/gis/shelter-pin.svg",
    "public-gis-shelter-marker"
);

const clinicIcon = createMarkerIcon(
    "/gis/clinic-pin.svg",
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

const DAY_MS = 24 * 60 * 60 * 1000;
const HOTSPOT_RADIUS_METERS = 500;
const HOTSPOT_MIN_REPORTS = 3;

// "rescue" / "intake" reports show as strays on the public map
function reportGroupOf(location) {
    const type = String(location.reportType || "").toLowerCase();
    return type === "lost" || type === "found" ? type : "stray";
}

function distanceInMeters(a, b) {
    const toRadians = (value) => (value * Math.PI) / 180;
    const latitudeDelta = toRadians(b.latitude - a.latitude);
    const longitudeDelta = toRadians(b.longitude - a.longitude);
    const h =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(h));
}

// Groups stray reports that sit within 500 m of each other; 3+ reports = a hotspot
function findHotspots(strayReports) {
    const points = strayReports.map((report) => ({
        latitude: Number(report.latitude),
        longitude: Number(report.longitude),
        locationName: report.locationName,
    }));
    const used = new Set();
    const hotspots = [];

    points.forEach((point, index) => {
        if (used.has(index)) return;
        const nearby = points
            .map((other, otherIndex) => ({ other, otherIndex }))
            .filter(({ other, otherIndex }) => !used.has(otherIndex) && distanceInMeters(point, other) <= HOTSPOT_RADIUS_METERS);

        if (nearby.length < HOTSPOT_MIN_REPORTS) return;

        nearby.forEach(({ otherIndex }) => used.add(otherIndex));
        hotspots.push({
            latitude: nearby.reduce((sum, { other }) => sum + other.latitude, 0) / nearby.length,
            longitude: nearby.reduce((sum, { other }) => sum + other.longitude, 0) / nearby.length,
            count: nearby.length,
            areaName: point.locationName || "Hotspot",
        });
    });

    return hotspots;
}

// Which reports pass the landing filters (no filters = show everything)
function matchesFilters(location, filters, loadedAt) {
    if (!filters) return true;
    if (!filters.types.includes(reportGroupOf(location))) return false;

    const species = String(location.species || "").toLowerCase();
    const bothSpecies = filters.dogs && filters.cats;
    if (!bothSpecies) {
        if (filters.dogs && species !== "dog") return false;
        if (filters.cats && species !== "cat") return false;
        if (!filters.dogs && !filters.cats) return false;
    }

    if (filters.days) {
        const created = new Date(location.createdAt).getTime();
        if (!Number.isFinite(created) || loadedAt - created > filters.days * DAY_MS) return false;
    }

    return true;
}

async function fetchJSON(url) {
    const response = await fetch(url, { headers: { "ngrok-skip-browser-warning": "true" } });
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
    filters = null,
}) {
    const [locations, setLocations] = useState([]);
    const [loadedAt, setLoadedAt] = useState(0);
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

            setLoadedAt(Date.now());
            setLoading(false);
        }

        loadPublicMap();

        return () => {
            cancelled = true;
        };
    }, []);

    const validLocations = locations.filter(
        (location) => hasValidCoordinates(location) && matchesFilters(location, filters, loadedAt)
    );

    const validShelters = shelters.filter(
        (shelter) =>
            shelter.status === "active" &&
            hasValidCoordinates(shelter) &&
            (!filters || filters.types.includes("shelter"))
    );

    const hotspots = findHotspots(
        validLocations.filter((location) => reportGroupOf(location) === "stray")
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
                                    src="/gis/stray-marker.svg"
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
                                    src="/gis/stray-marker.svg"
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

                            {hotspots.map((hotspot, index) => (
                                <Circle
                                    key={`hotspot-${index}`}
                                    center={[hotspot.latitude, hotspot.longitude]}
                                    radius={HOTSPOT_RADIUS_METERS}
                                    pathOptions={{ color: "#d62828", weight: 2, dashArray: "6 5", fillColor: "#d62828", fillOpacity: 0.14 }}
                                >
                                    <Tooltip direction="top">
                                        {hotspot.areaName} · {hotspot.count} stray reports
                                    </Tooltip>
                                </Circle>
                            ))}

                            {validLocations.map((location) => (
                                <Marker
                                    key={`report-${location._id}`}
                                    position={[
                                        Number(location.latitude),
                                        Number(location.longitude),
                                    ]}
                                    icon={REPORT_ICONS[reportGroupOf(location)]}
                                    title={`${location.petName || "Animal report"}${location.locationName ? `, ${location.locationName}` : ""}`}
                                    alt={location.petName || "Animal report"}
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
                                    icon={shelter.category === "clinic" ? clinicIcon : shelterIcon}
                                    title={shelter.name || "Animal Shelter"}
                                    alt={shelter.name || "Animal Shelter"}
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
