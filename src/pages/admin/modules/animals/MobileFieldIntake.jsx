import { useState } from "react";

export default function MobileFieldIntake() {
    const [form, setForm] = useState({
        volunteerName: "",
        animalType: "Dog",
        animalName: "",
        intakeType: "Rescued",
        condition: "Healthy",
        rescueLocation: "",
        latitude: "",
        longitude: "",
        photo: "",
        notes: "",
    });

    function updateField(name, value) {
        setForm({
            ...form,
            [name]: value,
        });
    }

    function getCurrentLocation() {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                updateField(
                    "latitude",
                    position.coords.latitude.toFixed(6)
                );

                updateField(
                    "longitude",
                    position.coords.longitude.toFixed(6)
                );
            }, () => {
                alert("Unable to retrieve location.");
            }
        );
    }

    function handleSubmit(e) {
        e.preventDefault();
        console.log(form);

        alert("Field intake submitted (This is a demo).");

        setForm({
            volunteerName: "",
            animalType: "Dog",
            animalName: "",
            intakeType: "Rescued",
            condition: "Healthy",
            rescueLocation: "",
            latitude: "",
            longitude: "",
            photo: "",
            notes: "",
        });
    }

    return (
        <section className="admin-mobile-intake-page">
            <section className="admin-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>
                            Mobile Field Intake
                        </h2>

                        <p>
                            Record rescued animals directly from the field.
                        </p>
                    </div>
                </div>

                <form
                    className="admin-mobile-intake-form"
                    onSubmit={handleSubmit}
                >
                    <label>
                        Volunteer / Staff
                        <input
                            value={form.volunteerName}
                            onChange={(e) =>
                                updateField(
                                    "volunteerName",
                                    e.target.value
                                )
                            }
                            required
                        />
                    </label>

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
                            <option>Dog</option>
                            <option>Cat</option>
                            <option>Other</option>
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
                            <option>Rescued</option>
                            <option>Stray</option>
                            <option>Owner Surrender</option>
                            <option>Transferred</option>
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
                            <option>Healthy</option>
                            <option>Injured</option>
                            <option>Critical</option>
                            <option>Under Observation</option>
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
                    >
                        📍 Capture Current Location
                    </button>

                    <label>
                        Rescue Photo
                        <input
                            type="file"
                            accept="image/*"
                        />
                    </label>

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
                        />
                    </label>

                    <button type="submit">
                        Submit Field Intake
                    </button>
                </form>
            </section>
        </section>
    );

}