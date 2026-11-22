import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { searchCebuPlaces } from "../../utils/cebuPlaces";
import { notifyError } from "../../utils/dialogs";

// Map pin picker: search a place in Cebu, tap the map, or use my location.
// Same look as the Lost & Found report map (lfr2-map, styles/admin/LostFound.css).
// latitude / longitude: numbers or null. onPinChange(latitude, longitude) gets null, null when cleared.
// onPlaceFound(text): a readable place name for the picked point, so the parent can fill an empty location box.

const CEBU_CENTER = [10.3157, 123.8854];
const MIN_SEARCH_LENGTH = 3;

const PIN_ICON = L.divIcon({
    className: "lfr-pin",
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
    }, [latitude, longitude]); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
}

async function lookUpPlaceName(latitude, longitude) {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${latitude}&lon=${longitude}`);
    const data = await response.json();
    const address = data.address || {};
    return [address.road || address.neighbourhood || data.name, address.suburb || address.village || address.quarter, address.city || address.town || address.municipality]
        .filter(Boolean)
        .filter((part, index, parts) => parts.indexOf(part) === index)
        .join(", ");
}

export default function LocationPicker({ latitude, longitude, onPinChange, onPlaceFound }) {
    const [placeSearch, setPlaceSearch] = useState("");
    const [placeResults, setPlaceResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isResultListOpen, setIsResultListOpen] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const hasPin = latitude !== null && longitude !== null;

    useEffect(() => {
        const query = placeSearch.trim();
        if (query.length < MIN_SEARCH_LENGTH) return undefined;

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                setPlaceResults(await searchCebuPlaces(query, controller.signal));
            } catch (error) {
                if (error.name !== "AbortError") setPlaceResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [placeSearch]);

    function dropPin(pinLatitude, pinLongitude) {
        onPinChange(Number(pinLatitude.toFixed(6)), Number(pinLongitude.toFixed(6)));
    }

    async function dropPinAndNamePlace(pinLatitude, pinLongitude) {
        dropPin(pinLatitude, pinLongitude);
        try {
            const placeName = await lookUpPlaceName(pinLatitude, pinLongitude);
            if (placeName) onPlaceFound(placeName);
        } catch {
            // The name is a nice-to-have; the pin is already set
        }
    }

    function pickSearchResult(place) {
        dropPin(place.latitude, place.longitude);
        setPlaceSearch(place.name);
        setIsResultListOpen(false);
        onPlaceFound([place.name, place.area].filter(Boolean).join(", "));
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
                dropPinAndNamePlace(position.coords.latitude, position.coords.longitude);
            },
            () => {
                setIsLocating(false);
                notifyError("Couldn't get your location. Allow location access, or tap the map to drop a pin.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }

    return (
        <>
            <div className="lfr2-map">
                <MapContainer center={hasPin ? [latitude, longitude] : CEBU_CENTER} zoom={14} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <DropPinOnClick onPick={dropPinAndNamePlace} />
                    <FollowPin latitude={latitude} longitude={longitude} />
                    {hasPin && <Marker position={[latitude, longitude]} icon={PIN_ICON} />}
                </MapContainer>

                <button
                    type="button"
                    className={`lfr2-locate${isLocating ? " is-busy" : ""}`}
                    onClick={pinMyLocation}
                    disabled={isLocating}
                    title="Pin my current location"
                    aria-label="Pin my current location"
                >
                    <img src="/gis/icon-find-nearest.svg" alt="" />
                </button>

                <div className="lfr2-map-search">
                    <input
                        type="search"
                        value={placeSearch}
                        aria-label="Search a place"
                        placeholder="Search a place in Cebu…"
                        onChange={(event) => {
                            setPlaceSearch(event.target.value);
                            setIsResultListOpen(true);
                            if (event.target.value.trim().length < MIN_SEARCH_LENGTH) setPlaceResults([]);
                        }}
                        onFocus={() => setIsResultListOpen(true)}
                        onBlur={() => setTimeout(() => setIsResultListOpen(false), 150)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault(); // stops the form from submitting
                                if (placeResults[0]) pickSearchResult(placeResults[0]);
                            }
                            if (event.key === "Escape") setIsResultListOpen(false);
                        }}
                    />
                    {isResultListOpen && placeSearch.trim().length >= MIN_SEARCH_LENGTH && (
                        <ul className="gm-map-results">
                            {isSearching && placeResults.length === 0 && <li className="is-note">Searching…</li>}
                            {!isSearching && placeResults.length === 0 && <li className="is-note">No places found in Cebu.</li>}
                            {placeResults.map((place) => (
                                <li key={place.id}>
                                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => pickSearchResult(place)}>
                                        <b>{place.name}</b>
                                        {place.area && <small>{place.area}</small>}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <small className="lfr2-coord">
                {hasPin ? `Pinned at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : "No pin yet (optional)"}
                {" · "}
                <button type="button" className="lfr2-link" onClick={pinMyLocation} disabled={isLocating}>
                    {isLocating ? "Getting your location…" : "Use my location"}
                </button>
                {hasPin && (
                    <>
                        {" · "}
                        <button type="button" className="lfr2-link" onClick={() => onPinChange(null, null)}>
                            Clear pin
                        </button>
                    </>
                )}
            </small>
        </>
    );
}
