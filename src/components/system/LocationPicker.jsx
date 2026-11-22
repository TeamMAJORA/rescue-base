import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../styles/components/LocationPicker.css";
import { searchCebuPlaces } from "../../utils/cebuPlaces";
import { notifyError } from "../../utils/dialogs";

// Address box + map pin, used by every form that asks "where?" (Lost & Found, Intake, Donations drop-off, Rescue).
// Typing an address suggests Cebu places and pins the best match; picking one fills the box.
// Tapping the map, dragging the pin or "Use my location" moves the pin, and names the place only when the box is empty.
// latitude / longitude: numbers or null. onPinChange(latitude, longitude) gets null, null when cleared.

const CEBU_CENTER = [10.3157, 123.8854];
const MIN_SEARCH_LENGTH = 3;
const SEARCH_DELAY_MS = 600;
const ROUGH_ACCURACY_METERS = 50;

const PIN_ICON = L.divIcon({
    className: "location-picker-pin",
    html: "<span></span>",
    iconSize: [26, 34],
    iconAnchor: [13, 34],
});

function DropPinOnClick({ onPick }) {
    useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) });
    return null;
}

function FollowPin({ latitude, longitude }) {
    const map = useMap();
    useEffect(() => {
        if (latitude !== null && longitude !== null) map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
    }, [map, latitude, longitude]);
    return null;
}

async function lookUpPlaceName(latitude, longitude) {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${latitude}&lon=${longitude}`);
    const data = await response.json();
    const address = data.address || {};
    return [
        address.road || address.pedestrian || address.neighbourhood || data.name,
        address.suburb || address.village || address.quarter || address.hamlet,
        address.city || address.town || address.municipality,
    ]
        .filter(Boolean)
        .filter((part, index, parts) => parts.indexOf(part) === index)
        .join(", ");
}

function readableDistance(meters) {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

export default function LocationPicker({
    address,
    onAddressChange,
    latitude,
    longitude,
    onPinChange,
    ariaLabel = "Address",
    placeholder = "Type an address, e.g. Brgy. Lahug, Cebu City",
    required = false,
    requiredMessage,
    maxLength = 200,
    emptyHint = "No pin yet. Type an address or tap the map.",
}) {
    const [typedAddress, setTypedAddress] = useState("");
    const [placeResults, setPlaceResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isResultListOpen, setIsResultListOpen] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [locationAccuracyMeters, setLocationAccuracyMeters] = useState(null);

    const hasPin = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;

    // Only typing searches, so a pin from the map or "my location" never re-pins itself
    useEffect(() => {
        const query = typedAddress.trim();
        if (query.length < MIN_SEARCH_LENGTH) {
            setPlaceResults([]);
            return undefined;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const places = await searchCebuPlaces(query, controller.signal);
                setPlaceResults(places);
                if (places[0]) dropPin(places[0].latitude, places[0].longitude);
            } catch (error) {
                if (error.name !== "AbortError") setPlaceResults([]);
            } finally {
                setIsSearching(false);
            }
        }, SEARCH_DELAY_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [typedAddress]); // eslint-disable-line react-hooks/exhaustive-deps

    function dropPin(pinLatitude, pinLongitude, accuracyMeters = null) {
        setLocationAccuracyMeters(accuracyMeters);
        onPinChange(Number(Number(pinLatitude).toFixed(6)), Number(Number(pinLongitude).toFixed(6)));
    }

    async function dropPinAndNamePlace(pinLatitude, pinLongitude, accuracyMeters = null) {
        dropPin(pinLatitude, pinLongitude, accuracyMeters);
        if (address.trim()) return;
        try {
            const placeName = await lookUpPlaceName(pinLatitude, pinLongitude);
            if (placeName) onAddressChange(placeName);
        } catch {
            // The name is a nice-to-have; the pin is already set
        }
    }

    function pickPlace(place) {
        dropPin(place.latitude, place.longitude);
        onAddressChange([place.name, place.area].filter(Boolean).join(", "));
        setIsResultListOpen(false);
    }

    function clearPin() {
        setLocationAccuracyMeters(null);
        onPinChange(null, null);
    }

    function pinMyLocation() {
        if (!navigator.geolocation) {
            notifyError("Your browser can't share your location. Tap the map instead.");
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setIsLocating(false);
                dropPinAndNamePlace(position.coords.latitude, position.coords.longitude, Math.round(position.coords.accuracy || 0));
            },
            () => {
                setIsLocating(false);
                notifyError("Couldn't get your location. Allow location access, or tap the map to drop a pin.");
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }

    let pinStatus = emptyHint;
    if (hasPin) {
        pinStatus =
            locationAccuracyMeters > ROUGH_ACCURACY_METERS
                ? `Approximate (±${readableDistance(locationAccuracyMeters)}). Tap the exact spot.`
                : `Pinned at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. Drag the pin or tap the exact spot.`;
    }

    return (
        <div className="location-picker">
            <div className="location-picker-search">
                <input
                    type="search"
                    value={address}
                    aria-label={ariaLabel}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    autoComplete="off"
                    required={required}
                    data-required-message={requiredMessage}
                    onChange={(event) => {
                        onAddressChange(event.target.value);
                        setTypedAddress(event.target.value);
                        setIsResultListOpen(true);
                    }}
                    onFocus={() => setIsResultListOpen(true)}
                    onBlur={() => setTimeout(() => setIsResultListOpen(false), 150)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault(); // stops the form from submitting
                            if (placeResults[0]) pickPlace(placeResults[0]);
                        }
                        if (event.key === "Escape") setIsResultListOpen(false);
                    }}
                />
                {isResultListOpen && typedAddress.trim().length >= MIN_SEARCH_LENGTH && (
                    <ul className="gm-map-results">
                        {isSearching && placeResults.length === 0 && <li className="is-note">Searching…</li>}
                        {!isSearching && placeResults.length === 0 && <li className="is-note">No places found in Cebu. Tap the map instead.</li>}
                        {placeResults.map((place) => (
                            <li key={place.id}>
                                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => pickPlace(place)}>
                                    <b>{place.name}</b>
                                    {place.area && <small>{place.area}</small>}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="location-picker-map">
                <MapContainer center={hasPin ? [latitude, longitude] : CEBU_CENTER} zoom={hasPin ? 16 : 12} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <DropPinOnClick onPick={dropPinAndNamePlace} />
                    <FollowPin latitude={hasPin ? latitude : null} longitude={hasPin ? longitude : null} />
                    {hasPin && (
                        <Marker
                            position={[latitude, longitude]}
                            icon={PIN_ICON}
                            draggable
                            eventHandlers={{
                                dragend: (event) => {
                                    const point = event.target.getLatLng();
                                    dropPinAndNamePlace(point.lat, point.lng);
                                },
                            }}
                        />
                    )}
                </MapContainer>

                <button
                    type="button"
                    className={`location-picker-locate${isLocating ? " is-busy" : ""}`}
                    onClick={pinMyLocation}
                    disabled={isLocating}
                    title="Pin my current location"
                    aria-label="Pin my current location"
                >
                    <img src="/gis/icon-find-nearest.svg" alt="" />
                </button>
            </div>

            <small className="location-picker-status">
                {pinStatus}
                {" · "}
                <button type="button" className="lfr2-link" onClick={pinMyLocation} disabled={isLocating}>
                    {isLocating ? "Getting your location…" : "Use my location"}
                </button>
                {hasPin && (
                    <>
                        {" · "}
                        <button type="button" className="lfr2-link" onClick={clearPin}>
                            Clear pin
                        </button>
                    </>
                )}
            </small>
        </div>
    );
}
