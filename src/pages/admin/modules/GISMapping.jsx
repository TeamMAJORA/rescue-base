
import { useEffect, useMemo, useState } from "react";
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    Circle,
    Tooltip,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import assets from "../../../data/assets.json";


// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

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

// ---------------------------
// Staff/Admin map icons (SVGs in public/gis)
// ---------------------------
const gisIcon = (file, size, anchor) =>
    L.icon({
        iconUrl: `/gis/${file}`,
        iconSize: size,
        iconAnchor: anchor || [size[0] / 2, size[1] / 2],
        popupAnchor: [0, -(anchor ? anchor[1] : size[1] / 2) + 4],
    });

const GM_ICONS = {
    shelter: gisIcon("shelter-pin.svg", [34, 44], [17, 44]),
    stray: gisIcon("stray-marker.svg", [26, 26]),
    lost: gisIcon("lost-pet-marker.svg", [26, 26]),
    found: gisIcon("found-pet-marker.svg", [26, 26]),
    resolved: gisIcon("stray-marker-resolved.svg", [24, 24]),
    newPin: gisIcon("new-sighting-pin.svg", [36, 48], [18, 48]),
    me: gisIcon("user-location-dot.svg", [22, 22]),
    rescued: L.divIcon({
        className: "gm-rescued-icon",
        html: '<span></span>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    }),
};

function reportIcon(location) {
    if (location.status === "resolved") return GM_ICONS.resolved;
    if (location.reportType === "lost") return GM_ICONS.lost;
    if (location.reportType === "found") return GM_ICONS.found;
    return GM_ICONS.stray;
}

const TYPE_LABEL = {
    stray: "Stray",
    lost: "Lost",
    found: "Found",
    rescue: "Rescue",
    intake: "Intake",
};

const SPECIES_LABEL = {
    dog: "dog",
    cat: "cat",
    other: "animal",
    unknown: "animal",
};

function timeAgo(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

// Turns coordinates into a short place name (OpenStreetMap Nominatim)
async function reverseGeocode(latitude, longitude) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        const a = data.address || {};
        const street = a.road || a.pedestrian || a.neighbourhood || "";
        const area = a.suburb || a.village || a.quarter || a.city_district || "";
        const city = a.city || a.town || a.municipality || "";
        const main = [street, area].filter(Boolean).join(", ");
        return {
            name: main || data.name || `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`,
            city,
        };
    } catch {
        return {
            name: `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`,
            city: "",
        };
    }
}

// Lets the form pick a spot by clicking the map
function GmMapClicker({ active, onPick }) {
    useMapEvents({
        click(event) {
            if (active) onPick(event.latlng.lat, event.latlng.lng);
        },
    });
    return null;
}

// Moves the map when a new focus point is set
function GmFlyTo({ target }) {
    const map = useMap();
    useEffect(() => {
        if (target) map.flyTo([target.latitude, target.longitude], target.zoom || 15, { duration: 0.8 });
    }, [target, map]);
    return null;
}

const emptyGmReport = {
    reportType: "stray",
    species: "dog",
    petName: "",
    description: "",
    status: "open",
    where: "me",
    latitude: null,
    longitude: null,
    placeName: "",
    placeCity: "",
};

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

    // ---------------------------
    // Staff/Admin redesigned view state
    // ---------------------------
    const [gmPanel, setGmPanel] = useState("list"); // list | report | shelter | nearest
    const [gmTab, setGmTab] = useState("reports"); // reports | hotspots | shelters
    const [gmStatus, setGmStatus] = useState("open");
    const [gmType, setGmType] = useState("all");
    const [gmSpecies, setGmSpecies] = useState({ dog: true, cat: true });
    const [gmShowRescued, setGmShowRescued] = useState(false);
    const [gmAnimals, setGmAnimals] = useState([]);
    const [gmMyLoc, setGmMyLoc] = useState(null);
    const [gmFocus, setGmFocus] = useState(null);
    const [gmReport, setGmReport] = useState({ ...emptyGmReport });
    const [gmShelterWhere, setGmShelterWhere] = useState("pin");
    const [gmLocating, setGmLocating] = useState(false);

    const gmPinActive =
        (gmPanel === "report" && gmReport.where === "pin") ||
        gmPanel === "shelter";

    const gmFiltered = useMemo(
        () =>
            locations.filter((item) => {
                if (gmStatus !== "all" && item.status !== gmStatus) return false;
                if (gmType !== "all" && item.reportType !== gmType) return false;
                if (item.species === "dog" && !gmSpecies.dog) return false;
                if (item.species === "cat" && !gmSpecies.cat) return false;
                return true;
            }),
        [locations, gmStatus, gmType, gmSpecies]
    );

    const gmStats = useMemo(() => {
        const open = locations.filter((item) => item.status === "open");
        return {
            total: locations.length,
            strays: open.filter((item) => item.reportType === "stray").length,
            lost: open.filter((item) => item.reportType === "lost").length,
            found: open.filter((item) => item.reportType === "found").length,
        };
    }, [locations]);

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

        if (!await askConfirm({ title: `Delete "${label}"?`, message: "This can't be undone.", confirmLabel: "Delete", danger: true })) {
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
            return true;
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
            !await askConfirm({ title: `${nextStatus === "active" ? "Activate" : "Deactivate"} "${shelter.name}"?`, confirmLabel: nextStatus === "active" ? "Activate" : "Deactivate", danger: nextStatus !== "active" })
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

    // ---------------------------
    // Staff/Admin redesigned view logic
    // ---------------------------

    async function loadGmAnimals() {
        try {
            const response = await fetch(`${API}/api/animals`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await readResponse(response, "Failed to load animals.");
            setGmAnimals(Array.isArray(data.animals) ? data.animals : []);
        } catch (err) {
            console.error("Load animals for GIS error:", err);
            setGmAnimals([]);
        }
    }

    useEffect(() => {
        if (["admin", "staff"].includes(userRole)) {
            loadGmAnimals(); // eslint-disable-line react-hooks/set-state-in-effect -- load data on open
        }
    }, [userRole]);

    // Animals linked to a shelter by its name in the animal's location field
    function shelterCounts(shelter) {
        const name = String(shelter.name || "").trim().toLowerCase();
        if (!name) return null;
        const mine = gmAnimals.filter((animal) =>
            String(animal.location || "").toLowerCase().includes(name)
        );
        if (mine.length === 0) return null;
        const available = mine.filter(
            (animal) =>
                animal.availabilityStatus === "available" &&
                animal.adoptionStatus !== "adopted" &&
                animal.fosterStatus !== "in_foster"
        );
        return {
            dogs: available.filter((animal) => animal.type === "Dog").length,
            cats: available.filter((animal) => animal.type === "Cat").length,
            inFoster: mine.filter((animal) => animal.fosterStatus === "in_foster").length,
        };
    }

    function gmLocate(onFound, onFail) {
        setError("");
        if (!navigator.geolocation) {
            setError("Your browser can't share your location. Pin the spot on the map instead.");
            return;
        }
        setGmLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const spot = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: Math.round(position.coords.accuracy || 0),
                };
                setGmLocating(false);
                setGmMyLoc(spot);
                setGmFocus({ ...spot, zoom: 16 });
                if (onFound) onFound(spot);
            },
            () => {
                setGmLocating(false);
                setError("Couldn't get your location. Allow location access, or pin the spot on the map.");
                if (onFail) onFail();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }

    async function gmSetReportSpot(latitude, longitude, where) {
        setGmReport((current) => ({ ...current, where, latitude, longitude, placeName: "Finding address...", placeCity: "" }));
        const place = await reverseGeocode(latitude, longitude);
        setGmReport((current) =>
            current.latitude === latitude && current.longitude === longitude
                ? { ...current, placeName: place.name, placeCity: place.city }
                : current
        );
    }

    async function gmSetShelterSpot(latitude, longitude) {
        setShelterForm((current) => ({ ...current, latitude: String(latitude), longitude: String(longitude) }));
        const place = await reverseGeocode(latitude, longitude);
        setShelterForm((current) =>
            current.address ? current : { ...current, address: [place.name, place.city].filter(Boolean).join(", ") }
        );
    }

    function gmMapPick(latitude, longitude) {
        if (gmPanel === "report") gmSetReportSpot(latitude, longitude, "pin");
        if (gmPanel === "shelter") gmSetShelterSpot(latitude, longitude);
    }

    function gmOpenReport() {
        setError("");
        setSuccess("");
        setEditingLocationId(null);
        setGmReport({ ...emptyGmReport });
        setGmPanel("report");
        gmLocate(
            (spot) => gmSetReportSpot(spot.latitude, spot.longitude, "me"),
            () => setGmReport((current) => ({ ...current, where: "pin" }))
        );
    }

    function gmEditReport(location) {
        setError("");
        setSuccess("");
        setEditingLocationId(location._id);
        setGmReport({
            reportType: location.reportType || "stray",
            species: location.species || "unknown",
            petName: location.petName || "",
            description: location.description || "",
            status: location.status || "open",
            where: "pin",
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            placeName: location.locationName || "",
            placeCity: "",
        });
        setGmFocus({ latitude: Number(location.latitude), longitude: Number(location.longitude), zoom: 16 });
        setGmPanel("report");
    }

    function gmChooseWhere(where) {
        if (where === "me") {
            gmLocate(
                (spot) => gmSetReportSpot(spot.latitude, spot.longitude, "me"),
                () => setGmReport((current) => ({ ...current, where: "pin" }))
            );
        } else {
            setError("");
            setGmReport((current) => ({ ...current, where: "pin" }));
        }
    }

    function gmClosePanel() {
        setError("");
        setGmPanel("list");
        setEditingLocationId(null);
        setEditingShelterId(null);
        setShelterForm({ ...emptyShelterForm });
    }

    async function gmSubmitReport(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!validCoordinates(gmReport.latitude, gmReport.longitude)) {
            setError("Choose a location first: use your location or tap the map.");
            return;
        }

        const speciesWord = SPECIES_LABEL[gmReport.species] || "animal";
        const isEditing = Boolean(editingLocationId);
        const body = {
            petName: gmReport.petName.trim() || `Unknown ${speciesWord}`,
            reportType: gmReport.reportType,
            species: gmReport.species,
            locationName: gmReport.placeName.trim() || "Pinned location",
            latitude: Number(gmReport.latitude),
            longitude: Number(gmReport.longitude),
            status: gmReport.status,
            description: gmReport.description.trim(),
        };

        try {
            setSubmitting(true);
            const response = await fetch(
                isEditing ? `${API}/api/gis/${editingLocationId}` : `${API}/api/gis`,
                {
                    method: isEditing ? "PATCH" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getToken()}`,
                    },
                    body: JSON.stringify(body),
                }
            );
            await readResponse(response, isEditing ? "Failed to update the report." : "Failed to save the report.");
            setSuccess(isEditing ? "Report updated." : "Report pinned on the map.");
            setEditingLocationId(null);
            setGmReport({ ...emptyGmReport });
            setGmPanel("list");
            await loadLocations(userRole);
            await loadHotspots();
        } catch (err) {
            console.error("Save map report error:", err);
            setError(err.message || "Failed to save the report.");
        } finally {
            setSubmitting(false);
        }
    }

    function gmOpenShelter(shelter) {
        setShelterError("");
        setShelterSuccess("");
        if (shelter) {
            editShelter(shelter);
            setGmFocus({ latitude: Number(shelter.latitude), longitude: Number(shelter.longitude), zoom: 16 });
        } else {
            setEditingShelterId(null);
            setShelterForm({ ...emptyShelterForm });
        }
        setGmShelterWhere("pin");
        setGmPanel("shelter");
    }

    function gmShelterUseMe() {
        setGmShelterWhere("me");
        gmLocate((spot) => gmSetShelterSpot(spot.latitude, spot.longitude));
    }

    async function gmSaveShelter(event) {
        const saved = await saveShelter(event);
        if (saved) {
            setGmPanel("list");
            setGmTab("shelters");
        }
    }

    function gmOpenNearest() {
        setGmPanel("nearest");
        setShelterError("");
        gmLocate((spot) => findNearestShelters(spot.latitude, spot.longitude));
    }

    const gmShelterDraft = validCoordinates(shelterForm.latitude, shelterForm.longitude)
        ? [Number(shelterForm.latitude), Number(shelterForm.longitude)]
        : null;

    const gmRescued = gmShowRescued
        ? gmAnimals.filter(
            (animal) =>
                animal.intakeStatus !== "rejected" &&
                validCoordinates(animal.latitude, animal.longitude)
        )
        : [];

    // ---------------------------
    // Staff/Admin redesigned view (volunteers keep the view below)
    // ---------------------------
    if (canManage) {
        const reportTypes = ["stray", "lost", "found", "rescue", "intake"];

        return (
            <section className="gm-page">
                <div className="gm-toolbar">
                    <p>Strays, lost and found reports, hotspots and shelters.</p>
                    <div className="gm-toolbar-actions">
                        <button type="button" className="gm-btn gm-btn-ghost" onClick={gmOpenNearest}>
                            <img src="/gis/icon-find-nearest.svg" alt="" className="gm-btn-icon" />
                            Find nearest shelter
                        </button>
                        <button type="button" className="gm-btn gm-btn-ghost" onClick={() => gmOpenShelter(null)}>
                            <img src="/gis/icon-add-shelter.svg" alt="" className="gm-btn-icon" />
                            Add shelter
                        </button>
                        <button type="button" className="gm-btn gm-btn-orange" onClick={gmOpenReport}>
                            Pin a report
                        </button>
                    </div>
                </div>

                {error && <div className="admin-gis-error">{error}</div>}
                {success && <div className="admin-gis-success">{success}</div>}

                <div className="um-strip">
                    <div className="um-strip-total">
                        <b>{gmStats.total}</b>
                        <small>Total map reports</small>
                    </div>
                    <div>
                        <small>Open strays</small>
                        <b>{gmStats.strays}</b>
                    </div>
                    <div>
                        <small>Open lost / found</small>
                        <b>{gmStats.lost} / {gmStats.found}</b>
                    </div>
                    <div>
                        <small>Hotspots</small>
                        <b>{hotspots.length}</b>
                    </div>
                </div>

                <div className="gm-grid">
                    {/* Map */}
                    <div className={`gm-map-wrap${gmPinActive ? " is-picking" : ""}`}>
                        <MapContainer center={cebuCenter} zoom={13} scrollWheelZoom className="gm-map">
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <GmMapClicker active={gmPinActive} onPick={gmMapPick} />
                            <GmFlyTo target={gmFocus} />

                            {hotspots.map((hotspot, index) => (
                                <Circle
                                    key={`gm-hot-${index}`}
                                    center={[Number(hotspot.latitude), Number(hotspot.longitude)]}
                                    radius={500}
                                    pathOptions={{ color: "#d62828", weight: 2, dashArray: "6 5", fillColor: "#d62828", fillOpacity: 0.16 }}
                                >
                                    <Tooltip direction="top" permanent className="gm-hot-label">
                                        {(hotspot.areaName || `Hotspot ${index + 1}`)} · {hotspot.count}
                                    </Tooltip>
                                </Circle>
                            ))}

                            {gmFiltered
                                .filter((item) => validCoordinates(item.latitude, item.longitude))
                                .map((location) => (
                                    <Marker
                                        key={`gm-report-${location._id}`}
                                        position={[Number(location.latitude), Number(location.longitude)]}
                                        icon={reportIcon(location)}
                                    >
                                        <Popup>
                                            <strong>
                                                {TYPE_LABEL[location.reportType] || "Report"} {SPECIES_LABEL[location.species] || "animal"}
                                                {location.locationName ? ` · ${location.locationName}` : ""}
                                            </strong>
                                            <br />
                                            {location.status === "open" ? "Open" : "Resolved"} · {timeAgo(location.createdAt)}
                                            {location.description && (<><br />{location.description}</>)}
                                            {location.status === "open" && (
                                                <>
                                                    <br />
                                                    <button type="button" className="gm-link" onClick={() => handleResolveLocation(location._id)}>
                                                        Resolve
                                                    </button>
                                                </>
                                            )}
                                        </Popup>
                                    </Marker>
                                ))}

                            {activeShelters
                                .filter((item) => validCoordinates(item.latitude, item.longitude))
                                .map((shelter) => {
                                    const counts = shelterCounts(shelter);
                                    return (
                                        <Marker
                                            key={`gm-shelter-${shelter._id}`}
                                            position={[Number(shelter.latitude), Number(shelter.longitude)]}
                                            icon={GM_ICONS.shelter}
                                        >
                                            <Popup>
                                                <strong>{shelter.name}</strong>
                                                <br />
                                                {counts
                                                    ? `${counts.dogs} dogs · ${counts.cats} cats available · ${counts.inFoster} in foster`
                                                    : shelter.address}
                                                <br />
                                                <button type="button" className="gm-link" onClick={() => gmOpenShelter(shelter)}>
                                                    Edit shelter
                                                </button>
                                            </Popup>
                                        </Marker>
                                    );
                                })}

                            {gmRescued.map((animal) => (
                                <Marker
                                    key={`gm-rescued-${animal._id}`}
                                    position={[Number(animal.latitude), Number(animal.longitude)]}
                                    icon={GM_ICONS.rescued}
                                >
                                    <Popup>
                                        <strong>{animal.name}</strong>
                                        <br />
                                        Rescued from here
                                        {animal.intakeDate ? ` · ${new Date(animal.intakeDate).toLocaleDateString("en-PH")}` : ""}
                                    </Popup>
                                </Marker>
                            ))}

                            {gmMyLoc && (
                                <>
                                    <Circle
                                        center={[gmMyLoc.latitude, gmMyLoc.longitude]}
                                        radius={Math.max(gmMyLoc.accuracy, 20)}
                                        pathOptions={{ color: "#2563eb", weight: 1, fillColor: "#2563eb", fillOpacity: 0.12 }}
                                    />
                                    <Marker position={[gmMyLoc.latitude, gmMyLoc.longitude]} icon={GM_ICONS.me} />
                                </>
                            )}

                            {gmPanel === "report" && validCoordinates(gmReport.latitude, gmReport.longitude) && gmReport.where === "pin" && (
                                <Marker position={[gmReport.latitude, gmReport.longitude]} icon={GM_ICONS.newPin} />
                            )}

                            {gmPanel === "shelter" && gmShelterDraft && (
                                <Marker position={gmShelterDraft} icon={GM_ICONS.shelter} />
                            )}
                        </MapContainer>

                        {gmPinActive && (
                            <div className="gm-map-hint">
                                {gmPanel === "shelter" ? "Tap the map to place the shelter" : "Tap the map to drop a pin"}
                            </div>
                        )}

                        <button
                            type="button"
                            className={`gm-locate${gmMyLoc ? " is-on" : ""}`}
                            onClick={() => gmLocate()}
                            title="Show my location"
                            aria-label="Show my location"
                        >
                            <img src="/gis/icon-find-nearest.svg" alt="" />
                        </button>

                        <div className="gm-legend">
                            <div><img src="/gis/shelter-pin.svg" alt="" /> Shelter</div>
                            <div><img src="/gis/stray-marker.svg" alt="" /> Stray</div>
                            <div><img src="/gis/lost-pet-marker.svg" alt="" /> Lost pet</div>
                            <div><img src="/gis/found-pet-marker.svg" alt="" /> Found pet</div>
                            <div><img src="/gis/stray-marker-resolved.svg" alt="" /> Resolved</div>
                            {gmShowRescued && <div><span className="gm-diamond" /> Rescued from</div>}
                            <div><span className="gm-hot-dot" /> Hotspot (500 m)</div>
                        </div>

                        {loading && <div className="admin-gis-map-loading">Loading map reports...</div>}
                    </div>

                    {/* Side panel */}
                    <div className="gm-side">
                        {gmPanel === "list" && (
                            <>
                                <div className="gm-card">
                                    <div className="gm-tabs">
                                        {["reports", "hotspots", "shelters"].map((tab) => (
                                            <button
                                                key={tab}
                                                type="button"
                                                className={gmTab === tab ? "is-active" : ""}
                                                onClick={() => setGmTab(tab)}
                                            >
                                                {tab[0].toUpperCase() + tab.slice(1)}
                                            </button>
                                        ))}
                                    </div>

                                    {gmTab === "reports" && (
                                        <>
                                            <div className="gm-filters">
                                                <label className="gm-select">
                                                    <span>Status</span>
                                                    <select value={gmStatus} onChange={(e) => setGmStatus(e.target.value)}>
                                                        <option value="open">Open</option>
                                                        <option value="resolved">Resolved</option>
                                                        <option value="all">All</option>
                                                    </select>
                                                </label>
                                                <label className="gm-select">
                                                    <span>Type</span>
                                                    <select value={gmType} onChange={(e) => setGmType(e.target.value)}>
                                                        <option value="all">All types</option>
                                                        <option value="stray">Strays</option>
                                                        <option value="lost">Lost pets</option>
                                                        <option value="found">Found pets</option>
                                                        <option value="rescue">Rescue</option>
                                                        <option value="intake">Intake</option>
                                                    </select>
                                                </label>
                                                <div className="gm-chips">
                                                    {["dog", "cat"].map((kind) => (
                                                        <button
                                                            key={kind}
                                                            type="button"
                                                            className={gmSpecies[kind] ? "is-active" : ""}
                                                            onClick={() => setGmSpecies((current) => ({ ...current, [kind]: !current[kind] }))}
                                                        >
                                                            {kind === "dog" ? "Dogs" : "Cats"}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="gm-list">
                                                {loading ? (
                                                    <p className="gm-empty">Loading reports...</p>
                                                ) : gmFiltered.length === 0 ? (
                                                    <p className="gm-empty">No reports match these filters.</p>
                                                ) : (
                                                    gmFiltered.map((location) => (
                                                        <article className="gm-row" key={location._id}>
                                                            <img src={reportIcon(location).options.iconUrl} alt="" className="gm-row-icon" />
                                                            <button
                                                                type="button"
                                                                className="gm-row-text"
                                                                onClick={() => setGmFocus({ latitude: Number(location.latitude), longitude: Number(location.longitude), zoom: 17 })}
                                                            >
                                                                <b>
                                                                    {TYPE_LABEL[location.reportType] || "Report"} {SPECIES_LABEL[location.species] || "animal"}
                                                                    {location.reportType === "lost" && location.petName && !location.petName.startsWith("Unknown") ? ` "${location.petName}"` : ""}
                                                                    {location.locationName ? ` · ${location.locationName.split(",")[0]}` : ""}
                                                                </b>
                                                                <span>
                                                                    {location.description ? `${location.description} · ` : ""}
                                                                    {location.createdByName ? `by ${location.createdByName}${location.createdBy?.role ? ` (${location.createdBy.role[0].toUpperCase()}${location.createdBy.role.slice(1)})` : ""} · ` : ""}
                                                                    {timeAgo(location.createdAt)}
                                                                </span>
                                                            </button>
                                                            <div className="gm-row-actions">
                                                                {location.status === "open" ? (
                                                                    <button type="button" className="gm-mini" onClick={() => handleResolveLocation(location._id)}>
                                                                        Resolve
                                                                    </button>
                                                                ) : (
                                                                    <span className="gm-mini is-done">Resolved</span>
                                                                )}
                                                                <span className="gm-row-links">
                                                                    <button type="button" className="gm-link" onClick={() => gmEditReport(location)}>Edit</button>
                                                                    <button
                                                                        type="button"
                                                                        className="gm-link gm-link-danger"
                                                                        onClick={() => handleDeleteLocation(location)}
                                                                        disabled={deletingId === location._id}
                                                                    >
                                                                        {deletingId === location._id ? "Deleting..." : "Delete"}
                                                                    </button>
                                                                </span>
                                                            </div>
                                                        </article>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {gmTab === "hotspots" && (
                                        <div className="gm-list">
                                            {hotspotError && <div className="admin-gis-error">{hotspotError}</div>}
                                            {hotspotLoading ? (
                                                <p className="gm-empty">Loading hotspots...</p>
                                            ) : hotspots.length === 0 ? (
                                                <p className="gm-empty">No hotspots yet. Hotspots need 2 or more open reports within 500 m.</p>
                                            ) : (
                                                hotspots.map((hotspot, index) => (
                                                    <button
                                                        type="button"
                                                        className="gm-hot-row"
                                                        key={`gm-hot-row-${index}`}
                                                        onClick={() => setGmFocus({ latitude: Number(hotspot.latitude), longitude: Number(hotspot.longitude), zoom: 15 })}
                                                    >
                                                        <div>
                                                            <b>{hotspot.areaName || `Hotspot ${index + 1}`}</b>
                                                            <span>
                                                                {["stray", "lost", "found", "rescue", "intake"]
                                                                    .filter((key) => hotspot[key])
                                                                    .map((key) => `${hotspot[key]} ${TYPE_LABEL[key].toLowerCase()}`)
                                                                    .join(" · ")}
                                                            </span>
                                                        </div>
                                                        <em>{hotspot.count} reports</em>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {gmTab === "shelters" && (
                                        <div className="gm-list">
                                            {shelterError && <div className="admin-gis-error">{shelterError}</div>}
                                            {shelterSuccess && <div className="admin-gis-success">{shelterSuccess}</div>}
                                            {shelterLoading ? (
                                                <p className="gm-empty">Loading shelters...</p>
                                            ) : shelters.length === 0 ? (
                                                <p className="gm-empty">No shelters yet. Use Add shelter to place one.</p>
                                            ) : (
                                                shelters.map((shelter) => (
                                                    <article className="gm-row" key={shelter._id}>
                                                        <img src="/gis/shelter-pin.svg" alt="" className="gm-row-icon" />
                                                        <button
                                                            type="button"
                                                            className="gm-row-text"
                                                            onClick={() => setGmFocus({ latitude: Number(shelter.latitude), longitude: Number(shelter.longitude), zoom: 16 })}
                                                        >
                                                            <b>{shelter.name}</b>
                                                            <span>{shelter.address}{shelter.status !== "active" ? " · Inactive" : ""}</span>
                                                        </button>
                                                        <div className="gm-row-actions">
                                                            <button type="button" className="gm-link" onClick={() => gmOpenShelter(shelter)}>Edit</button>
                                                            <button
                                                                type="button"
                                                                className="gm-link"
                                                                onClick={() => toggleShelterStatus(shelter)}
                                                                disabled={changingShelterId === shelter._id}
                                                            >
                                                                {shelter.status === "active" ? "Deactivate" : "Activate"}
                                                            </button>
                                                        </div>
                                                    </article>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="gm-card">
                                    <h3>Top hotspots</h3>
                                    <p className="gm-sub">Open reports within 500 m of each other</p>
                                    {hotspots.slice(0, 3).map((hotspot, index) => (
                                        <div className="gm-hot-row is-static" key={`gm-top-${index}`}>
                                            <div>
                                                <b>{hotspot.areaName || `Hotspot ${index + 1}`}</b>
                                            </div>
                                            <em>{hotspot.count} reports</em>
                                        </div>
                                    ))}
                                    {!hotspotLoading && hotspots.length === 0 && (
                                        <p className="gm-empty">No hotspots yet.</p>
                                    )}
                                    <button type="button" className="gm-btn gm-btn-primary gm-block" onClick={loadHotspots} disabled={hotspotLoading}>
                                        {hotspotLoading ? "Analyzing..." : "Run hotspot analysis"}
                                    </button>
                                    <label className="gm-switch">
                                        <span>
                                            Show where animals were rescued
                                            <small>Staff &amp; admin only, from intake records</small>
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={gmShowRescued}
                                            onChange={(e) => setGmShowRescued(e.target.checked)}
                                        />
                                        <i aria-hidden="true" />
                                    </label>
                                </div>
                            </>
                        )}

                        {gmPanel === "report" && (
                            <form className="gm-card gm-form" onSubmit={gmSubmitReport}>
                                <div className="gm-card-head">
                                    <h3>{editingLocationId ? "Edit map report" : "New map report"}</h3>
                                    <button type="button" className="gm-close" onClick={gmClosePanel} aria-label="Close">&times;</button>
                                </div>

                                <div className="gm-seg gm-seg-5">
                                    {reportTypes.map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            className={gmReport.reportType === type ? "is-active" : ""}
                                            onClick={() => setGmReport((current) => ({ ...current, reportType: type }))}
                                        >
                                            {TYPE_LABEL[type]}
                                        </button>
                                    ))}
                                </div>

                                <span className="gm-label">Where?</span>
                                <div className="gm-where">
                                    <button
                                        type="button"
                                        className={gmReport.where === "me" ? "is-me" : ""}
                                        onClick={() => gmChooseWhere("me")}
                                    >
                                        <img src="/gis/icon-find-nearest.svg" alt="" />
                                        {gmLocating ? "Locating..." : "Use my location"}
                                    </button>
                                    <button
                                        type="button"
                                        className={gmReport.where === "pin" ? "is-pin" : ""}
                                        onClick={() => gmChooseWhere("pin")}
                                    >
                                        <img src="/gis/new-sighting-pin.svg" alt="" />
                                        Pin on map
                                    </button>
                                </div>
                                {validCoordinates(gmReport.latitude, gmReport.longitude) ? (
                                    <div className="gm-address">
                                        <img src={gmReport.where === "me" ? "/gis/user-location-dot.svg" : "/gis/new-sighting-pin.svg"} alt="" />
                                        <div>
                                            <input
                                                value={gmReport.placeName}
                                                onChange={(e) => setGmReport((current) => ({ ...current, placeName: e.target.value }))}
                                                aria-label="Place name"
                                            />
                                            <small>
                                                {gmReport.placeCity ? `${gmReport.placeCity} · ` : ""}
                                                {gmReport.where === "me" && gmMyLoc ? `accurate to about ${gmMyLoc.accuracy} m` : "Pinned on the map"}
                                            </small>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="gm-empty">
                                        {gmReport.where === "pin" ? "Tap the map where it happened." : "Getting your location..."}
                                    </p>
                                )}

                                <span className="gm-label">Animal</span>
                                <div className="gm-seg">
                                    {[["dog", "Dog"], ["cat", "Cat"], ["unknown", "Not sure"]].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className={gmReport.species === value ? "is-active" : ""}
                                            onClick={() => setGmReport((current) => ({ ...current, species: value }))}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {(gmReport.reportType === "lost" || gmReport.reportType === "found") && (
                                    <>
                                        <span className="gm-label">Pet name (optional)</span>
                                        <input
                                            className="gm-input"
                                            value={gmReport.petName}
                                            onChange={(e) => setGmReport((current) => ({ ...current, petName: e.target.value }))}
                                            placeholder="e.g. Bantay"
                                        />
                                    </>
                                )}

                                <span className="gm-label">What did you see?</span>
                                <textarea
                                    className="gm-input"
                                    rows={3}
                                    value={gmReport.description}
                                    onChange={(e) => setGmReport((current) => ({ ...current, description: e.target.value }))}
                                    placeholder="Color, size, condition, landmarks..."
                                />

                                <span className="gm-label">Status</span>
                                <div className="gm-seg">
                                    {[["open", "Open"], ["resolved", "Rescued now"]].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className={gmReport.status === value ? "is-active" : ""}
                                            onClick={() => setGmReport((current) => ({ ...current, status: value }))}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <p className="gm-note">"Rescued now" saves it as resolved, e.g. when staff pick the animal up on the spot.</p>

                                <button type="submit" className="gm-btn gm-btn-primary gm-block" disabled={submitting}>
                                    {submitting ? "Saving..." : editingLocationId ? "Save changes" : "Submit report"}
                                </button>
                            </form>
                        )}

                        {gmPanel === "shelter" && (
                            <form className="gm-card gm-form" onSubmit={gmSaveShelter}>
                                <div className="gm-card-head">
                                    <h3>{editingShelterId ? "Edit shelter" : "Add shelter"}</h3>
                                    <button type="button" className="gm-close" onClick={gmClosePanel} aria-label="Close">&times;</button>
                                </div>
                                <p className="gm-sub">It shows on the public map once saved and active.</p>

                                {shelterError && <div className="admin-gis-error">{shelterError}</div>}

                                <span className="gm-label">Shelter name</span>
                                <input
                                    className="gm-input"
                                    value={shelterForm.name}
                                    onChange={(e) => handleShelterFormChange("name", e.target.value)}
                                    required
                                />

                                <span className="gm-label">Location</span>
                                <div className="gm-where">
                                    <button type="button" className={gmShelterWhere === "me" ? "is-me" : ""} onClick={gmShelterUseMe}>
                                        <img src="/gis/icon-find-nearest.svg" alt="" />
                                        {gmLocating ? "Locating..." : "Use my location"}
                                    </button>
                                    <button type="button" className={gmShelterWhere === "pin" ? "is-pin" : ""} onClick={() => setGmShelterWhere("pin")}>
                                        <img src="/gis/new-sighting-pin.svg" alt="" />
                                        Pin on map
                                    </button>
                                </div>
                                <div className="gm-address">
                                    <img src="/gis/shelter-pin.svg" alt="" />
                                    <div>
                                        <input
                                            value={shelterForm.address}
                                            onChange={(e) => handleShelterFormChange("address", e.target.value)}
                                            placeholder="Tap the map, then check the address"
                                            aria-label="Shelter address"
                                            required
                                        />
                                        <small>
                                            {gmShelterDraft
                                                ? `${gmShelterDraft[0].toFixed(4)}, ${gmShelterDraft[1].toFixed(4)}`
                                                : "No spot yet. Tap the map to place it."}
                                        </small>
                                    </div>
                                </div>

                                <div className="gm-two">
                                    <label>
                                        <span className="gm-label">Contact number</span>
                                        <input className="gm-input" type="tel" value={shelterForm.contact} onChange={(e) => handleShelterFormChange("contact", e.target.value)} />
                                    </label>
                                    <label>
                                        <span className="gm-label">Email</span>
                                        <input className="gm-input" type="email" value={shelterForm.email} onChange={(e) => handleShelterFormChange("email", e.target.value)} />
                                    </label>
                                </div>

                                <span className="gm-label">Description</span>
                                <textarea
                                    className="gm-input"
                                    rows={2}
                                    value={shelterForm.description}
                                    onChange={(e) => handleShelterFormChange("description", e.target.value)}
                                />

                                <label className="gm-switch">
                                    <span>Active (show on public map)</span>
                                    <input
                                        type="checkbox"
                                        checked={shelterForm.status === "active"}
                                        onChange={(e) => handleShelterFormChange("status", e.target.checked ? "active" : "inactive")}
                                    />
                                    <i aria-hidden="true" />
                                </label>

                                <div className="gm-two">
                                    <button type="button" className="gm-btn gm-btn-ghost" onClick={gmClosePanel}>Cancel</button>
                                    <button type="submit" className="gm-btn gm-btn-primary" disabled={savingShelter}>
                                        {savingShelter ? "Saving..." : "Save shelter"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {gmPanel === "nearest" && (
                            <div className="gm-card">
                                <div className="gm-card-head">
                                    <h3>Nearest shelters</h3>
                                    <button type="button" className="gm-close" onClick={gmClosePanel} aria-label="Close">&times;</button>
                                </div>
                                <p className="gm-sub">
                                    {gmLocating ? "Getting your location..." : userLocation ? "From your current location" : "Allow location access to see the closest shelters."}
                                </p>
                                {shelterError && <div className="admin-gis-error">{shelterError}</div>}
                                {nearestShelters.slice(0, 5).map((shelter, index) => (
                                    <article className="gm-near-row" key={shelter._id}>
                                        <span className={`gm-rank${index === 0 ? " is-first" : ""}`}>{index + 1}</span>
                                        <div>
                                            <b>{shelter.name}</b>
                                            <span>{shelter.address}</span>
                                            <button
                                                type="button"
                                                className="gm-link"
                                                onClick={() => setGmFocus({ latitude: Number(shelter.latitude), longitude: Number(shelter.longitude), zoom: 16 })}
                                            >
                                                Show on map
                                            </button>
                                        </div>
                                        <em>{shelter.distance.toFixed(1)} km</em>
                                    </article>
                                ))}
                                {userLocation && nearestShelters.length === 0 && (
                                    <p className="gm-empty">No active shelters yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        );
    }

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
                                        key={`hotspot-map-${index}`}
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
                                    key={`hotspot-list-${index}`}
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
                                        <small>Rescue: {hotspot.rescue}</small>
                                        <small>Intake: {hotspot.intake}</small>
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