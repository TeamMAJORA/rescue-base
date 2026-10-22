import { useEffect, useState } from "react";
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
export default function FosterApplication({ embedded = false, onSubmitted, application = null, refresh }) {

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

    // Pending or approved: the form edits that application instead of making a new one
    const isEditing = ["pending", "approved"].includes(application?.status);

    // Saved application -> form values (phones keep only the 10 digits after +63)
    function formFromApplication(app) {
        const digits = (value) =>
            String(value || "").replace(/\D/g, "").replace(/^63(?=9)/, "").replace(/^0/, "").slice(0, 10);
        const yesNo = (value) => (value ? "Yes" : "No");

        return {
            ...initialForm,
            fullName: app.applicantName || initialForm.fullName,
            phone: digits(app.phoneNumber),
            address: app.address || "",
            homeType: app.housingType || initialForm.homeType,
            hasChildren: yesNo(app.hasChildren),
            hasPets: yesNo(app.hasPets),
            petFriendly: yesNo(app.petFriendly),
            preferredAnimal: app.preferredAnimalType || initialForm.preferredAnimal,
            preferredSize: app.preferredSize || initialForm.preferredSize,
            maxAnimals: app.capacity || 1,
            fosterDuration: app.fosterDuration || initialForm.fosterDuration,
            experience: app.fosterExperience || "",
            emergencyName: app.emergencyName || "",
            emergencyRelationship: app.emergencyRelationship || "",
            emergencyPhone: digits(app.emergencyPhone),
            notes: app.notes || "",
            agree: Boolean(app.agreementAccepted),
        };
    }

    // Draft is saved per account on this browser only
    const DRAFT_KEY = `rescuebase_foster_draft_${savedUser.email || "guest"}`;

    const [form, setForm] = useState(() => {
        if (isEditing) return formFromApplication(application);

        try {
            const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
            if (draft) {
                return { ...initialForm, ...draft, fullName: draft.fullName || initialForm.fullName, email: initialForm.email };
            }
            // Rejected / revoked: start from their previous answers
            return application ? formFromApplication(application) : initialForm;
        } catch {
            return initialForm;
        }
    });

    // When their application loads or a new one is created, show its saved answers
    useEffect(() => {
        if (isEditing) setForm(formFromApplication(application));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [application?._id]);

    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const locked = isEditing && !editing;
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

        if (!f.fullName.trim()) found.fullName = "Full name is required.";
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
        setForm(isEditing ? formFromApplication(application) : initialForm);
        if (!isEditing) localStorage.removeItem(DRAFT_KEY);
        setEditing(false);
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
                `${API}/api/foster/applications${isEditing ? "/me" : ""}`,
                {
                    method: isEditing ? "PATCH" : "POST",
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
                isEditing
                    ? data.message || "Changes saved. The shelter has been notified."
                    : "Your foster application was submitted successfully."
            );
            setMessageType("success");
            setEditing(false);
            if (!isEditing) {
                setForm(initialForm);
                localStorage.removeItem(DRAFT_KEY);
            }
            onSubmitted?.();
            refresh?.();
        } catch (error) {
            console.error(error);

            setMessage("Server error.");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    }

    // ----- Right-side info card -----
    const appStatus = application?.status || "none";
    const STATUS_TEXT = { none: "Not applied", pending: "Pending", approved: "Approved", rejected: "Declined", withdrawn: "Revoked" };
    const PREFERS_TEXT = { Dog: "Dogs", Cat: "Cats", Both: "Dogs & Cats", Other: "Other" };

    function shortDate(value) {
        return value
            ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "—";
    }

    const infoSteps = [
        {
            title: "Submitted",
            note: application ? `Sent ${shortDate(application.createdAt)}` : "Waiting for you to apply",
            state: application ? "done" : "upcoming",
        },
        {
            title: "Under review",
            note: "Staff check your answers",
            state: appStatus === "pending" ? "active" : application ? "done" : "upcoming",
        },
        {
            title: "Decision",
            note: appStatus === "approved" ? "Approved"
                : appStatus === "rejected" ? "Declined"
                : appStatus === "withdrawn" ? "Revoked by you"
                : "Approved or declined",
            state: appStatus === "approved" ? "done"
                : appStatus === "rejected" || appStatus === "withdrawn" ? "declined"
                : "upcoming",
        },
    ];

    const rejectionReason = application?.rejectionReason ||
        (appStatus === "rejected" ? application?.reviewNotes : "");

    const infoPanel = (
        <aside className="ffa-side">
            <div className="ffa-card">
                <div className="ffa-card-head">
                    <h3>Your application</h3>
                    <span className={`ffa-badge is-${appStatus}`}>
                        {STATUS_TEXT[appStatus] || appStatus}
                    </span>
                </div>

                <div className="ffa-row">
                    <span>Role</span>
                    <strong>Foster Caregiver</strong>
                </div>
                <div className="ffa-row">
                    <span>Applied</span>
                    <strong>{shortDate(application?.createdAt)}</strong>
                </div>
                <div className="ffa-row">
                    <span>Last updated</span>
                    <strong>{shortDate(application?.lastEditedAt)}</strong>
                </div>
                <div className="ffa-row">
                    <span>Capacity</span>
                    <strong>
                        {application
                            ? `${application.capacity || 1} ${(application.capacity || 1) === 1 ? "animal" : "animals"}`
                            : "—"}
                    </strong>
                </div>
                <div className="ffa-row">
                    <span>Prefers</span>
                    <strong>{application ? PREFERS_TEXT[application.preferredAnimalType] || application.preferredAnimalType : "—"}</strong>
                </div>

                <ol className="ffa-steps">
                    {infoSteps.map((step, index) => (
                        <li key={step.title} className={`ffa-step is-${step.state}`}>
                            <span className="ffa-step-dot">
                                {step.state === "done"
                                    ? <img src="/icons/checkmark.svg" alt="" />
                                    : step.state === "declined" ? "✕" : index + 1}
                            </span>
                            <div>
                                <b>{step.title}</b>
                                <small>{step.note}</small>
                            </div>
                        </li>
                    ))}
                </ol>

                {rejectionReason && (
                    <p className="ffa-reason">
                        <strong>Reason:</strong> {rejectionReason}
                    </p>
                )}
            </div>

            <div className="ffa-note">
                <span className="ffa-note-dot" aria-hidden="true" />
                <p>
                    {appStatus === "approved"
                        ? "Need to change something? Press Update Application. The shelter is notified of every change you save."
                        : appStatus === "pending"
                            ? "You can still update your answers while staff review them."
                            : "Fill in the form to apply. Staff review every application."}
                </p>
            </div>
        </aside>
    );
    // Foster dashboard: a pending or approved application is shown read-only.
    // "Update Application" switches to the form (editing = true).
    const currentStatus = application?.status;

    if (!embedded && !editing && (currentStatus === "pending" || currentStatus === "approved")) {
        const phoneText = (value) => {
            const digits = String(value || "").replace(/\D/g, "").replace(/^63(?=9)/, "").replace(/^0/, "");
            return digits.length === 10
                ? `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
                : value || "—";
        };
        const yesNo = (value) => (
            <span className={`ffs-yn ${value ? "is-yes" : "is-no"}`}>{value ? "Yes" : "No"}</span>
        );

        const sections = [
            {
                title: "Personal",
                items: [
                    ["Full name", application.applicantName || "—"],
                    ["Phone", phoneText(application.phoneNumber)],
                    ["Address", application.address || "—", "is-wide"],
                ],
            },
            {
                title: "Household",
                items: [
                    ["Home type", application.housingType || "—"],
                    ["Children at home", yesNo(application.hasChildren)],
                    ["Existing pets", yesNo(application.hasPets)],
                    ["Pet friendly home", yesNo(application.petFriendly)],
                ],
            },
            {
                title: "Foster preferences",
                items: [
                    ["Preferred animal", application.preferredAnimalType || "—"],
                    ["Preferred size", application.preferredSize || "—"],
                    ["Maximum animals", application.capacity || 1],
                    ["Foster duration", application.fosterDuration || "—"],
                    ...(application.fosterExperience
                        ? [["Experience", application.fosterExperience, "is-full"]]
                        : []),
                ],
            },
            {
                title: "Emergency contact",
                items: [
                    ["Name", application.emergencyName || "—"],
                    ["Relationship", application.emergencyRelationship || "—"],
                    ["Phone", phoneText(application.emergencyPhone)],
                ],
            },
        ];

        return (
            <section className="foster-panel">
                <div className="ffa-layout">
                    <div className="ffs-card">
                        <div className="ffs-head">
                            <div>
                                <h3>Your foster application</h3>
                                <p>
                                    {currentStatus === "pending"
                                        ? "Staff are reviewing it. You can still update your answers."
                                        : "You are an approved foster. You do not need to apply again."}
                                </p>
                            </div>

                            <div className="ffs-head-actions">
                                <span className="ffs-pill">
                                    <LockIcon />
                                    Read only
                                </span>
                                <button
                                    type="button"
                                    className="ffc-btn ffc-btn-submit"
                                    onClick={() => {
                                        setMessage("");
                                        setEditing(true);
                                    }}
                                >
                                    Update Application
                                </button>
                            </div>
                        </div>

                        {message && (
                            <div className={`foster-alert ${messageType}`}>{message}</div>
                        )}

                        {sections.map((section) => (
                            <div key={section.title} className="ffs-section">
                                <h4>{section.title}</h4>
                                <dl className="ffs-grid">
                                    {section.items.map(([label, value, size]) => (
                                        <div key={label} className={`ffs-tile ${size || ""}`}>
                                            <dt>{label}</dt>
                                            <dd>{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        ))}
                    </div>

                    {infoPanel}
                </div>
            </section>
        );
    }

    return (
        <section className={embedded ? "ffa-embedded" : "foster-panel"}>

            {!embedded && currentStatus === "rejected" && (
                <div className="foster-alert error">
                    Your last application was not approved
                    {application.rejectionReason || application.reviewNotes
                        ? `: ${application.rejectionReason || application.reviewNotes}`
                        : "."}{" "}
                    You can update your answers and apply again below.
                </div>
            )}

            {!embedded && (
                <div className="foster-section-heading">
                    <div>
                        <span>Become a Volunteer</span>
                        <h2>Foster Application</h2>
                    </div>
                </div>
            )}

            <div className={embedded ? undefined : "ffa-layout"}>
            <form
                className={`ffa-form ${locked ? "is-locked" : ""}`}
                onSubmit={handleSubmit}
                noValidate
            >
                {isEditing && (
                    <div className={`ffc-edit-note ${editing ? "is-editing" : ""}`}>
                        <div>
                            <b>{editing ? "Editing your application" : "Your submitted application"}</b>
                            <span>
                                {editing
                                    ? "Change any answer, then press Save Changes. The shelter will see what you changed."
                                    : "Your answers are locked. Press Edit to update them."}
                            </span>
                        </div>

                        {!editing && (
                            <button
                                type="button"
                                className="ffc-btn ffc-btn-edit"
                                onClick={() => {
                                    setMessage("");
                                    setEditing(true);
                                }}
                            >
                                <img src="/icons/edit.svg" alt="" />
                                Edit
                            </button>
                        )}
                    </div>
                )}

            <fieldset className="ffa-fields" disabled={locked}>

                <section className="foster-form-card ffc-card">
                    <div className="ffc-head">
                        <b className="ffc-step">1</b>
                        <div>
                            <h3>Personal Information</h3>
                            <p>Your name is filled in from your account. You can edit it if needed.</p>                        </div>
                    </div>

                    <div className="foster-form-grid">
                        <label>
                            Full Name
                            <span className="ffc-locked">
                                <input
                                    type="text"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    placeholder="First and last name"
                                    maxLength={80}
                                    required
                                />                                
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
            </fieldset>

                {message && (
                    <div
                        className={`foster-alert ${messageType}`}
                    >
                        {message}
                    </div>
                )}

            {!locked && (
                <div className="ffc-actions">
                    <p className="ffc-actions-note">
                        Staff review every application. Fields marked <em className="ffc-required">*</em> are required.                    </p>

                    <div className="ffc-actions-buttons">
                        <button
                            type="button"
                            className="ffc-btn ffc-btn-clear"
                            onClick={handleClear}
                        >
                            {isEditing ? "Cancel" : "Clear"}
                        </button>

                        {!isEditing && (
                            <button
                                type="button"
                                className="ffc-btn ffc-btn-draft"
                                onClick={handleSaveDraft}
                            >
                                Save Draft
                            </button>
                        )}

                        <button
                            type="submit"
                            className="ffc-btn ffc-btn-submit"
                            disabled={loading}
                        >
                            {loading
                                ? isEditing ? "Saving..." : "Submitting..."
                                : isEditing
                                    ? "Save Changes"
                                    : application ? "Reapply" : "Submit Application"}
                        </button>
                    </div>
                </div>
            )}
            </form>
            {!embedded && infoPanel}
            </div>
        </section>
    );
}