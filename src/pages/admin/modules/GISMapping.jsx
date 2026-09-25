import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
const API = import.meta.env.VITE_BACKEND_URL;
const cebuCenter = [10.3157, 123.8854];
import assets from "../../../data/assets.json"

const markerIcon = L.divIcon({
    className: "admin-gis-marker",
    html: `<img
            src="${assets.icons.straymapbrown}"
            width="40"
            height="40"
            alt="Shelter location"
        />`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
});

const shelterIcon = L.divIcon({
    className: "admin-gis-marker",
    html: `<img
            src="${assets.icons.pawpin}"
            width="40"
            height="40"
            alt="Shelter location"
        />`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
});

const emptyLocationForm = {
    petName: "",
    reportType: "lost",
    species: "dog",
    locationName: "",
    latitude: "",
    longitude: "",
    status: "open",
    description: "",
};

export default function GISMapping() {
    const [locations, setLocations] = useState([]);
    const [locationForm, setLocationForm] = useState(emptyLocationForm);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [userRole, setUserRole] = useState("");
    const [hotspots, setHotspots] = useState([]);
    const [hotspotLoading, setHotspotLoading] = useState(true);
    const [hotspotError, setHotspotError] = useState("");
    const [mapMode, setMapMode] = useState("pins");
    const [shelters, setShelters] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [nearestShelters, setNearestShelters] = useState([]);
    const [selectedShelter, setSelectedShelter] = useState(null);
    const [shelterLoading, setShelterLoading] = useState(true);
    const [shelterError, setShelterError] = useState("");
    const [manualLatitude, setManualLatitude] = useState("");
    const [manualLongitude, setManualLongitude] = useState("");
    const token = localStorage.getItem("token");
    const openCases = useMemo(() => {
        return locations.filter(
            (location) =>
                location.status === "open"
        ).length;
    }, [locations]);

    const lostCases = useMemo(() => {
        return locations.filter(
            (location) =>
                location.reportType === "lost"
        ).length;
    }, [locations]);

    async function loadLocations(role) {
        try {
            setLoading(true);
            setError("");
            const isVolunteer =
                role === "volunteer";
            const endpoint = isVolunteer
                ? `${API}/api/gis/public`
                : `${API}/api/gis`;
            const headers = isVolunteer
                ? {}
                : {
                    Authorization:
                        `Bearer ${localStorage.getItem("token")}`,
                };
            const response = await fetch(
                endpoint,
                {
                    method: "GET",
                    headers,
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to load GIS locations."
                );
            }

            setLocations(
                data.locations || []
            );

        } catch (error) {
            console.error(
                "Load GIS locations error:",
                error
            );

            setError(
                error.message ||
                "Failed to load GIS locations."
            );
        } finally {
            setLoading(false);
        }
    }

    async function loadHotspots() {
        const token =
            localStorage.getItem("token");
        if (!token) {
            setHotspotError(
                "Auth token is missing."
            );
            setHotspotLoading(false);
            return;
        }

        try {
            setHotspotLoading(true);
            setHotspotError("");
            const response = await fetch(
                `${API}/api/gis/hotspots`,
                {
                    method: "GET",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to load analysis"
                );
            }
            setHotspots(
                data.hotspots || []
            );
        } catch (error) {
            console.error(
                "Hotspots analysis error:",
                error
            );
            setHotspotError(
                error.message ||
                "Failed to load hotspot analysis."
            );
        } finally {
            setHotspotLoading(false);
        }
    }

    async function loadShelters() {
        try {
            setShelterLoading(true);
            setShelterError("");
            const response = await fetch(
                `${API}/api/gis/shelters`
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to load shelters."
                );
            }
            setShelters(
                Array.isArray(data.shelters)
                    ? data.shelters
                    : []
            );

        } catch (error) {
            console.error(
                "Load shelters error:",
                error
            );
            setShelterError(
                error.message ||
                "Failed to load shelters."
            );
        } finally {
            setShelterLoading(false);
        }
    }

    useEffect(() => {
        const storedUser =
            localStorage.getItem("rescuebase_user");
        if (!storedUser) {
            setUserRole("");
            return;
        }

        try {
            const user = JSON.parse(storedUser);
            const role = String(
                user.role || ""
            )
                .trim()
                .toLowerCase();
            setUserRole(role);
        } catch (error) {
            console.error(
                "Failed to read user information:",
                error
            );
            setUserRole("");
        }
    }, []);

    useEffect(() => {
        if (!userRole) {
            return;
        }
        const loadGISData = async () => {
            await loadLocations(userRole);
            if (
                userRole === "admin" ||
                userRole === "staff"
            ) {
                await loadHotspots();
            }
        };
        loadGISData();
    }, [userRole]);

    useEffect(() => {
        loadShelters();
    }, []);

    function handleFormChange(
        field,
        value
    ) {
        setLocationForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    async function handleAddLocation(e) {
        e.preventDefault();
        setError("");
        setSuccess("");
        const token =
            localStorage.getItem("token");
        if (!token) {
            setError(
                "Authentication token is missing."
            );
            return;
        }
        const latitude = Number(
            locationForm.latitude
        );
        const longitude = Number(
            locationForm.longitude
        );
        if (
            Number.isNaN(latitude) ||
            Number.isNaN(longitude)
        ) {
            setError(
                "Latitude and longitude must be valid numbers."
            );
            return;
        }
        try {
            setSubmitting(true);
            const endpoint = userRole === "volunteer" ? `${API}/api/gis/stray-sightings` : `${API}/api/gis`;
            const body = userRole === "volunteer"
                ? {
                    petName: locationForm.petName.trim() || "Unknown Stray",
                    species: locationForm.species,
                    locationName: locationForm.locationName.trim(),
                    latitude,
                    longitude,
                    description: locationForm.description.trim(),
                }
                : {
                    petName: locationForm.petName.trim() || "Unknown Stray",
                    reportType: locationForm.reportType,
                    species: locationForm.species,
                    locationName: locationForm.locationName.trim(),
                    latitude,
                    longitude,
                    status: locationForm.status,
                    description: locationForm.description.trim(),
                }
            const response = await fetch(
                endpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                }
            );
            const data =
                await response.json();
            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to create GIS location."
                );
            }
            setLocationForm({
                ...emptyLocationForm,
            });
            setSuccess(
                "GIS location added successfully."
            );
            await loadLocations(userRole);
            if (
                userRole === "admin" ||
                userRole === "staff"
            ) {
                await loadHotspots();
            }
        } catch (error) {
            console.error(
                "Add GIS location error:",
                error
            );
            setError(
                error.message ||
                "Failed to add GIS location."
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleResolveLocation(
        id
    ) {
        setError("");
        setSuccess("");
        const token =
            localStorage.getItem("token");
        if (!token) {
            setError(
                "Authentication token is missing."
            );
            return;
        }
        try {
            const response = await fetch(
                `${API}/api/gis/${id}/resolve`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );
            const data =
                await response.json();
            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to resolve GIS location."
                );
            }
            setSuccess(
                "GIS location resolved successfully."
            );
            await loadLocations(userRole);
            if (
                userRole === "admin" ||
                userRole === "staff"
            ) {
                await loadHotspots();
            }
        } catch (error) {
            console.error(
                "Resolve GIS location error:",
                error
            );
            setError(
                error.message ||
                "Failed to resolve GIS location."
            );
        }
    }
    function haversineDistance(
        lat1,
        lon1,
        lat2,
        lon2
    ) {
        const R = 6371;
        const toRadians = (value) =>
            (value * Math.PI) / 180;
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;
        const c =
            2 *
            Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            );
        return R * c;
    }
    function findNearestShelters(
        latitude,
        longitude
    ) {
        const sorted = shelters
            .map((shelter) => ({
                ...shelter,
                distance: haversineDistance(
                    latitude,
                    longitude,
                    shelter.latitude,
                    shelter.longitude
                ),
            }))
            .sort(
                (a, b) =>
                    a.distance - b.distance
            );
        setUserLocation({
            latitude,
            longitude,
        });
        setNearestShelters(sorted);
    };

    function useMyLocation() {
        setError("");
        if (!navigator.geolocation) {
            setError(
                "Geolocation is not supported by this browser. Please enter your coordinates manually."
            );
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                findNearestShelters(
                    position.coords.latitude,
                    position.coords.longitude
                );
            },
            () => {
                setError(
                    "Unable to get your location. Please enter your coordinates manually."
                );
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            }
        );
    }

    function handleManualLocationSubmit(event) {
        event.preventDefault();
        const latitude = Number(manualLatitude);
        const longitude = Number(manualLongitude);

        if (
            !Number.isFinite(latitude) ||
            latitude < -90 ||
            latitude > 90
        ) {
            setError(
                "Enter a valid latitude between -90 and 90."
            );
            return;
        }

        if (
            !Number.isFinite(longitude) ||
            longitude < -180 ||
            longitude > 180
        ) {
            setError(
                "Enter a valid longitude between -180 and 180."
            );
            return;
        }

        if (shelters.length === 0) {
            setError("No active shelters are available.");
            return;
        }

        setError("");
        setSelectedShelter(null);
        findNearestShelters(latitude, longitude);
    }

    return (
        <section className="admin-gis-page">
            {error && (
                <div className="admin-gis-error">
                    {error}
                </div>
            )}

            {success && (
                <div className="admin-gis-success">
                    {success}
                </div>
            )}
            <section className="admin-gis-stats">
                <article className="admin-panel admin-gis-stat-card">
                    <span>
                        Total Map Reports
                    </span>
                    <strong>
                        {locations.length}
                    </strong>
                </article>
                <article className="admin-panel admin-gis-stat-card">
                    <span>
                        Open Cases
                    </span>
                    <strong>
                        {openCases}
                    </strong>
                </article>
                <article className="admin-panel admin-gis-stat-card">
                    <span>
                        Lost Pet Cases
                    </span>
                    <strong>
                        {lostCases}
                    </strong>
                </article>
            </section>
            <section className="admin-gis-grid">
                <section className="admin-panel admin-gis-form-panel">
                    <div className="admin-panel-heading">
                        <h2>
                            {userRole === "volunteer"
                                ? "Record Stray Sighting"
                                : "Add Map Location"}
                        </h2>
                    </div>
                    <form
                        className="admin-gis-form"
                        onSubmit={
                            handleAddLocation
                        }
                    >
                        <label>
                            Pet Name
                            <input
                                type="text"
                                value={
                                    locationForm.petName
                                }
                                onChange={(e) =>
                                    handleFormChange(
                                        "petName",
                                        e.target.value
                                    )
                                }
                                placeholder="Use Unknown if not sure"
                                required
                            />
                        </label>
                        {userRole !== "volunteer" ? (
                            <label>
                                Report Type
                                <select
                                    value={
                                        locationForm.reportType
                                    }
                                    onChange={(e) =>
                                        handleFormChange(
                                            "reportType",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="lost">
                                        Lost Pet
                                    </option>
                                    <option value="found">
                                        Found Pet
                                    </option>
                                    <option value="stray">
                                        Stray Animal
                                    </option>
                                    <option value="rescue">
                                        Rescue Location
                                    </option>
                                    <option value="intake">
                                        Shelter Intake
                                    </option>
                                </select>
                            </label>
                        ) : (
                            <div>
                                <strong>
                                    Report Type
                                </strong>
                                <p>
                                    Stray Animal
                                </p>
                            </div>
                        )}

                        <label>
                            Species
                            <select
                                value={
                                    locationForm.species
                                }
                                onChange={(e) =>
                                    handleFormChange(
                                        "species",
                                        e.target.value
                                    )
                                }
                            >
                                <option value="dog">
                                    Dog
                                </option>
                                <option value="cat">
                                    Cat
                                </option>
                                <option value="other">
                                    Other
                                </option>
                                <option value="unknown">
                                    Unknown
                                </option>
                            </select>
                        </label>
                        <label>
                            Location Name
                            <input
                                type="text"
                                value={
                                    locationForm.locationName
                                }
                                onChange={(e) =>
                                    handleFormChange(
                                        "locationName",
                                        e.target.value
                                    )
                                }
                                placeholder="Example: Talisay City, Cebu"
                                required
                            />
                        </label>
                        <label>
                            Latitude
                            <input
                                type="number"
                                step="any"
                                value={
                                    locationForm.latitude
                                }
                                onChange={(e) =>
                                    handleFormChange(
                                        "latitude",
                                        e.target.value
                                    )
                                }
                                placeholder="Example: 10.2447"
                                required
                            />
                        </label>
                        <label>
                            Longitude
                            <input
                                type="number"
                                step="any"
                                value={
                                    locationForm.longitude
                                }
                                onChange={(e) =>
                                    handleFormChange(
                                        "longitude",
                                        e.target.value
                                    )
                                }
                                placeholder="Example: 123.8494"
                                required
                            />
                        </label>
                        <label>
                            Status
                            <select
                                value={
                                    locationForm.status
                                }
                                onChange={(e) =>
                                    handleFormChange(
                                        "status",
                                        e.target.value
                                    )
                                }
                            >
                                <option value="open">
                                    Open
                                </option>
                                <option value="resolved">
                                    Resolved
                                </option>
                            </select>
                        </label>
                        <label className="admin-gis-description-field">
                            Description
                            <textarea
                                value={
                                    locationForm.description
                                }
                                onChange={(e) =>
                                    handleFormChange(
                                        "description",
                                        e.target.value
                                    )
                                }
                                placeholder="Add report details, landmark, or notes."
                                required
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Recording..."
                                : userRole === "volunteer"
                                    ? "Record Stray Sighting"
                                    : "Add Location"}
                        </button>
                    </form>
                </section>
                <section className="admin-panel admin-gis-map-panel">
                    <div className="admin-panel-heading">
                        <h2>
                            GIS Map
                        </h2>
                        <div className="admin-gis-map-controls">
                            <button
                                type="button"
                                className={
                                    mapMode === "pins"
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setMapMode("pins")
                                }
                            >
                                Pins
                            </button>
                            <button
                                type="button"
                                className={
                                    mapMode === "hotspots"
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setMapMode("hotspots")
                                }
                            >
                                Hotspots
                            </button>
                        </div>
                    </div>
                    <div className="admin-gis-map-wrap">
                        <MapContainer
                            center={cebuCenter}
                            zoom={11}
                            scrollWheelZoom={true}
                            className="admin-gis-map"
                        >
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {mapMode === "pins" ? (
                                locations.map(
                                    (location) => (
                                        <Marker
                                            key={
                                                location._id
                                            }
                                            position={[
                                                Number(
                                                    location.latitude
                                                ),
                                                Number(
                                                    location.longitude
                                                ),
                                            ]}
                                            icon={
                                                markerIcon
                                            }
                                        >
                                            <Popup>
                                                <strong>
                                                    {
                                                        location.petName
                                                    }
                                                </strong>
                                                <br />
                                                {
                                                    location.reportType
                                                }
                                                {" • "}
                                                {
                                                    location.species
                                                }
                                                <br />
                                                {
                                                    location.locationName
                                                }
                                                <br />
                                                Status:{" "}
                                                {
                                                    location.status
                                                }
                                                <br />
                                                {
                                                    location.description
                                                }
                                            </Popup>
                                        </Marker>
                                    )
                                )
                            ) : (
                                hotspots.map(
                                    (hotspot, index) => (
                                        <Circle
                                            key={`${hotspot.latCell}:${hotspot.lngCell}`}
                                            center={[
                                                Number(
                                                    hotspot.latitude
                                                ),
                                                Number(
                                                    hotspot.longitude
                                                ),
                                            ]}
                                            radius={Math.max(
                                                hotspot.count * 150,
                                                250
                                            )}
                                        >
                                            <Popup>
                                                <strong>
                                                    Hotspot #{index + 1}
                                                </strong>
                                                <br />
                                                Reports:{" "}
                                                {
                                                    hotspot.count
                                                }
                                                <br />
                                                Lost:{" "}
                                                {
                                                    hotspot.lost
                                                }
                                                <br />
                                                Found:{" "}
                                                {
                                                    hotspot.found
                                                }
                                                <br />
                                                Stray:{" "}
                                                {
                                                    hotspot.stray
                                                }
                                            </Popup>
                                        </Circle>
                                    )
                                )
                            )}
                        </MapContainer>
                        {loading && (
                            <div className="admin-gis-map-loading">
                                Loading GIS locations...
                            </div>
                        )}
                    </div>
                </section>
            </section>
            <section className="admin-panel admin-gis-list-panel">
                <div className="admin-panel-heading">
                    <h2>
                        Mapped Reports
                    </h2>
                </div>
                <div className="admin-gis-list">
                    {loading ? (
                        <div>
                            Loading reports...
                        </div>
                    ) : locations.length ===
                        0 ? (
                        <div>
                            No mapped reports found.
                        </div>
                    ) : (
                        locations.map(
                            (location) => (
                                <article
                                    className="admin-gis-row"
                                    key={
                                        location._id
                                    }
                                >
                                    <div>
                                        <h3>
                                            {
                                                location.petName
                                            }
                                        </h3>
                                        <p>
                                            {
                                                location.reportType
                                            }{" "}
                                            •{" "}
                                            {
                                                location.species
                                            }{" "}
                                            •{" "}
                                            {
                                                location.locationName
                                            }
                                        </p>
                                        <small>
                                            Lat:{" "}
                                            {
                                                location.latitude
                                            }{" "}
                                            • Lng:{" "}
                                            {
                                                location.longitude
                                            }
                                        </small>
                                        <span>
                                            {
                                                location.description
                                            }
                                        </span>
                                    </div>
                                    <div className="admin-gis-actions">
                                        <span
                                            className={`admin-gis-type ${location.reportType}`}
                                        >
                                            {
                                                location.reportType
                                            }
                                        </span>
                                        <span
                                            className={`admin-status-pill ${location.status}`}
                                        >
                                            {
                                                location.status
                                            }
                                        </span>

                                        {userRole !== "volunteer" &&
                                            location.status === "open" && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleResolveLocation(
                                                            location._id
                                                        )
                                                    }
                                                >
                                                    Resolve
                                                </button>
                                            )}
                                    </div>
                                </article>
                            )
                        )
                    )}
                </div>
            </section>
            <section className="admin-panel admin-nearest-shelter-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Find Nearest Shelter</h2>
                        <p>
                            Find active shelters using your current
                            location or enter coordinates manually.
                        </p>
                    </div>
                </div>

                {shelterError && (
                    <div className="admin-gis-error">
                        {shelterError}
                    </div>
                )}

                <div className="admin-nearest-shelter-controls">
                    <button
                        type="button"
                        onClick={useMyLocation}
                        disabled={shelterLoading}
                    >
                        Use My Location
                    </button>

                    <form
                        className="admin-nearest-shelter-form"
                        onSubmit={handleManualLocationSubmit}
                    >
                        <label>
                            Latitude
                            <input
                                type="number"
                                step="any"
                                min="-90"
                                max="90"
                                value={manualLatitude}
                                onChange={(event) =>
                                    setManualLatitude(event.target.value)
                                }
                                placeholder="Example: 10.3157"
                            />
                        </label>

                        <label>
                            Longitude
                            <input
                                type="number"
                                step="any"
                                min="-180"
                                max="180"
                                value={manualLongitude}
                                onChange={(event) =>
                                    setManualLongitude(event.target.value)
                                }
                                placeholder="Example: 123.8854"
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={
                                shelterLoading ||
                                shelters.length === 0
                            }
                        >
                            Find Nearest
                        </button>
                    </form>
                </div>

                {shelterLoading ? (
                    <div className="admin-gis-list">
                        Loading shelters...
                    </div>
                ) : selectedShelter ? (
                    <div className="admin-nearest-shelter-details">
                        <button
                            type="button"
                            onClick={() => setSelectedShelter(null)}
                        >
                            ← Back to Shelters
                        </button>

                        <div className="admin-gis-row">
                            <div>
                                <h3>{selectedShelter.name}</h3>
                                <p>{selectedShelter.address}</p>

                                {selectedShelter.description && (
                                    <span>
                                        {selectedShelter.description}
                                    </span>
                                )}
                            </div>

                            <div className="admin-gis-actions">
                                <strong>
                                    {selectedShelter.distance != null
                                        ? `${selectedShelter.distance.toFixed(2)} km away`
                                        : "Distance unavailable"}
                                </strong>

                                {selectedShelter.contact && (
                                    <small>
                                        Contact: {selectedShelter.contact}
                                    </small>
                                )}

                                {selectedShelter.email && (
                                    <small>
                                        Email: {selectedShelter.email}
                                    </small>
                                )}

                                <small>
                                    Lat: {selectedShelter.latitude}
                                    {" • "}
                                    Lng: {selectedShelter.longitude}
                                </small>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="admin-nearest-shelter-results">
                        <div className="admin-panel-heading">
                            <div>
                                <h3>Nearby Shelters</h3>

                                {userLocation && (
                                    <p>
                                        Search location: {" "}
                                        {userLocation.latitude.toFixed(6)}
                                        {", "}
                                        {userLocation.longitude.toFixed(6)}
                                    </p>
                                )}
                            </div>

                            {nearestShelters.length > 0 && (
                                <strong>
                                    {nearestShelters.length} shelters
                                </strong>
                            )}
                        </div>

                        {!userLocation ? (
                            <div className="admin-gis-list">
                                Use your location or enter coordinates
                                to find nearby shelters.
                            </div>
                        ) : nearestShelters.length === 0 ? (
                            <div className="admin-gis-list">
                                No active shelters are available.
                            </div>
                        ) : (
                            <div className="admin-gis-list">
                                {nearestShelters.map((shelter, index) => (
                                    <button
                                        type="button"
                                        className="admin-gis-row admin-shelter-row"
                                        key={
                                            shelter._id ||
                                            shelter.id ||
                                            `${shelter.name}-${shelter.latitude}-${shelter.longitude}`
                                        }
                                        onClick={() =>
                                            setSelectedShelter(shelter)
                                        }
                                    >
                                        <div>
                                            <h3>
                                                {index + 1}. {shelter.name}
                                            </h3>
                                            <p>{shelter.address}</p>
                                        </div>

                                        <div className="admin-gis-actions">
                                            <strong>
                                                {shelter.distance.toFixed(2)} km
                                            </strong>
                                            <span>View Details</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </section>

            <section className="admin-panel admin-gis-hotspot-panel">
                <div className="admin-panel-heading">
                    <h2>
                        Hotspot Analysis
                    </h2>
                    <p>
                        Areas with the highest
                        concentration of open GIS reports.
                    </p>
                </div>

                {hotspotError && (
                    <div className="admin-gis-error">
                        {hotspotError}
                    </div>
                )}

                {hotspotLoading ? (
                    <div>
                        Loading hotspot analysis...
                    </div>
                ) : hotspots.length === 0 ? (
                    <div>
                        No open GIS reports available
                        for hotspot analysis.
                    </div>
                ) : (
                    <div className="admin-gis-hotspot-list">
                        {hotspots
                            .slice(0, 5)
                            .map((hotspot, index) => (
                                <article
                                    className="admin-gis-hotspot-row"
                                    key={`${hotspot.latCell}:${hotspot.lngCell}`}
                                >
                                    <div>
                                        <strong>
                                            Hotspot #{index + 1}
                                        </strong>
                                        <p>
                                            Latitude:{" "}
                                            {hotspot.latitude.toFixed(5)}
                                            <br />
                                            Longitude:{" "}
                                            {hotspot.longitude.toFixed(5)}
                                        </p>
                                    </div>
                                    <div>
                                        <strong>
                                            {hotspot.count}
                                        </strong>
                                        <span>
                                            Reports
                                        </span>
                                    </div>
                                    <div>
                                        <small>
                                            Lost:{" "}
                                            {hotspot.lost}
                                        </small>
                                        <small>
                                            Found:{" "}
                                            {hotspot.found}
                                        </small>
                                        <small>
                                            Stray:{" "}
                                            {hotspot.stray}
                                        </small>
                                    </div>
                                </article>
                            ))}
                    </div>
                )}
            </section>
        </section>
    );
}