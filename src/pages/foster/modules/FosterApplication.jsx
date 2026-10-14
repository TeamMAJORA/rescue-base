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

// Red message under a field
function FieldError({ message }) {
    return message ? <small className="ffc-error" role="alert">{message}</small> : null;
}
export default function FosterApplication({ embedded = false, onSubmitted }) {
    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    const initialForm = {
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
    };

    // Draft is saved per account on this browser only
    const DRAFT_KEY = `rescuebase_foster_draft_${savedUser.email || "guest"}`;

    const [form, setForm] = useState(() => {
        try {
            const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
            return draft
                ? { ...initialForm, ...draft, fullName: initialForm.fullName, email: initialForm.email }
                : initialForm;
        } catch {
            return initialForm;
        }
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const [errors, setErrors] = useState({});
    const token = localStorage.getItem("token");

    // Phone fields: digits only, drop a leading 0, max 10 (the number after +63)
    const PHONE_FIELDS = ["phone", "emergencyPhone"];

    function handleChange(e) {
        const { name, value, type, checked } = e.target;

        const cleanValue = PHONE_FIELDS.includes(name)
            ? value.replace(/\D/g, "").replace(/^0/, "").slice(0, 10)
            : value;

        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : cleanValue,
        }));

        // remove that field's error once the user edits it
        setErrors((prev) => {
            if (!prev[name]) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }

    function validateForm(f) {
        const found = {};
        const phonePattern = /^9\d{9}$/;

        if (!f.phone) found.phone = "Phone number is required.";
        else if (!phonePattern.test(f.phone)) found.phone = "Enter a valid 10-digit mobile number starting with 9.";

        if (!f.address.trim()) found.address = "Address is required.";

        if (!f.experience.trim()) found.experience = 'Describe your experience, or write "None".';

        if (!f.emergencyName.trim()) found.emergencyName = "Emergency contact name is required.";

        if (!f.emergencyRelationship.trim()) found.emergencyRelationship = "Relationship is required.";

        if (!f.emergencyPhone) found.emergencyPhone = "Emergency contact phone is required.";
        else if (!phonePattern.test(f.emergencyPhone)) found.emergencyPhone = "Enter a valid 10-digit mobile number starting with 9.";
        else if (f.emergencyPhone === f.phone) found.emergencyPhone = "Use a different number from your own.";

        if (!f.agree) found.agree = "Please agree to the foster guidelines.";

        return found;
    }

        // Used by the choice buttons (Household card)
    function pickChoice(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    function handleClear() {
        setForm(initialForm);
        localStorage.removeItem(DRAFT_KEY);
        setErrors({});
        setMessage("");
        setMessageType("");
    }

    function handleSaveDraft() {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, agree: false }));
        setMessage("Draft saved on this device.");
        setMessageType("success");
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const found = validateForm(form);
        setErrors(found);

        if (Object.keys(found).length > 0) {
            setMessage("Please fix the highlighted fields before submitting.");
            setMessageType("error");
            document.querySelector(`[name="${Object.keys(found)[0]}"]`)?.focus();
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
            setForm(initialForm);
            localStorage.removeItem(DRAFT_KEY);
            onSubmitted?.();
        } catch (error) {
            console.error(error);

            setMessage("Server error.");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className={embedded ? "ffa-embedded" : "foster-panel"}>

            {!embedded && (
                <div className="foster-section-heading">
                    <div>
                        <span>Become a Volunteer</span>
                        <h2>Foster Application</h2>
                    </div>
                </div>
            )}

            <form
                className="ffa-form"                onSubmit={handleSubmit}
                noValidate
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
                            <FieldError message={errors.phone} />
                        </label>

                        <label>
                            <span>
                                Address <em className="ffc-required">*</em>
                            </span>
                            <FieldError message={errors.address} />
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

                <section className="foster-form-card ffc-card">
                    <div className="ffc-head">
                        <b className="ffc-step">3</b>
                        <div>
                            <h3>Foster Preferences</h3>
                            <p>Tell us what kind of animals you can take in.</p>
                        </div>
                    </div>

                    <div className="foster-form-grid">
                        <div className="ffc-field">
                            <span className="ffc-label">
                                Preferred Animal <em className="ffc-required">*</em>
                            </span>
                            <ChoiceGroup
                                name="preferredAnimal"
                                label="Preferred animal"
                                value={form.preferredAnimal}
                                options={["Dog", "Cat", "Both"]}
                                onPick={pickChoice}
                            />
                        </div>

                        <div className="ffc-field">
                            <span className="ffc-label">
                                Preferred Size <em className="ffc-required">*</em>
                            </span>
                            <ChoiceGroup
                                name="preferredSize"
                                label="Preferred size"
                                value={form.preferredSize}
                                options={["Small", "Medium", "Large", "Any"]}
                                onPick={pickChoice}
                            />
                        </div>

                        <div className="ffc-field">
                            <span className="ffc-label">
                                Maximum Animals <em className="ffc-required">*</em>
                                <InfoTip text="The most animals you can foster at the same time. Staff will not assign more than this number to you." />
                            </span>
                            <div className="ffc-stepper">
                                <button
                                    type="button"
                                    aria-label="Decrease maximum animals"
                                    disabled={Number(form.maxAnimals) <= 1}
                                    onClick={() => pickChoice("maxAnimals", Math.max(1, Number(form.maxAnimals) - 1))}
                                >
                                    −
                                </button>
                                <output aria-live="polite">{form.maxAnimals}</output>
                                <button
                                    type="button"
                                    aria-label="Increase maximum animals"
                                    disabled={Number(form.maxAnimals) >= 10}
                                    onClick={() => pickChoice("maxAnimals", Math.min(10, Number(form.maxAnimals) + 1))}
                                >
                                    +
                                </button>
                            </div>
                            <small className="ffc-hint">How many you can care for at the same time.</small>
                        </div>

                        <div className="ffc-field ffc-duration">
                            <span className="ffc-label">
                                Foster Duration <em className="ffc-required">*</em>
                            </span>
                            <ChoiceGroup
                                name="fosterDuration"
                                label="Foster duration"
                                value={form.fosterDuration}
                                options={["1 Week", "2 Weeks", "1 Month", "2 Months", "Until Adopted"]}
                                onPick={pickChoice}
                            />
                        </div>
                    </div>
                </section>

                <section className="foster-form-card ffc-card">
                    <div className="ffc-head">
                        <b className="ffc-step">4</b>
                        <div>
                            <h3>Experience &amp; Emergency Contact</h3>
                            <p>Shown to staff only when they review your application.</p>
                        </div>
                    </div>

                    <div className="foster-form-grid">
                        <label className="foster-full-field">
                            <span>
                                Foster or pet-care experience <em className="ffc-required">*</em>
                            </span>
                            <span className="ffc-textarea">
                                <textarea
                                    rows="4"
                                    name="experience"
                                    value={form.experience}
                                    onChange={handleChange}
                                    maxLength={500}
                                    placeholder='Describe any experience caring for animals, or write "None".'
                                    required
                                />
                                <small className="ffc-count">{form.experience.length} / 500</small>
                            </span>
                            <FieldError message={errors.experience} />
                        </label>

                        <label>
                            <span>
                                Emergency Contact Name <em className="ffc-required">*</em>
                            </span>
                            <FieldError message={errors.emergencyName} />
                            <input
                                type="text"
                                name="emergencyName"
                                value={form.emergencyName}
                                onChange={handleChange}
                                placeholder="Full name"
                                required
                            />
                        </label>

                        <label>
                            <span>
                                Relationship <em className="ffc-required">*</em>
                            </span>
                            <FieldError message={errors.emergencyRelationship} />
                            <input
                                type="text"
                                name="emergencyRelationship"
                                value={form.emergencyRelationship}
                                onChange={handleChange}
                                placeholder="e.g. Mother, Sibling"
                                required
                            />
                        </label>

                        <label>
                            <span>
                                Emergency Contact Phone <em className="ffc-required">*</em>
                            </span>
                            <FieldError message={errors.emergencyPhone} />
                            <span className="ffc-phone">
                                <span className="ffc-phone-prefix">+63</span>
                                <input
                                    type="tel"
                                    name="emergencyPhone"
                                    inputMode="numeric"
                                    value={form.emergencyPhone}
                                    onChange={handleChange}
                                    placeholder="9XX XXX XXXX"
                                    required
                                />
                            </span>
                        </label>

                        <label className="foster-full-field">
                            <span>
                                Additional Notes <em className="ffc-optional">(optional)</em>
                            </span>
                            <span className="ffc-textarea">
                                <textarea
                                    rows="3"
                                    name="notes"
                                    value={form.notes}
                                    onChange={handleChange}
                                    maxLength={300}
                                    placeholder="Anything else the staff should know?"
                                />
                                <small className="ffc-count">{form.notes.length} / 300</small>
                            </span>
                        </label>
                    </div>
                </section>

                <section className="foster-form-card ffc-agree-card">
                    <label className="ffc-agree">
                        <input
                            type="checkbox"
                            name="agree"
                            checked={form.agree}
                            onChange={handleChange}
                            required
                        />
                        <span className="ffc-agree-box" aria-hidden="true">
                            {form.agree && <img src="/icons/checkmark.svg" alt="" />}
                        </span>
                        <span className="ffc-agree-text">
                            <strong>
                                I agree to follow the RescueBase Foster Guidelines. <em className="ffc-required">*</em>
                            </strong>
                            <small>Includes regular updates on the pet, vet visits through the shelter, and returning the pet when requested.</small>
                        </span>
                    </label>
                    <FieldError message={errors.agree} />
                </section>

                {message && (
                    <div
                        className={`foster-alert ${messageType}`}
                    >
                        {message}
                    </div>
                )}

                <div className="ffc-actions">
                    <p className="ffc-actions-note">
                        Staff review every application. Fields marked <em className="ffc-required">*</em> are required.                    </p>

                    <div className="ffc-actions-buttons">
                        <button
                            type="button"
                            className="ffc-btn ffc-btn-clear"
                            onClick={handleClear}
                        >
                            Clear
                        </button>

                        <button
                            type="button"
                            className="ffc-btn ffc-btn-draft"
                            onClick={handleSaveDraft}
                        >
                            Save Draft
                        </button>

                        <button
                            type="submit"
                            className="ffc-btn ffc-btn-submit"
                            disabled={loading}                        >
                            {loading
                                ? "Submitting..."
                                : "Submit Application"}
                        </button>
                    </div>
                </div>
            </form>
        </section>
    );
}