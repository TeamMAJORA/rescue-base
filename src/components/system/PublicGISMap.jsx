import { useEffect, useState } from "react";
import {
    MapContainer, Marker, Popup, TileLayer
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API = import.meta.env.VITE_BACKEND_URL;

const cebuCenter = [
    10.3157,
    123.8854,
];

const markerIcon = L.divIcon({
    className: "public-gis-marker",
    html: "📍",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
});

export default function PublicGISMap() {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadPublicLocations() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(`${API}/api/gis/public`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to load public GIS locations");
                }

                setLocations(data.locations || []);
            } catch (error) {
                console.error("Public GIS Error: ", error);
                setError(error.message || "Unable to load the map.");
            } finally {
                setLoading(false);
            }
        }

        loadPublicLocations();
    }, []);

    return (
        <section className="public-gis-section">
            <div className="public-gis-heading">
                <h2>
                    Lost & Found Map
                </h2>

                <p>
                    View reported lost,
                    found, and stray
                    animals around the
                    community.
                </p>
            </div>

            {loading && (
                <div className="public-gis-loading">
                    Loading map...
                </div>
            )}

            {error && (
                <div className="public-gis-error">
                    {error}
                </div>
            )}

            {!loading &&
                !error && (
                    <div className="public-gis-map-wrap">
                        <MapContainer
                            center={
                                cebuCenter
                            }
                            zoom={11}
                            scrollWheelZoom={
                                true
                            }
                            className="public-gis-map"
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

                                            {
                                                location.description
                                            }
                                        </Popup>
                                    </Marker>
                                )
                            )}
                        </MapContainer>
                    </div>
                )}
        </section>
    );
}