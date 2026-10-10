
import { useEffect, useMemo, useState } from "react";
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    Circle,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import assets from "../../../data/assets.json";

const API = import.meta.env.VITE_BACKEND_URL;
const cebuCenter = [10.3157, 123.8854];

const createMarkerIcon = (image, alt) =>
    L.divIcon({
        className: "admin-gis-marker",
        html: `<img src="${image}" width="40" height="40" alt="${alt}" />`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30],
    });

const markerIcon = createMarkerIcon(
    assets.icons.straymapbrown,
    "Animal report location"
);

const shelterIcon = createMarkerIcon(
    assets.icons.pawpin,
    "Shelter location"
);

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

const emptyShelterForm = {
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    contact: "",
    email: "",
    description: "",
    status: "active",
};

const getToken = () => localStorage.getItem("token");

async function readResponse(response, fallback) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || fallback);
    }

    return data;
}

function validCoordinates(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    return (
        latitude !== "" &&
        longitude !== "" &&
        latitude != null &&
        longitude != null &&
        Number.isFinite(lat) &&
        lat >= -90 &&
        lat <= 90 &&
        Number.isFinite(lng) &&
        lng >= -180 &&
        lng <= 180
    );
}

export default function GISMapping() {
    // GIS report state
    const [locations, setLocations] = useState([]);
    const [locationForm, setLocationForm] = useState({
        ...emptyLocationForm,
    });
    const [editingLocationId, setEditingLocationId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Shared messages and role
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [userRole, setUserRole] = useState("");

    // Hotspot state
    const [hotspots, setHotspots] = useState([]);
    const [hotspotLoading, setHotspotLoading] = useState(true);
    const [hotspotError, setHotspotError] = useState("");
    const [mapMode, setMapMode] = useState("pins");

    // Shelter management state
    const [shelters, setShelters] = useState([]);
    const [shelterLoading, setShelterLoading] = useState(true);
    const [shelterError, setShelterError] = useState("");
    const [shelterSuccess, setShelterSuccess] = useState("");
    const [shelterForm, setShelterForm] = useState({
        ...emptyShelterForm,
    });
    const [editingShelterId, setEditingShelterId] = useState(null);
    const [savingShelter, setSavingShelter] = useState(false);
    const [changingShelterId, setChangingShelterId] = useState(null);

    // Nearest shelter finder
    const [userLocation, setUserLocation] = useState(null);
    const [nearestShelters, setNearestShelters] = useState([]);
    const [selectedShelter, setSelectedShelter] = useState(null);
    const [manualLatitude, setManualLatitude] = useState("");
    const [manualLongitude, setManualLongitude] = useState("");

    const canManage = ["admin", "staff"].includes(userRole);

    const openCases = useMemo(
        () => locations.filter((item) => item.status === "open").length,
        [locations]
    );

    const lostCases = useMemo(
        () => locations.filter((item) => item.reportType === "lost").length,
        [locations]
    );

    // ---------------------------
    // Load GIS reports
    // ---------------------------

    async function loadLocations(role = userRole) {
        try {
            setLoading(true);
            setError("");

            const isVolunteer = role === "volunteer";
            const response = await fetch(
                isVolunteer
                    ? `${API}/api/gis/public`
                    : `${API}/api/gis`,
                {
                    headers: isVolunteer
                        ? {}
                        : { Authorization: `Bearer ${getToken()}` },
                }
            );

            const data = await readResponse(
                response,
                "Failed to load GIS locations."
            );

            setLocations(Array.isArray(data.locations) ? data.locations : []);
        } catch (err) {
            console.error("Load GIS locations error:", err);
            setError(err.message || "Failed to load GIS locations.");
        } finally {
            setLoading(false);
        }
    }

    async function loadHotspots() {
        if (!getToken()) {
            setHotspots([]);
            setHotspotError("Authentication token is missing.");
            setHotspotLoading(false);
            return;
        }

        try {
            setHotspotLoading(true);
            setHotspotError("");

            const response = await fetch(`${API}/api/gis/hotspots`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });

            const data = await readResponse(
                response,
                "Failed to load hotspot analysis."
            );

            setHotspots(Array.isArray(data.hotspots) ? data.hotspots : []);
        } catch (err) {
            console.error("Hotspot analysis error:", err);
            setHotspotError(err.message || "Failed to load hotspot analysis.");
        } finally {
            setHotspotLoading(false);
        }
    }

    // ---------------------------
    // Load shelters
    // ---------------------------

    async function loadShelters(role = userRole) {
        try {
            setShelterLoading(true);
            setShelterError("");

            const canManageShelters = ["admin", "staff"].includes(role);
            const endpoint = canManageShelters
                ? `${API}/api/gis/shelters/manage`
                : `${API}/api/gis/shelters`;

            const response = await fetch(endpoint, {
                headers: canManageShelters
                    ? { Authorization: `Bearer ${getToken()}` }
                    : {},
            });

            const data = await readResponse(
                response,
                "Failed to load shelters."
            );

            setShelters(
                Array.isArray(data.shelters) ? data.shelters : []
            );
        } catch (err) {
            console.error("Load shelters error:", err);
            setShelterError(err.message || "Failed to load shelters.");
        } finally {
            setShelterLoading(false);
        }
    }

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("rescuebase_user");
            const user = storedUser ? JSON.parse(storedUser) : null;

            setUserRole(String(user?.role || "").trim().toLowerCase());
        } catch (err) {
            console.error("Failed to read user information:", err);
            setUserRole("");
        }
    }, []);

    useEffect(() => {
        if (!userRole) {
            setLoading(false);
            setHotspotLoading(false);
            return;
        }

        loadLocations(userRole);

        if (["admin", "staff"].includes(userRole)) {
            loadHotspots();
        } else {
            setHotspots([]);
            setHotspotLoading(false);
        }
    }, [userRole]);

    useEffect(() => {
        if (userRole) {
            loadShelters(userRole);
        }
    }, [userRole]);

    // ---------------------------
    // Location form
    // ---------------------------

    function handleFormChange(field, value) {
        setLocationForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function handleCancelEdit() {
        setEditingLocationId(null);
        setLocationForm({ ...emptyLocationForm });
        setError("");
        setSuccess("");
    }

    function handleEditLocation(location) {
        if (!canManage) {
            setError("You do not have permission to edit locations.");
            return;
        }

        setError("");
        setSuccess("");
        setEditingLocationId(location._id);

        setLocationForm({
            petName: location.petName || "",
            reportType: location.reportType || "lost",
            species: location.species || "unknown",
            locationName: location.locationName || "",
            latitude: String(location.latitude ?? ""),
            longitude: String(location.longitude ?? ""),
            status: location.status || "open",
            description: location.description || "",
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleAddLocation(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        const token = getToken();

        if (!token) {
            setError("Authentication token is missing.");
            return;
        }

        const isVolunteer = userRole === "volunteer";
        const isEditing = Boolean(editingLocationId);

        if (isEditing && !canManage) {
            setError("You do not have permission to edit locations.");
            return;
        }

        if (
            !validCoordinates(
                locationForm.latitude,
                locationForm.longitude
            )
        ) {
            setError("Enter valid latitude and longitude coordinates.");
            return;
        }

        const latitude = Number(locationForm.latitude);
        const longitude = Number(locationForm.longitude);

        const body = isVolunteer
            ? {
                petName: locationForm.petName.trim() || "Unknown Stray",
                species: locationForm.species,
                locationName: locationForm.locationName.trim(),
                latitude,
                longitude,
                description: locationForm.description.trim(),
            }
            : {
                petName: locationForm.petName.trim() || "Unknown Animal",
                reportType: locationForm.reportType,
                species: locationForm.species,
                locationName: locationForm.locationName.trim(),
                latitude,
                longitude,
                status: locationForm.status,
                description: locationForm.description.trim(),
            };

        const endpoint = isVolunteer
            ? `${API}/api/gis/stray-sightings`
            : isEditing
                ? `${API}/api/gis/${editingLocationId}`
                : `${API}/api/gis`;

        try {
            setSubmitting(true);

            const response = await fetch(endpoint, {
                method: isEditing ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            await readResponse(
                response,
                isEditing
                    ? "Failed to update GIS location."
                    : "Failed to create GIS location."
            );

            setLocationForm({ ...emptyLocationForm });
            setEditingLocationId(null);

            setSuccess(
                isVolunteer
                    ? "Stray sighting recorded successfully."
                    : isEditing
                        ? "Location updated successfully."
                        : "GIS location added successfully."
            );

            await loadLocations(userRole);

            if (canManage) {
                await loadHotspots();
            }
        } catch (err) {
            console.error("Save GIS location error:", err);
            setError(err.message || "Failed to save GIS location.");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleResolveLocation(id) {
        if (!canManage) {
            setError("You do not have permission to resolve locations.");
            return;
        }

        if (!getToken()) {
            setError("Authentication token is missing.");
            return;
        }

        try {
            setError("");
            setSuccess("");

            const response = await fetch(`${API}/api/gis/${id}/resolve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${getToken()}` },
            });

            await readResponse(response, "Failed to resolve GIS location.");

            setSuccess("GIS location resolved successfully.");
            await loadLocations(userRole);
            await loadHotspots();
        } catch (err) {
            console.error("Resolve GIS location error:", err);
            setError(err.message || "Failed to resolve GIS location.");
        }
    }

    async function handleDeleteLocation(location) {
        if (!canManage) {
            setError("You do not have permission to delete locations.");
            return;
        }

        const label =
            location.petName || location.locationName || "this location";

        if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) {
            return;
        }

        if (!getToken()) {
            setError("Authentication token is missing.");
            return;
        }

        try {
            setError("");
            setSuccess("");
            setDeletingId(location._id);

            const response = await fetch(
                `${API}/api/gis/${location._id}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${getToken()}` },
                }
            );

            await readResponse(response, "Failed to delete GIS location.");

            if (editingLocationId === location._id) {
                setEditingLocationId(null);
                setLocationForm({ ...emptyLocationForm });
            }

            setSuccess("GIS location deleted successfully.");
            await loadLocations(userRole);
            await loadHotspots();
        } catch (err) {
            console.error("Delete GIS location error:", err);
            setError(err.message || "Failed to delete GIS location.");
        } finally {
            setDeletingId(null);
        }
    }

    // ---------------------------
    // Shelter form and management
    // ---------------------------

    function handleShelterFormChange(field, value) {
        setShelterForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function cancelShelterEdit() {
        setEditingShelterId(null);
        setShelterForm({ ...emptyShelterForm });
        setShelterError("");
        setShelterSuccess("");
    }

    function editShelter(shelter) {
        if (!canManage) return;

        setEditingShelterId(shelter._id);
        setShelterForm({
            name: shelter.name || "",
            address: shelter.address || "",
            latitude: String(shelter.latitude ?? ""),
            longitude: String(shelter.longitude ?? ""),
            contact: shelter.contact || "",
            email: shelter.email || "",
            description: shelter.description || "",
            status: shelter.status || "active",
        });

        setShelterError("");
        setShelterSuccess("");

        document
            .getElementById("admin-gis-shelter-form")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function saveShelter(event) {
        event.preventDefault();
        setShelterError("");
        setShelterSuccess("");

        if (!canManage) {
            setShelterError("Only Admin and Staff can manage shelters.");
            return;
        }

        const token = getToken();

        if (!token) {
            setShelterError("Authentication token is missing.");
            return;
        }

        if (
            !shelterForm.name.trim() ||
            !shelterForm.address.trim()
        ) {
            setShelterError("Shelter name and address are required.");
            return;
        }

        if (
            !validCoordinates(
                shelterForm.latitude,
                shelterForm.longitude
            )
        ) {
            setShelterError("Enter valid shelter latitude and longitude.");
            return;
        }

        if (
            shelterForm.email.trim() &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shelterForm.email.trim())
        ) {
            setShelterError("Enter a valid email address.");
            return;
        }

        const body = {
            name: shelterForm.name.trim(),
            address: shelterForm.address.trim(),
            latitude: Number(shelterForm.latitude),
            longitude: Number(shelterForm.longitude),
            contact: shelterForm.contact.trim(),
            email: shelterForm.email.trim(),
            description: shelterForm.description.trim(),
            status: shelterForm.status,
        };

        const isEditing = Boolean(editingShelterId);
        const endpoint = isEditing
            ? `${API}/api/gis/shelters/${editingShelterId}`
            : `${API}/api/gis/shelters`;

        try {
            setSavingShelter(true);

            const response = await fetch(endpoint, {
                method: isEditing ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            await readResponse(
                response,
                isEditing
                    ? "Failed to update shelter."
                    : "Failed to register shelter."
            );

            setShelterForm({ ...emptyShelterForm });
            setEditingShelterId(null);

            setShelterSuccess(
                isEditing
                    ? "Shelter updated successfully."
                    : "Shelter registered successfully."
            );

            await loadShelters();
        } catch (err) {
            console.error("Save shelter error:", err);
            setShelterError(err.message || "Failed to save shelter.");
        } finally {
            setSavingShelter(false);
        }
    }

    async function toggleShelterStatus(shelter) {
        if (!canManage) return;

        const nextStatus =
            shelter.status === "active" ? "inactive" : "active";

        if (
            !window.confirm(
                `${nextStatus === "active" ? "Activate" : "Deactivate"} "${shelter.name}"?`
            )
        ) {
            return;
        }

        try {
            setShelterError("");
            setShelterSuccess("");
            setChangingShelterId(shelter._id);

            const response = await fetch(
                `${API}/api/gis/shelters/${shelter._id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getToken()}`,
                    },
                    body: JSON.stringify({ status: nextStatus }),
                }
            );

            await readResponse(response, "Failed to update shelter status.");

            setShelterSuccess(
                `Shelter ${nextStatus === "active" ? "activated" : "deactivated"} successfully.`
            );

            if (selectedShelter?._id === shelter._id) {
                setSelectedShelter(null);
            }

            await loadShelters();
        } catch (err) {
            console.error("Shelter status update error:", err);
            setShelterError(err.message || "Failed to update shelter status.");
        } finally {
            setChangingShelterId(null);
        }
    }

    // ---------------------------
    // Nearest shelter finder
    // ---------------------------

    function haversineDistance(lat1, lon1, lat2, lon2) {
        const earthRadius = 6371;
        const toRadians = (value) => (value * Math.PI) / 180;
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;

        return (
            earthRadius *
            2 *
            Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        );
    }

    function findNearestShelters(latitude, longitude) {
        const sorted = shelters
            .filter(
                (shelter) =>
                    shelter.status === "active" &&
                    validCoordinates(shelter.latitude, shelter.longitude)
            )
            .map((shelter) => ({
                ...shelter,
                distance: haversineDistance(
                    latitude,
                    longitude,
                    Number(shelter.latitude),
                    Number(shelter.longitude)
                ),
            }))
            .sort((a, b) => a.distance - b.distance);

        setUserLocation({ latitude, longitude });
        setNearestShelters(sorted);
        setSelectedShelter(null);
    }

    function useMyLocation() {
        setShelterError("");

        if (!navigator.geolocation) {
            setShelterError(
                "Geolocation is not supported. Enter your coordinates manually."
            );
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setShelterError("");
                findNearestShelters(
                    position.coords.latitude,
                    position.coords.longitude
                );
            },
            () => {
                setShelterError(
                    "Unable to get your location. Enter your coordinates manually."
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

        if (
            !validCoordinates(manualLatitude, manualLongitude)
        ) {
            setShelterError("Enter valid latitude and longitude coordinates.");
            return;
        }

        if (!shelters.some((item) => item.status === "active")) {
            setShelterError("No active shelters are available.");
            return;
        }

        setShelterError("");
        findNearestShelters(
            Number(manualLatitude),
            Number(manualLongitude)
        );
    }

    const activeShelters = shelters.filter(
        (shelter) => shelter.status === "active"
    );

    return (
        <section className="admin-gis-page">
            {error && <div className="admin-gis-error">{error}</div>}
            {success && <div className="admin-gis-success">{success}</div>}

            {/* GIS statistics */}
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

                <article className="admin-panel admin-gis-stat-card">
                    <span>Active Shelters</span>
                    <strong>{activeShelters.length}</strong>
                </article>
            </section>

            {/* Add/edit GIS report */}
            <section className="admin-gis-grid">
                <section className="admin-panel admin-gis-form-panel">
                    <div className="admin-panel-heading">
                        <h2>
                            {userRole === "volunteer"
                                ? "Record Stray Sighting"
                                : editingLocationId
                                    ? "Edit Map Location"
                                    : "Add Map Location"}
                        </h2>
                    </div>

                    <form className="admin-gis-form" onSubmit={handleAddLocation}>
                        <label>
                            Pet Name
                            <input
                                value={locationForm.petName}
                                onChange={(e) =>
                                    handleFormChange("petName", e.target.value)
                                }
                                placeholder="Pet name or Unknown"
                                required
                            />
                        </label>

                        {userRole !== "volunteer" && (
                            <label>
                                Report Type
                                <select
                                    value={locationForm.reportType}
                                    onChange={(e) =>
                                        handleFormChange("reportType", e.target.value)
                                    }
                                >
                                    <option value="lost">Lost Pet</option>
                                    <option value="found">Found Pet</option>
                                    <option value="stray">Stray Animal</option>
                                    <option value="rescue">Rescue Location</option>
                                    <option value="intake">Shelter Intake</option>
                                </select>
                            </label>
                        )}

                        <label>
                            Species
                            <select
                                value={locationForm.species}
                                onChange={(e) =>
                                    handleFormChange("species", e.target.value)
                                }
                            >
                                <option value="dog">Dog</option>
                                <option value="cat">Cat</option>
                                <option value="other">Other</option>
                                <option value="unknown">Unknown</option>
                            </select>
                        </label>

                        <label>
                            Location Name
                            <input
                                value={locationForm.locationName}
                                onChange={(e) =>
                                    handleFormChange("locationName", e.target.value)
                                }
                                placeholder="City, barangay, or landmark"
                                required
                            />
                        </label>

                        <label>
                            Latitude
                            <input
                                type="number"
                                step="any"
                                min="-90"
                                max="90"
                                value={locationForm.latitude}
                                onChange={(e) =>
                                    handleFormChange("latitude", e.target.value)
                                }
                                required
                            />
                        </label>

                        <label>
                            Longitude
                            <input
                                type="number"
                                step="any"
                                min="-180"
                                max="180"
                                value={locationForm.longitude}
                                onChange={(e) =>
                                    handleFormChange("longitude", e.target.value)
                                }
                                required
                            />
                        </label>

                        {userRole !== "volunteer" && (
                            <label>
                                Status
                                <select
                                    value={locationForm.status}
                                    onChange={(e) =>
                                        handleFormChange("status", e.target.value)
                                    }
                                >
                                    <option value="open">Open</option>
                                    <option value="resolved">Resolved</option>
                                </select>
                            </label>
                        )}

                        <label className="admin-gis-description-field">
                            Description
                            <textarea
                                value={locationForm.description}
                                onChange={(e) =>
                                    handleFormChange("description", e.target.value)
                                }
                                required
                            />
                        </label>

                        <button type="submit" disabled={submitting || !userRole}>
                            {submitting
                                ? "Saving..."
                                : userRole === "volunteer"
                                    ? "Record Stray Sighting"
                                    : editingLocationId
                                        ? "Save Changes"
                                        : "Add Location"}
                        </button>

                        {editingLocationId && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={submitting}
                            >
                                Cancel Edit
                            </button>
                        )}
                    </form>
                </section>

                {/* Map */}
                <section className="admin-panel admin-gis-map-panel">
                    <div className="admin-panel-heading">
                        <h2>GIS Map</h2>

                        <div className="admin-gis-map-controls">
                            <button
                                type="button"
                                className={mapMode === "pins" ? "active" : ""}
                                onClick={() => setMapMode("pins")}
                            >
                                Pins
                            </button>

                            {canManage && (
                                <button
                                    type="button"
                                    className={mapMode === "hotspots" ? "active" : ""}
                                    onClick={() => setMapMode("hotspots")}
                                >
                                    Hotspots
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="admin-gis-map-wrap">
                        <MapContainer
                            center={cebuCenter}
                            zoom={11}
                            scrollWheelZoom
                            className="admin-gis-map"
                        >
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {mapMode === "pins" ? (
                                <>
                                    {locations
                                        .filter((item) =>
                                            validCoordinates(
                                                item.latitude,
                                                item.longitude
                                            )
                                        )
                                        .map((location) => (
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
                                                        {location.petName || "Unknown Animal"}
                                                    </strong>
                                                    <br />
                                                    {location.reportType || "stray"} •{" "}
                                                    {location.species || "unknown"}
                                                    <br />
                                                    {location.locationName}
                                                    <br />
                                                    Status: {location.status}
                                                    <br />
                                                    {location.description}
                                                </Popup>
                                            </Marker>
                                        ))}

                                    {activeShelters
                                        .filter((item) =>
                                            validCoordinates(
                                                item.latitude,
                                                item.longitude
                                            )
                                        )
                                        .map((shelter) => (
                                            <Marker
                                                key={`shelter-${shelter._id}`}
                                                position={[
                                                    Number(shelter.latitude),
                                                    Number(shelter.longitude),
                                                ]}
                                                icon={shelterIcon}
                                            >
                                                <Popup>
                                                    <strong>{shelter.name}</strong>
                                                    <br />
                                                    {shelter.address}
                                                    <br />
                                                    Active Shelter
                                                    {shelter.contact && (
                                                        <>
                                                            <br />
                                                            Contact: {shelter.contact}
                                                        </>
                                                    )}
                                                </Popup>
                                            </Marker>
                                        ))}
                                </>
                            ) : (
                                hotspots.map((hotspot, index) => (
                                    <Circle
                                        key={`${hotspot.latCell}:${hotspot.lngCell}`}
                                        center={[
                                            Number(hotspot.latitude),
                                            Number(hotspot.longitude),
                                        ]}
                                        radius={Math.max(
                                            Number(hotspot.count) * 150,
                                            250
                                        )}
                                    >
                                        <Popup>
                                            <strong>Hotspot #{index + 1}</strong>
                                            <br />
                                            Reports: {hotspot.count}
                                            <br />
                                            Lost: {hotspot.lost}
                                            <br />
                                            Found: {hotspot.found}
                                            <br />
                                            Stray: {hotspot.stray}
                                        </Popup>
                                    </Circle>
                                ))
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

            {/* Manage reports */}
            <section className="admin-panel admin-gis-list-panel">
                <div className="admin-panel-heading">
                    <h2>Mapped Reports</h2>
                </div>

                <div className="admin-gis-list">
                    {loading ? (
                        <div>Loading reports...</div>
                    ) : locations.length === 0 ? (
                        <div>No mapped reports found.</div>
                    ) : (
                        locations.map((location) => (
                            <article className="admin-gis-row" key={location._id}>
                                <div>
                                    <h3>{location.petName || "Unknown Animal"}</h3>
                                    <p>
                                        {location.reportType || "stray"} •{" "}
                                        {location.species || "unknown"} •{" "}
                                        {location.locationName}
                                    </p>
                                    <small>
                                        Lat: {location.latitude} • Lng:{" "}
                                        {location.longitude}
                                    </small>
                                    <span>{location.description}</span>
                                </div>

                                <div className="admin-gis-actions">
                                    <span
                                        className={`admin-gis-type ${location.reportType || "stray"}`}
                                    >
                                        {location.reportType || "stray"}
                                    </span>

                                    <span
                                        className={`admin-status-pill ${location.status}`}
                                    >
                                        {location.status}
                                    </span>

                                    {canManage && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleEditLocation(location)
                                                }
                                                disabled={submitting}
                                            >
                                                Edit
                                            </button>

                                            {location.status === "open" && (
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

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteLocation(location)
                                                }
                                                disabled={
                                                    deletingId === location._id
                                                }
                                            >
                                                {deletingId === location._id
                                                    ? "Deleting..."
                                                    : "Delete"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Manage physical shelters */}
            {canManage && (
                <section
                    className="admin-panel admin-gis-list-panel"
                    id="admin-gis-shelter-form"
                >
                    <div className="admin-panel-heading">
                        <div>
                            <h2>Manage Shelters</h2>
                            <p>
                                Register and maintain physical animal shelters.
                                This is separate from animal intake records.
                            </p>
                        </div>
                    </div>

                    {shelterError && (
                        <div className="admin-gis-error">{shelterError}</div>
                    )}

                    {shelterSuccess && (
                        <div className="admin-gis-success">
                            {shelterSuccess}
                        </div>
                    )}

                    <form className="admin-gis-form" onSubmit={saveShelter}>
                        <label>
                            Shelter Name
                            <input
                                value={shelterForm.name}
                                onChange={(e) =>
                                    handleShelterFormChange("name", e.target.value)
                                }
                                required
                            />
                        </label>

                        <label>
                            Address
                            <input
                                value={shelterForm.address}
                                onChange={(e) =>
                                    handleShelterFormChange("address", e.target.value)
                                }
                                required
                            />
                        </label>

                        <label>
                            Latitude
                            <input
                                type="number"
                                step="any"
                                min="-90"
                                max="90"
                                value={shelterForm.latitude}
                                onChange={(e) =>
                                    handleShelterFormChange(
                                        "latitude",
                                        e.target.value
                                    )
                                }
                                required
                            />
                        </label>

                        <label>
                            Longitude
                            <input
                                type="number"
                                step="any"
                                min="-180"
                                max="180"
                                value={shelterForm.longitude}
                                onChange={(e) =>
                                    handleShelterFormChange(
                                        "longitude",
                                        e.target.value
                                    )
                                }
                                required
                            />
                        </label>

                        <label>
                            Contact Number
                            <input
                                type="tel"
                                value={shelterForm.contact}
                                onChange={(e) =>
                                    handleShelterFormChange("contact", e.target.value)
                                }
                            />
                        </label>

                        <label>
                            Email
                            <input
                                type="email"
                                value={shelterForm.email}
                                onChange={(e) =>
                                    handleShelterFormChange("email", e.target.value)
                                }
                            />
                        </label>

                        <label>
                            Status
                            <select
                                value={shelterForm.status}
                                onChange={(e) =>
                                    handleShelterFormChange("status", e.target.value)
                                }
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </label>

                        <label className="admin-gis-description-field">
                            Description
                            <textarea
                                value={shelterForm.description}
                                onChange={(e) =>
                                    handleShelterFormChange(
                                        "description",
                                        e.target.value
                                    )
                                }
                            />
                        </label>

                        <button type="submit" disabled={savingShelter}>
                            {savingShelter
                                ? "Saving..."
                                : editingShelterId
                                    ? "Save Shelter Changes"
                                    : "Register Shelter"}
                        </button>

                        {editingShelterId && (
                            <button
                                type="button"
                                onClick={cancelShelterEdit}
                                disabled={savingShelter}
                            >
                                Cancel Edit
                            </button>
                        )}
                    </form>

                    <div className="admin-panel-heading">
                        <h3>Registered Shelters</h3>
                        <button
                            type="button"
                            onClick={loadShelters}
                            disabled={shelterLoading}
                        >
                            Refresh
                        </button>
                    </div>

                    {shelterLoading ? (
                        <div>Loading shelters...</div>
                    ) : shelters.length === 0 ? (
                        <div>No shelters registered yet.</div>
                    ) : (
                        <div className="admin-gis-list">
                            {shelters.map((shelter) => (
                                <article
                                    className="admin-gis-row"
                                    key={shelter._id}
                                >
                                    <div>
                                        <h3>{shelter.name}</h3>
                                        <p>{shelter.address}</p>
                                        <small>
                                            Lat: {shelter.latitude} • Lng:{" "}
                                            {shelter.longitude}
                                        </small>

                                        {shelter.contact && (
                                            <p>Contact: {shelter.contact}</p>
                                        )}

                                        {shelter.email && (
                                            <p>Email: {shelter.email}</p>
                                        )}

                                        {shelter.description && (
                                            <span>{shelter.description}</span>
                                        )}
                                    </div>

                                    <div className="admin-gis-actions">
                                        <span
                                            className={`admin-status-pill ${shelter.status}`}
                                        >
                                            {shelter.status}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => editShelter(shelter)}
                                            disabled={savingShelter}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleShelterStatus(shelter)
                                            }
                                            disabled={
                                                changingShelterId === shelter._id
                                            }
                                        >
                                            {changingShelterId === shelter._id
                                                ? "Updating..."
                                                : shelter.status === "active"
                                                    ? "Deactivate"
                                                    : "Activate"}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Nearest shelter finder */}
            <section className="admin-panel admin-nearest-shelter-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Find Nearest Shelter</h2>
                        <p>
                            Find active shelters using your current location
                            or enter coordinates manually.
                        </p>
                    </div>
                </div>

                {shelterError && (
                    <div className="admin-gis-error">{shelterError}</div>
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
                                onChange={(e) =>
                                    setManualLatitude(e.target.value)
                                }
                                required
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
                                onChange={(e) =>
                                    setManualLongitude(e.target.value)
                                }
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={shelterLoading || activeShelters.length === 0}
                        >
                            Find Nearest
                        </button>
                    </form>
                </div>

                {shelterLoading ? (
                    <div className="admin-gis-list">Loading shelters...</div>
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
                                    <span>{selectedShelter.description}</span>
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
                                        Search location:{" "}
                                        {userLocation.latitude.toFixed(6)},{" "}
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
                                Use your location or enter coordinates to
                                find nearby shelters.
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
                                        key={shelter._id}
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

            {/* Hotspot analysis */}
            {canManage && (
                <section className="admin-panel admin-gis-hotspot-panel">
                    <div className="admin-panel-heading">
                        <div>
                            <h2>Hotspot Analysis</h2>
                            <p>
                                Areas with the highest concentration of open
                                GIS reports.
                            </p>
                        </div>
                    </div>

                    {hotspotError && (
                        <div className="admin-gis-error">{hotspotError}</div>
                    )}

                    {hotspotLoading ? (
                        <div>Loading hotspot analysis...</div>
                    ) : hotspots.length === 0 ? (
                        <div>
                            No open GIS reports available for hotspot analysis.
                        </div>
                    ) : (
                        <div className="admin-gis-hotspot-list">
                            {hotspots.slice(0, 5).map((hotspot, index) => (
                                <article
                                    className="admin-gis-hotspot-row"
                                    key={`${hotspot.latCell}:${hotspot.lngCell}`}
                                >
                                    <div>
                                        <strong>Hotspot #{index + 1}</strong>
                                        <p>
                                            Latitude:{" "}
                                            {Number(hotspot.latitude).toFixed(5)}
                                            <br />
                                            Longitude:{" "}
                                            {Number(hotspot.longitude).toFixed(5)}
                                        </p>
                                    </div>

                                    <div>
                                        <strong>{hotspot.count}</strong>
                                        <span>Reports</span>
                                    </div>

                                    <div>
                                        <small>Lost: {hotspot.lost}</small>
                                        <small>Found: {hotspot.found}</small>
                                        <small>Stray: {hotspot.stray}</small>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </section>
    );
}