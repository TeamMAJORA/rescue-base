import { useState } from "react";
import InfoTip from "../../../components/system/InfoTip";

const API = import.meta.env.VITE_BACKEND_URL;

// Lock icon (same one the adoption form uses for account fields)
function LockIcon() {
    return (
        <svg className="ffc-lock-icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
    );
}

// Row of pill buttons that works like a radio group
function ChoiceGroup({ name, value, options, onPick, label }) {
    return (
        <div className="ffc-choices" role="radiogroup" aria-label={label}>
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={value === option}
                    className={value === option ? "is-selected" : ""}
                    onClick={() => onPick(name, option)}
                >
                    {option}
                </button>
            ))}
        </div>
    );
}
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
    const token = localStorage.getItem("token");

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

        // Used by the choice buttons (Household card)
    function pickChoice(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
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
                        Authorization: `Bearer ${token}`,
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

                <section className="foster-form-card ffc-card">
                    <div className="ffc-head">
                        <b className="ffc-step">1</b>
                        <div>
                            <h3>Personal Information</h3>
                            <p>Taken from your RescueBase account. Only the phone and address need filling in.</p>
                        </div>
                    </div>

                    <div className="foster-form-grid">
                        <label>
                            Full Name
                            <span className="ffc-locked">
                                <input
                                    type="text"
                                    name="fullName"
                                    value={form.fullName}
                                    readOnly
                                    required
                                />
                                <LockIcon />
                            </span>
                        </label>

                        <label>
                            Email Address
                            <span className="ffc-locked">
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    readOnly
                                    required
                                />
                                <LockIcon />
                            </span>
                        </label>

                        <label>
                            <span>
                                Phone Number <em className="ffc-required">*</em>
                            </span>
                            <span className="ffc-phone">
                                <span className="ffc-phone-prefix">+63</span>
                                <input
                                    type="tel"
                                    name="phone"
                                    inputMode="numeric"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="9XX XXX XXXX"
                                    required
                                />
                            </span>
                        </label>

                        <label>
                            <span>
                                Address <em className="ffc-required">*</em>
                            </span>
                            <input
                                type="text"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="House no., street, barangay, city"
                                required
                            />
                        </label>
                    </div>
                </section>

                <section className="foster-form-card ffc-card">
                    <div className="ffc-head">
                        <b className="ffc-step">2</b>
                        <div>
                            <h3>Household Information</h3>
                            <p>Helps us match you with a pet that fits your home.</p>
                        </div>
                    </div>

                    <div className="foster-form-grid">
                        <div className="ffc-field foster-full-field">
                            <span className="ffc-label">
                                Home Type <em className="ffc-required">*</em>
                                <InfoTip text="Where the foster animal will stay. This helps staff match an animal that suits your space." />
                            </span>
                            <ChoiceGroup
                                name="homeType"
                                label="Home type"
                                value={form.homeType}
                                options={["House", "Apartment", "Condo", "Other"]}
                                onPick={pickChoice}
                            />
                        </div>

                        <div className="ffc-field">
                            <span className="ffc-label">
                                Children at home? <em className="ffc-required">*</em>
                            </span>
                            <ChoiceGroup
                                name="hasChildren"
                                label="Children at home"
                                value={form.hasChildren}
                                options={["Yes", "No"]}
                                onPick={pickChoice}
                            />
                        </div>

                        <div className="ffc-field">
                            <span className="ffc-label">
                                Existing pets? <em className="ffc-required">*</em>
                            </span>
                            <ChoiceGroup
                                name="hasPets"
                                label="Existing pets"
                                value={form.hasPets}
                                options={["Yes", "No"]}
                                onPick={pickChoice}
                            />
                        </div>

                        <div className="ffc-field">
                            <span className="ffc-label">
                                Is your home pet friendly? <em className="ffc-required">*</em>
                                <InfoTip text="Choose Yes only if your landlord, condo or building rules allow keeping animals." />
                            </span>
                            <ChoiceGroup
                                name="petFriendly"
                                label="Is your home pet friendly"
                                value={form.petFriendly}
                                options={["Yes", "No"]}
                                onPick={pickChoice}
                            />
                            <small className="ffc-hint">Landlord or building rules allow keeping animals.</small>
                        </div>
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