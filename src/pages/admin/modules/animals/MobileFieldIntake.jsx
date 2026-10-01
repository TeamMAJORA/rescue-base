import { useState } from "react";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api/animals`;

const INITIAL_FORM = {
    animalName: "",
    animalType: "Dog",
    intakeType: "Rescued",
    condition: "Healthy",
    rescueLocation: "",
    latitude: "",
    longitude: "",
    notes: "",
};

export default function MobileFieldIntake() {
    const [form, setForm] = useState(INITIAL_FORM);
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    function updateField(name, value) {
        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function getCurrentLocation() {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by this browser.");
            return;
        }

        setError("");
        setMessage("Retrieving current location...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setForm((previous) => ({
                    ...previous,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6),
                }));

                setMessage("Current location captured.");
            },
            () => {
                setError(
                    "Unable to retrieve location. Please allow location access."
                );
                setMessage("");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }

    function getToken() {
        return (
            localStorage.getItem("token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("authToken")
        );
    }

    function getCurrentUser() {
        try {
            const storedUser =
                localStorage.getItem("user") ||
                localStorage.getItem("currentUser");

            return storedUser
                ? JSON.parse(storedUser)
                : null;
        } catch {
            return null;
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        setLoading(true);
        setError("");
        setMessage("");

        const token = getToken();
        const currentUser = getCurrentUser();

        const volunteerName =
            currentUser?.name ||
            currentUser?.username ||
            currentUser?.fullName ||
            "";

        const volunteerEmail =
            currentUser?.email || "";

        if (!token) {
            setError("Session expired. Please log in again.");
            setLoading(false);
            return;
        }

        const payload = {
            name: form.animalName.trim(),
            type: form.animalType,
            intakeType: form.intakeType,
            intakeCondition: form.condition,
            location: form.rescueLocation.trim(),
            rescuedBy: volunteerName,
            description: form.notes.trim(),
            latitude: form.latitude
                ? Number(form.latitude)
                : null,
            longitude: form.longitude
                ? Number(form.longitude)
                : null,
            image: "",
        };

        if (volunteerEmail) {
            payload.createdByEmail = volunteerEmail;
        }

        if (!payload.name) {
            setError("Animal name is required.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(API_BASE_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to submit field intake."
                );
            }

            setMessage(
                "Field intake submitted successfully for review."
            );

            setForm(INITIAL_FORM);
            setPhoto(null);
        } catch (submitError) {
            setError(
                submitError.message ||
                "Something went wrong while submitting."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="admin-mobile-intake-page">
            <section className="admin-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Mobile Field Intake</h2>

                        <p>
                            Record rescued animals directly from the field.
                        </p>
                    </div>
                </div>

                {message && (
                    <p className="success-message">
                        {message}
                    </p>
                )}

                {error && (
                    <p className="error-message">
                        {error}
                    </p>
                )}

                <form
                    className="admin-mobile-intake-form"
                    onSubmit={handleSubmit}
                >
                    <label>
                        Animal Name
                        <input
                            value={form.animalName}
                            onChange={(e) =>
                                updateField(
                                    "animalName",
                                    e.target.value
                                )
                            }
                            placeholder="Enter animal name"
                            required
                        />
                    </label>

                    <label>
                        Animal Type
                        <select
                            value={form.animalType}
                            onChange={(e) =>
                                updateField(
                                    "animalType",
                                    e.target.value
                                )
                            }
                        >
                            <option value="Dog">Dog</option>
                            <option value="Cat">Cat</option>
                            <option value="Other">Other</option>
                        </select>
                    </label>

                    <label>
                        Intake Type
                        <select
                            value={form.intakeType}
                            onChange={(e) =>
                                updateField(
                                    "intakeType",
                                    e.target.value
                                )
                            }
                        >
                            <option value="Rescued">Rescued</option>
                            <option value="Stray">Stray</option>
                            <option value="Owner Surrender">
                                Owner Surrender
                            </option>
                            <option value="Transferred">
                                Transferred
                            </option>
                        </select>
                    </label>

                    <label>
                        Initial Condition
                        <select
                            value={form.condition}
                            onChange={(e) =>
                                updateField(
                                    "condition",
                                    e.target.value
                                )
                            }
                        >
                            <option value="Healthy">Healthy</option>
                            <option value="Injured">Injured</option>
                            <option value="Sick">Sick</option>
                            <option value="Under Observation">
                                Under Observation
                            </option>
                            <option value="Unknown">Unknown</option>
                        </select>
                    </label>

                    <label>
                        Rescue Location
                        <input
                            value={form.rescueLocation}
                            onChange={(e) =>
                                updateField(
                                    "rescueLocation",
                                    e.target.value
                                )
                            }
                            placeholder="Enter rescue location"
                        />
                    </label>

                    <div className="mobile-location-grid">
                        <label>
                            Latitude
                            <input
                                readOnly
                                value={form.latitude}
                            />
                        </label>

                        <label>
                            Longitude
                            <input
                                readOnly
                                value={form.longitude}
                            />
                        </label>
                    </div>

                    <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={loading}
                    >
                        Capture Current Location
                    </button>

                    <label>
                        Rescue Photo
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                setPhoto(
                                    e.target.files?.[0] || null
                                )
                            }
                        />
                    </label>

                    {photo && (
                        <p>
                            Selected photo: {photo.name}
                        </p>
                    )}

                    <label>
                        Notes
                        <textarea
                            rows="5"
                            value={form.notes}
                            onChange={(e) =>
                                updateField(
                                    "notes",
                                    e.target.value
                                )
                            }
                            placeholder="Add rescue notes..."
                        />
                    </label>

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Submitting..."
                            : "Submit Field Intake"}
                    </button>
                </form>
            </section>
        </section>
    );
}