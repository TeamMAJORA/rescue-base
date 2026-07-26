import { useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function FosterApplication() {
    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    const [form, setForm] = useState({
        fullName: savedUser.username || savedUser.name || "",
        email: savedUser.email || "",
        phone: "",
        address: "",
        homeType: "House",
        hasChildren: "No",
        hasPets: "No",
        petFriendly: "Yes",
        preferredAnimal: "Dog",
        preferredSize: "Any",
        maxAnimals: 1,
        fosterDuration: "1 Month",
        experience: "",
        emergencyName: "",
        emergencyRelationship: "",
        emergencyPhone: "",
        notes: "",
        agree: false,
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    function handleChange(e) {
        const { name, value, type, checked } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.agree) {
            setMessage("Please accept the foster agreement.");
            setMessageType("error");
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            const response = await fetch(
                `${API}/api/foster/applications`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        applicantName: form.fullName,
                        applicantEmail: form.email,
                        phoneNumber: form.phone,
                        address: form.address,
                        housingType: form.homeType,
                        hasChildren: form.hasChildren === "Yes",
                        hasPets: form.hasPets === "Yes",
                        petFriendly: form.petFriendly === "Yes",
                        preferredAnimalType: form.preferredAnimal,
                        preferredSize: form.preferredSize,
                        capacity: Number(form.maxAnimals),
                        fosterDuration: form.fosterDuration,
                        fosterExperience: form.experience,
                        emergencyName: form.emergencyName,
                        emergencyRelationship: form.emergencyRelationship,
                        emergencyPhone: form.emergencyPhone,
                        notes: form.notes,
                        agreementAccepted: form.agree,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Unable to submit application."
                );
                setMessageType("error");
                return;
            }

            setMessage(
                "Your foster application was submitted successfully."
            );
            setMessageType("success");
        } catch (error) {
            console.error(error);

            setMessage("Server error.");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="foster-panel">

            <div className="foster-section-heading">
                <div>
                    <span>Become a Volunteer</span>
                    <h2>Foster Application</h2>
                </div>
            </div>

            <form
                className="foster-application-form"
                onSubmit={handleSubmit}
            >

                <section className="foster-form-card">
                    <h3>Personal Information</h3>
                    <div className="foster-form-grid">

                        <label>
                            Full Name
                            <input
                                type="text"
                                name="fullName"
                                value={form.fullName}
                                onChange={handleChange}
                                required
                            />

                        </label>

                        <label>
                            Email
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            Phone Number
                            <input
                                type="text"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            Address
                            <input
                                type="text"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                required
                            />
                        </label>
                    </div>

                </section>

                <section className="foster-form-card">
                    <h3>Household Information</h3>
                    <div className="foster-form-grid">
                        <label>
                            Home Type
                            <select
                                name="homeType"
                                value={form.homeType}
                                onChange={handleChange}
                            >
                                <option>House</option>
                                <option>Apartment</option>
                                <option>Condo</option>
                                <option>Boarding House</option>
                            </select>
                        </label>

                        <label>
                            Children
                            <select
                                name="hasChildren"
                                value={form.hasChildren}
                                onChange={handleChange}
                            >
                                <option>No</option>
                                <option>Yes</option>

                            </select>

                        </label>

                        <label>
                            Existing Pets
                            <select
                                name="hasPets"
                                value={form.hasPets}
                                onChange={handleChange}
                            >
                                <option>No</option>
                                <option>Yes</option>
                            </select>

                        </label>

                        <label>
                            Pet Friendly Home
                            <select
                                name="petFriendly"
                                value={form.petFriendly}
                                onChange={handleChange}
                            >
                                <option>Yes</option>
                                <option>No</option>
                            </select>
                        </label>
                    </div>

                </section>

                <section className="foster-form-card">
                    <h3>Foster Preferences</h3>
                    <div className="foster-form-grid">
                        <label>
                            Preferred Animal
                            <select
                                name="preferredAnimal"
                                value={form.preferredAnimal}
                                onChange={handleChange}
                            >
                                <option>Dog</option>
                                <option>Cat</option>
                                <option>Both</option>

                            </select>

                        </label>

                        <label>
                            Preferred Size
                            <select
                                name="preferredSize"
                                value={form.preferredSize}
                                onChange={handleChange}
                            >
                                <option>Any</option>
                                <option>Small</option>
                                <option>Medium</option>
                                <option>Large</option>
                            </select>

                        </label>

                        <label>
                            Maximum Animals
                            <input
                                type="number"
                                min="1"
                                max="10"
                                name="maxAnimals"
                                value={form.maxAnimals}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            Foster Duration
                            <select
                                name="fosterDuration"
                                value={form.fosterDuration}
                                onChange={handleChange}
                            >

                                <option>1 Week</option>
                                <option>2 Weeks</option>
                                <option>1 Month</option>
                                <option>2 Months</option>
                                <option>Until Adopted</option>
                            </select>
                        </label>

                    </div>

                </section>

                <section className="foster-form-card">
                    <h3>Experience</h3>
                    <textarea
                        rows="6"
                        name="experience"
                        value={form.experience}
                        onChange={handleChange}
                        placeholder="Tell us about your experience caring for animals..."
                    />

                </section>

                <section className="foster-form-card">
                    <h3>Emergency Contact</h3>
                    <div className="foster-form-grid">

                        <label>
                            Name
                            <input
                                name="emergencyName"
                                value={form.emergencyName}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            Relationship
                            <input
                                name="emergencyRelationship"
                                value={form.emergencyRelationship}
                                onChange={handleChange}
                            />
                        </label>

                        <label className="foster-full-field">
                            Phone Number
                            <input
                                name="emergencyPhone"
                                value={form.emergencyPhone}
                                onChange={handleChange}
                            />
                        </label>

                    </div>

                </section>

                <section className="foster-form-card">
                    <h3>Additional Notes</h3>
                    <textarea
                        rows="5"
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder="Anything else you'd like us to know?"
                    />
                </section>

                <section className="foster-form-card">
                    <label className="foster-checkbox">
                        <input
                            type="checkbox"
                            name="agree"
                            checked={form.agree}
                            onChange={handleChange}
                        />
                        I agree to follow RescueBase Foster Guidelines.
                    </label>

                </section>
                {message && (
                    <div
                        className={`foster-alert ${messageType}`}
                    >
                        {message}
                    </div>
                )}

                <div className="foster-form-actions">
                    <button
                        type="reset"
                        className="foster-secondary-button"
                    >
                        Clear
                    </button>

                    <button
                        type="submit"
                        className="foster-submit-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Submitting..."
                            : "Submit Application"}
                    </button>
                </div>
            </form>
        </section>
    );
}