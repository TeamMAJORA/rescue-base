import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API =
    import.meta.env.VITE_BACKEND_URL;

const cebuCenter = [10.3157, 123.8854];

const markerIcon = L.divIcon({
    className: "admin-gis-marker",
    html: "📍",
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

    const [locationForm, setLocationForm] =
        useState(emptyLocationForm);

    const [loading, setLoading] =
        useState(true);

    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

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

    async function loadLocations() {
        const token =
            localStorage.getItem("token");

        if (!token) {
            setError(
                "Authentication token is missing."
            );
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${API}/api/gis`,
                {
                    method: "GET",
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

    useEffect(() => {
        loadLocations();
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

            const response = await fetch(
                `${API}/api/gis`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        petName:
                            locationForm.petName.trim(),

                        reportType:
                            locationForm.reportType,

                        species:
                            locationForm.species,

                        locationName:
                            locationForm.locationName.trim(),

                        latitude,

                        longitude,

                        status:
                            locationForm.status,

                        description:
                            locationForm.description.trim(),
                    }),
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

            await loadLocations();
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

            await loadLocations();
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
                            Add Map Location
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
                            disabled={
                                submitting
                            }
                        >
                            {submitting
                                ? "Adding..."
                                : "Add Location"}
                        </button>
                    </form>
                </section>

                <section className="admin-panel admin-gis-map-panel">
                    <div className="admin-panel-heading">
                        <h2>
                            GIS Map
                        </h2>
                    </div>

                    <div className="admin-gis-map-wrap">
                        {loading ? (
                            <div>
                                Loading GIS map...
                            </div>
                        ) : (
                            <MapContainer
                                center={
                                    cebuCenter
                                }
                                zoom={11}
                                scrollWheelZoom={
                                    true
                                }
                                className="admin-gis-map"
                            >
                                <TileLayer
                                    attribution="&copy; OpenStreetMap contributors"
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                {locations.map(
                                    (
                                        location
                                    ) => (
                                        <Marker
                                            key={
                                                location._id
                                            }
                                            position={[
                                                location.latitude,
                                                location.longitude,
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
                                                }{" "}
                                                •{" "}
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
                                )}
                            </MapContainer>
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

                                        {location.status ===
                                            "open" && (
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
        </section>
    );
}