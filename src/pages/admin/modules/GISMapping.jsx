import { useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const cebuCenter = [10.3157, 123.8854];

const markerIcon = L.divIcon({
    className: "admin-gis-marker",
    html: "📍",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
});

const starterLocations = [
    {
        id: 1,
        petName: "Milo",
        reportType: "lost",
        species: "Dog",
        locationName: "Talisay City, Cebu",
        latitude: 10.2447,
        longitude: 123.8494,
        status: "open",
        description: "Brown dog with red collar last seen near the market.",
    },
    {
        id: 2,
        petName: "Unknown Cat",
        reportType: "found",
        species: "Cat",
        locationName: "Cebu City",
        latitude: 10.3157,
        longitude: 123.8854,
        status: "open",
        description: "White cat found near a convenience store.",
    },
];

export default function GISMapping() {
    const [locations, setLocations] = useState(starterLocations);

    const [locationForm, setLocationForm] = useState({
        petName: "",
        reportType: "lost",
        species: "Dog",
        locationName: "",
        latitude: "",
        longitude: "",
        status: "open",
        description: "",
    });

    const openCases = useMemo(() => {
        return locations.filter((location) => location.status === "open").length;
    }, [locations]);

    const lostCases = useMemo(() => {
        return locations.filter((location) => location.reportType === "lost").length;
    }, [locations]);

    function handleAddLocation(e) {
        e.preventDefault();

        const latitude = Number(locationForm.latitude);
        const longitude = Number(locationForm.longitude);

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) return;

        const newLocation = {
            id: Date.now(),
            ...locationForm,
            latitude,
            longitude,
        };

        setLocations((current) => [newLocation, ...current]);

        setLocationForm({
            petName: "",
            reportType: "lost",
            species: "Dog",
            locationName: "",
            latitude: "",
            longitude: "",
            status: "open",
            description: "",
        });
    }

    function handleResolveLocation(id) {
        setLocations((current) =>
            current.map((location) =>
                location.id === id ? { ...location, status: "resolved" } : location
            )
        );
    }

    return (
        <section className="admin-gis-page">
            <section className="admin-gis-stats">
                <article className="admin-panel admin-gis-stat-card">
                    <span>Total Map Reports</span>
                    <strong>{locations.length}</strong>
                </article>

                <article className="admin-panel admin-gis-stat-card">
                    <span>Open Cases</span>
                    <strong>{openCases}</strong>
                </article>

                <article className="admin-panel admin-gis-stat-card">
                    <span>Lost Pet Cases</span>
                    <strong>{lostCases}</strong>
                </article>
            </section>

            <section className="admin-gis-grid">
                <section className="admin-panel admin-gis-form-panel">
                    <div className="admin-panel-heading">
                        <h2>Add Map Location</h2>
                    </div>

                    <form className="admin-gis-form" onSubmit={handleAddLocation}>
                        <label>
                            Pet Name
                            <input
                                type="text"
                                value={locationForm.petName}
                                onChange={(e) =>
                                    setLocationForm({
                                        ...locationForm,
                                        petName: e.target.value,
                                    })
                                }
                                placeholder="Use Unknown if not sure"
                                required
                            />
                        </label>

                        <label>
                            Report Type
                            <select
                                value={locationForm.reportType}
                                onChange={(e) =>
                                    setLocationForm({
                                        ...locationForm,
                                        reportType: e.target.value,
                                    })
                                }
                            >
                                <option value="lost">Lost Pet</option>
                                <option value="found">Found Pet</option>
                                <option value="rescue">Rescue Location</option>
                                <option value="intake">Shelter Intake</option>
                            </select>
                        </label>

                        <label>
                            Species
                            <select
                                value={locationForm.species}
                                onChange={(e) =>
                                    setLocationForm({
                                        ...locationForm,
                                        species: e.target.value,
                                    })
                                }
                            >
                                <option value="Dog">Dog</option>
                                <option value="Cat">Cat</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>

                        <label>
                            Location Name
                            <input
                                type="text"
                                value={locationForm.locationName}
                                onChange={(e) =>
                                    setLocationForm({
                                        ...locationForm,
                                        locationName: e.target.value,
                                    })
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
                                value={locationForm.latitude}
                                onChange={(e) =>
                                    setLocationForm({
                                        ...locationForm,
                                        latitude: e.target.value,
                                    })
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
                                value={locationForm.longitude}
                                onChange={(e) =>
                                    setLocationForm({
                                        ...locationForm,
                                        longitude: e.target.value,
                                    })
                                }
                                placeholder="Example: 123.8494"
                                required
                            />
                        </label>

                        <label>
                            Status
                            <select
                                value={locationForm.status}
                                onChange={(e) =>
                                    setLocationForm({
                                        ...locationForm,
                                        status: e.target.value,
                                    })
                                }
                            >
                                <option value="open">Open</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </label>

                        <label className="admin-gis-description-field">
                            Description
                            <textarea
                                value={locationForm.description}
                                onChange={(e) =>
                                    setLocationForm({
                                        ...locationForm,
                                        description: e.target.value,
                                    })
                                }
                                placeholder="Add report details, landmark, or notes."
                                required
                            />
                        </label>

                        <button type="submit">Add Location</button>
                    </form>
                </section>

                <section className="admin-panel admin-gis-map-panel">
                    <div className="admin-panel-heading">
                        <h2>GIS Map</h2>
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

                            {locations.map((location) => (
                                <Marker
                                    key={location.id}
                                    position={[location.latitude, location.longitude]}
                                    icon={markerIcon}
                                >
                                    <Popup>
                                        <strong>{location.petName}</strong>
                                        <br />
                                        {location.reportType} • {location.species}
                                        <br />
                                        {location.locationName}
                                        <br />
                                        Status: {location.status}
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </section>
            </section>

            <section className="admin-panel admin-gis-list-panel">
                <div className="admin-panel-heading">
                    <h2>Mapped Reports</h2>
                </div>

                <div className="admin-gis-list">
                    {locations.map((location) => (
                        <article className="admin-gis-row" key={location.id}>
                            <div>
                                <h3>{location.petName}</h3>
                                <p>
                                    {location.reportType} • {location.species} •{" "}
                                    {location.locationName}
                                </p>

                                <small>
                                    Lat: {location.latitude} • Lng: {location.longitude}
                                </small>

                                <span>{location.description}</span>
                            </div>

                            <div className="admin-gis-actions">
                                <span className={`admin-gis-type ${location.reportType}`}>
                                    {location.reportType}
                                </span>

                                <span className={`admin-status-pill ${location.status}`}>
                                    {location.status}
                                </span>

                                {location.status === "open" && (
                                    <button
                                        type="button"
                                        onClick={() => handleResolveLocation(location.id)}
                                    >
                                        Resolve
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </section>
    );
}