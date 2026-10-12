import { useEffect, useState } from "react";
import "../../../styles/adopter/AdoptionApplication.css";
import PetDetailPanel from "../../../components/adopter/PetDetailPanel";
import InfoTip from "../../../components/system/InfoTip";

const API = import.meta.env.VITE_BACKEND_URL;

function getSavedUser() {
    try {
        return JSON.parse(
            localStorage.getItem("rescuebase_user") || "{}"
        );
    } catch {
        return {};
    }
}

function LockIcon() {
    return (
        <svg className="adoption-lock-icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
    );
}

export default function AdoptionApplication({
    pet,
    onBack,
    onApplicationSubmitted,
}) {
    const savedUser = getSavedUser();

    const DRAFT_KEY = `rescuebase_adoption_draft_${savedUser.email || "guest"}_${pet?._id || "none"}`;

    function readDraft() {
        try {
            return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
        } catch {
            return null;
        }
    }

    const [form, setForm] = useState(() => readDraft()?.form || {
            fullName: "",
            email: savedUser.email || "",
            phone: "",
            address: "",

            homeType: "House",
            homeTypeOther: "",
            hasChildren: "No",
            hasOtherPets: "No",

        reason: "",
        experience: "",
    });

    // Snapshot of the starting form, used to know if the adopter typed anything
    const [initialForm] = useState(() => form);
    const [leaveOpen, setLeaveOpen] = useState(false);

    const [document, setDocument] = useState(() => readDraft()?.document || null);
    const [documentUploading, setDocumentUploading] =
        useState(false);

    const [submitting, setSubmitting] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [messageType, setMessageType] =
        useState("");

    const [draftSavedAt, setDraftSavedAt] = useState(
        () => readDraft()?.savedAt || null
    );
    const [activeStep, setActiveStep] = useState(null);
    const [errors, setErrors] = useState({});
    const [dragActive, setDragActive] = useState(false);
    const hasProgress = Boolean(
        form.fullName || form.phone || form.address || form.reason || form.experience || document
    );
    function requestLeave() {
        if (submitting || documentUploading) return;
        if (hasProgress) { setLeaveOpen(true); return; }
        onBack?.();
    }

    const trackerSteps = [
        {
            key: "applicant",
            label: "Applicant",
            done: Boolean(
                form.fullName.trim() &&
                form.email.trim() &&
                form.phone.trim() &&
                form.address.trim() &&
                (form.homeType !== "Other" || (form.homeTypeOther || "").trim())
            ),
        },
        {
            key: "household",
            label: "Household",
            done: Boolean(form.reason.trim() && form.experience.trim()),
        },
        {
            key: "documents",
            label: "Documents",
            done: Boolean(document),
        },
    ];

    const currentStepIndex = trackerSteps.findIndex((step) => !step.done);
    const allStepsDone = currentStepIndex === -1;
    const highlightedStep =
        activeStep ?? (allStepsDone ? trackerSteps.length - 1 : currentStepIndex);

    function scrollToStep(index) {
        setActiveStep(index);
        window.document
            .getElementById(`adoption-step-${index + 1}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const token = localStorage.getItem("token")

    function showMessage(type, text) {
        setMessageType(type);
        setMessage(text);
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setMessage("");

        setForm((currentForm) => ({
            ...currentForm,
            [name]: value,
        }));

        setErrors((current) => ({ ...current, [name]: undefined }));
    }

    
    function handlePhoneChange(event) {
        const digits = event.target.value
            .replace(/\D/g, "")
            .replace(/^63/, "")
            .replace(/^0/, "")
            .slice(0, 10);

        setMessage("");
        setForm((current) => ({ ...current, phone: digits }));
        setErrors((current) => ({ ...current, phone: undefined }));
    }
function validateForm() {
    const newErrors = {};

    if (!form.fullName.trim()) newErrors.fullName = "Please enter your full name.";

    if (!form.phone.trim()) newErrors.phone = "Please enter your phone number.";
    else if (!/^9\d{9}$/.test(form.phone)) newErrors.phone = "Enter a valid 10-digit mobile number starting with 9.";

    if (form.homeType === "Other" && !(form.homeTypeOther || "").trim())
        newErrors.homeTypeOther = "Please describe your home type.";

    if (!form.address.trim()) newErrors.address = "Please enter your complete address.";

    if (!form.reason.trim()) newErrors.reason = `Please tell us why you want to adopt ${pet.name}.`;

    if (!form.experience.trim()) newErrors.experience = 'Please describe your pet-care experience, or write "None".';
    if (!document) newErrors.document = "Please upload a valid ID before submitting.";

    return newErrors;
}

    async function handleDocumentUpload(event) {
        const file = event.target.files?.[0] || event.dataTransfer?.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            showMessage(
                "error",
                "Please upload a valid image file."
            );

            event.target.value = "";
            return;
        }

        const maximumSize = 5 * 1024 * 1024;

        if (file.size > maximumSize) {
            showMessage(
                "error",
                "The document image must be 5 MB or smaller."
            );

            event.target.value = "";
            return;
        }

        try {
            setDocumentUploading(true);
            showMessage("", "");

            const uploadData = new FormData();

            uploadData.append("image", file);

            const response = await fetch(
                `${API}/api/uploads/image`,
                {
                    method: "POST",
                    headers : {
                        Authorization: `Bearer ${token}`
                    },
                    body: uploadData,
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                showMessage(
                    "error",
                    data.message ||
                    "Failed to upload the identification document."
                );

                return;
            }

            setDocument({
                documentName: file.name,
                documentUrl: data.imageUrl,
                publicId: data.publicId || "",
                status: "pending",
                
            });
            setErrors((current) => ({ ...current, document: undefined }));
            showMessage(
                "success",
                "Identification document uploaded successfully."
            );
        } catch (error) {
            console.error(
                "Identification document upload error:",
                error
            );

            showMessage(
                "error",
                "Server error while uploading the document."
            );
        } finally {
            setDocumentUploading(false);
            event.target.value = "";
        }
    }

    function removeDocument() {
        if (submitting || documentUploading) {
            return;
        }

        setDocument(null);
        showMessage("", "");
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!pet?._id) {
            showMessage(
                "error",
                "No valid animal was selected."
            );

            return;
        }

        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showMessage("error", "Please fix the highlighted fields before submitting.");
            const firstField = window.document.querySelector(`[name="${Object.keys(newErrors)[0]}"]`);
            firstField?.focus();
            firstField?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        setErrors({});

        try {
            setSubmitting(true);
            showMessage("", "");

            const payload = {
                fullName: form.fullName.trim(),

                phone: form.phone.trim(),
                address: form.address.trim(),

                animalId: pet._id,

                homeType:
                    form.homeType === "Other"
                        ? `Other: ${(form.homeTypeOther || "").trim()}`
                        : form.homeType,
                hasChildren: form.hasChildren,
                hasOtherPets: form.hasOtherPets,

                reason: form.reason.trim(),

                experience:
                    form.experience.trim(),

                documents: document
                    ? [document]
                    : [],
            };

            const token = localStorage.getItem("token");

            const response = await fetch(
                `${API}/api/adoptions`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },

                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json();

            console.log(
                "Adoption application response:",
                data
            );

            if (!response.ok || !data.success) {
                showMessage(
                    "error",
                    data.message ||
                    "Failed to submit the adoption application."
                );

                return;
            }

            const pendingApplication = {
                status:
                    data.application?.status ||
                    "pending",

                petName:
                    data.application?.petName ||
                    pet.name,

                petBreed:
                    data.application?.petBreed ||
                    pet.breed ||
                    "",

                petImage:
                    data.application?.petImage ||
                    pet.image ||
                    "",

                animalId:
                    data.application?.animalId ||
                    pet._id,

                applicationId:
                    data.application?._id,

                submittedAt:
                    data.application?.createdAt ||
                    new Date().toISOString(),
            };

            localStorage.setItem(
                "rescuebase_pending_application",
                JSON.stringify(
                    pendingApplication
                )
            );
            localStorage.removeItem(DRAFT_KEY);
            showMessage(
                "success",
                `Your adoption application for ${pet.name} was submitted successfully.`
            );

            window.setTimeout(async () => {
                await onApplicationSubmitted?.(
                    data.application
                );
            }, 900);
        } catch (error) {
            console.error(
                "Adoption application submit error:",
                error
            );

            showMessage(
                "error",
                "Server error while submitting the application. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (!pet?._id) {
        return (
            <section className="adoption-module-empty">
                <div className="adoption-module-empty-icon">
                    🐾
                </div>

                <h2>No animal selected</h2>

                <p>
                    Select an available animal from the
                    Browse Pets section before opening the
                    adoption application.
                </p>

                <button
                    type="button"
                    onClick={() => onBack?.()}
                >
                    Browse Available Pets
                </button>
            </section>
        );
    }

    return (
        <section className="adoption-module">
            <header className="adoption-module-header">
                <div>
                    <span>
                        Adoption Management
                    </span>

                    <h2>
                        Apply to adopt {pet.name}
                    </h2>

                    <p>
                        Complete the information below so
                        RescueBase staff can review your
                        application.
                    </p>
                </div>

                <button
                    type="button"
                    className="adoption-module-back"
                    onClick={requestLeave}
                    disabled={
                        submitting ||
                        documentUploading
                    }
                >
                    ← Back to Pets
                </button>
            </header>

            <nav className="adoption-tracker" aria-label="Application progress">
                <ol>
                    {trackerSteps.map((step, index) => (
                        <li
                            key={step.key}
                            className={`${step.done ? "is-done" : ""} ${
                                index === highlightedStep ? "is-current" : ""
                            }`}
                        >
                            <button type="button" onClick={() => scrollToStep(index)}>
                                <b>{step.done ? "✓" : index + 1}</b>
                                {step.label}
                            </button>
                        </li>
                    ))}
                </ol>

                <span className={`adoption-tracker-pill ${allStepsDone ? "is-ready" : ""}`}>
                    {allStepsDone
                        ? "Ready to submit"
                        : `Step ${highlightedStep + 1} of ${trackerSteps.length}`}
                </span>
            </nav>

            <div className="adoption-module-layout">
                <PetDetailPanel
                    className="browse-pet-details-panel"
                    pet={pet}
                    showApply={false}
                >
                    <div className="adoption-selected-pet-note">
                        <h3>Before submitting</h3>

                        <p>
                            Your application will be
                            reviewed by shelter staff. The
                            animal will temporarily become
                            unavailable while the
                            application is pending.
                        </p>
                    </div>
                </PetDetailPanel>

                <form
                    className="adoption-module-form"
                    onSubmit={handleSubmit} noValidate
                >
                    <section className="adoption-form-group" id="adoption-step-1" onFocus={() => setActiveStep(0)}>
                        <div className="adoption-form-heading adoption-form-heading--numbered">
                            <b className="adoption-step-number">1</b>
                            <div>
                                <h3>Applicant Information</h3>
                                <p>
                                    Tell us who you are and where the pet will live.
                                    Your email comes from your RescueBase account.
                                </p>
                            </div>
                        </div>

                        <div className="adoption-form-grid">
                            <label>
                                <span className="adoption-label-text">
                                    Full Name <em>*</em>
                                </span>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    placeholder="First and last name"
                                    autoComplete="name"
                                    className={errors.fullName ? "has-error" : ""}
                                    aria-invalid={Boolean(errors.fullName)}
                                    required
                                />
                                {errors.fullName && <small className="adoption-field-error">{errors.fullName}</small>}
                                </label>

                            <label>
                                Email Address
                                <span className="adoption-locked-field">
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        readOnly
                                        required
                                    />
                                    <LockIcon />
                                </span>
                                <small>Uses your registered RescueBase email.</small>
                            </label>

                            <label>
                                <span className="adoption-label-text">
                                    Phone Number <em>*</em>
                                </span>
                                <span className={`adoption-phone-field ${errors.phone ? "has-error" : ""}`}>
                                    <span className="adoption-phone-prefix">+63</span>
                                    <input
                                        type="tel"
                                        name="phone"
                                        inputMode="numeric"
                                        value={form.phone}
                                        onChange={handlePhoneChange}
                                        placeholder="9XX XXX XXXX"
                                        required
                                    />
                                </span>
                                {errors.phone && <small className="adoption-field-error">{errors.phone}</small>}
                                <small>We call or text this to schedule your interview.</small>
                            </label>

                            <div className="adoption-choice-field">
                                <span className="adoption-label-text">
                                    Home Type <em>*</em>
                                    <InfoTip text="Where the pet will live. This helps shelter staff check that the animal suits your home." />
                                </span>

                                <div className="adoption-choice-group" role="radiogroup" aria-label="Home type">
                                    {[
                                        { value: "House", label: "House" },
                                        { value: "Apartment", label: "Apartment" },
                                        { value: "Condominium", label: "Condo" },
                                        { value: "Boarding House", label: "Boarding House" },
                                        { value: "Other", label: "Other" },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={form.homeType === option.value}
                                            className={form.homeType === option.value ? "is-selected" : ""}
                                            onClick={() =>
                                                setForm((current) => ({
                                                    ...current,
                                                    homeType: option.value,
                                                }))
                                            }
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                {form.homeType === "Other" && (
                                    <>
                                        <input
                                            type="text"
                                            name="homeTypeOther"
                                            value={form.homeTypeOther || ""}
                                            onChange={handleChange}
                                            placeholder="Describe your home (e.g. townhouse, dorm, farm)"
                                            maxLength={60}
                                            autoFocus
                                            className={errors.homeTypeOther ? "has-error" : ""}
                                            aria-invalid={Boolean(errors.homeTypeOther)}
                                            required
                                        />
                                        {errors.homeTypeOther && (
                                            <small className="adoption-field-error">{errors.homeTypeOther}</small>
                                        )}
                                    </>
                                )}
                            </div>

                            <label className="adoption-form-wide">
                                <span className="adoption-label-text">
                                    Complete Address <em>*</em>
                                </span>
                            <textarea
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="House number, street, barangay, and city"
                                className={errors.address ? "has-error" : ""}
                                aria-invalid={Boolean(errors.address)}
                                required
                            />
                            {errors.address && <small className="adoption-field-error">{errors.address}</small>}
                            </label>
                        </div>
                    </section>

                    <section className="adoption-form-group" id="adoption-step-2" onFocus={() => setActiveStep(1)}>
                        <div className="adoption-form-heading adoption-form-heading--numbered">
                            <b className="adoption-step-number">2</b>
                            <div>
                                <h3>Household Information</h3>
                                <p>Helps us match {pet.name} with a safe, suitable home.</p>
                            </div>
                        </div>

                        <div className="adoption-form-grid">
                            {[
                                {
                                    name: "hasChildren",
                                    label: "Do you have children at home?",
                                    tip: "Includes any child under 18 who lives with you or visits often. Some animals are better suited to calm, adult-only homes.",
                                },
                                {
                                    name: "hasOtherPets",
                                    label: "Do you have other pets?",
                                    tip: "Dogs, cats, or any other animals in your home. Staff use this to check if the pet gets along with other animals.",
                                },
                            ].map((question) => (
                                <div className="adoption-choice-field" key={question.name}>
                                    <span className="adoption-label-text">
                                        {question.label} <em>*</em>
                                        <InfoTip text={question.tip} />
                                    </span>

                                    <div
                                        className="adoption-choice-group adoption-choice-group--yesno"
                                        role="radiogroup"
                                        aria-label={question.label}
                                    >
                                        {["Yes", "No"].map((answer) => (
                                            <button
                                                key={answer}
                                                type="button"
                                                role="radio"
                                                aria-checked={form[question.name] === answer}
                                                className={form[question.name] === answer ? "is-selected" : ""}
                                                onClick={() =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        [question.name]: answer,
                                                    }))
                                                }
                                            >
                                                {answer}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <label className="adoption-form-wide">
                                <span className="adoption-label-text">
                                    Why do you want to adopt {pet.name}? <em>*</em>
                                    <InfoTip text="Share what draws you to this pet and how they will fit into your daily life. Honest answers help staff during your interview." />
                                </span>
                                <span className="adoption-textarea-wrap">
                                    <textarea
                                        name="reason"
                                        value={form.reason}
                                        onChange={handleChange}
                                        placeholder="Tell us why you want to provide this animal with a permanent home."
                                        maxLength={500}
                                        className={errors.reason ? "has-error" : ""}
                                        aria-invalid={Boolean(errors.reason)}
                                        required
                                    />
                                    <span className="adoption-char-count">{form.reason.length} / 500</span>
                                </span>
                                {errors.reason && <small className="adoption-field-error">{errors.reason}</small>}
                            </label>

                            <label className="adoption-form-wide">
                                <span className="adoption-label-text">
                                    Previous pet-care experience <em>*</em>
                                    <InfoTip text="Mention pets you have owned or cared for, how long, and any training or vet care you handled. No experience is okay, just write None." />
                                </span>
                                <span className="adoption-textarea-wrap">
                                    <textarea
                                        name="experience"
                                        value={form.experience}
                                        onChange={handleChange}
                                        placeholder='Describe your experience caring for animals, or write "None".'
                                        maxLength={500}
                                        className={errors.experience ? "has-error" : ""}
                                        aria-invalid={Boolean(errors.experience)}
                                        required
                                    />
                                    <span className="adoption-char-count">{form.experience.length} / 500</span>
                                </span>
                                {errors.experience && <small className="adoption-field-error">{errors.experience}</small>}
                            </label>
                        </div>
                    </section>

                    <section className="adoption-form-group" id="adoption-step-3" onFocus={() => setActiveStep(2)}>
                        <div className="adoption-form-heading adoption-form-heading--numbered">
                            <b className="adoption-step-number">3</b>
                            <div>
                                <h3>Identification Document</h3>
                                <p>We only use this to verify who you are. It is seen by shelter staff only.</p>
                            </div>
                        </div>

                        <div className="adoption-id-field">
                            <span className="adoption-label-text">
                                Upload identification image <em>*</em>
                                <InfoTip text="A clear photo of any valid ID, such as a National ID, driver's license, passport, or school ID. Make sure your name and photo are readable." />
                            </span>

                            {!document && (
                                <label
                                    className={`adoption-dropzone ${dragActive ? "is-dragging" : ""} ${errors.document ? "has-error" : ""} ${documentUploading ? "is-uploading" : ""}`}
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        setDragActive(true);
                                    }}
                                    onDragLeave={() => setDragActive(false)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setDragActive(false);
                                        if (!documentUploading && !submitting) {
                                            handleDocumentUpload(event);
                                        }
                                    }}
                                >
                                    <input
                                        type="file"
                                        name="document"
                                        className="adoption-dropzone-input"
                                        accept="image/png,image/jpeg,image/jpg,image/webp"
                                        onChange={handleDocumentUpload}
                                        disabled={documentUploading || submitting}
                                    />

                                    <span className="adoption-dropzone-icon" aria-hidden="true">
                                        <svg viewBox="0 0 24 24">
                                            <path d="M12 16V4" />
                                            <path d="m7 9 5-5 5 5" />
                                            <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                                        </svg>
                                    </span>

                                    <span className="adoption-dropzone-text">
                                        <strong>
                                            {documentUploading ? "Uploading your ID..." : "Drag and drop your ID here"}
                                        </strong>
                                        <small>or click to browse from your device</small>
                                        <span className="adoption-dropzone-tags">
                                            {["PNG", "JPG", "JPEG", "WEBP", "Max 5 MB"].map((tag) => (
                                                <span key={tag}>{tag}</span>
                                            ))}
                                        </span>
                                    </span>

                                    <span className="adoption-dropzone-button">Choose File</span>
                                </label>
                            )}

                            {errors.document && <small className="adoption-field-error">{errors.document}</small>}
                        </div>

                        {document && (
                            <div className="adoption-document-preview">
                                <img src={document.documentUrl} alt="Uploaded identification document" />

                                <div>
                                    <strong>{document.documentName}</strong>
                                    <span>Pending shelter verification</span>
                                    <button
                                        type="button"
                                        onClick={removeDocument}
                                        disabled={submitting || documentUploading}
                                    >
                                        Remove Document
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    {message && (
                        <div
                            className={`adoption-module-message ${messageType}`}
                        >
                            {message}
                        </div>
                    )}

                    <div className="adoption-module-actions">
                        <button
                            type="button"
                            className="adoption-cancel-button"
                            onClick={requestLeave}
                            disabled={
                                submitting ||
                                documentUploading
                            }
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="adoption-cancel-button"
                            onClick={() => {
                                localStorage.removeItem(DRAFT_KEY);
                                setForm({
                                    fullName: "",
                                    email: savedUser.email || "",
                                    phone: "",
                                    address: "",
                                    homeType: "House",
                                    homeTypeOther: "",
                                    hasChildren: "No",
                                    hasOtherPets: "No",
                                    reason: "",
                                    experience: "",
                                });
                                setDocument(null);
                                setDraftSavedAt(null);
                                showMessage("success", "Form cleared. You can start over.");
                                window.setTimeout(() => setMessage(""), 3000);
                            }}
                            disabled={submitting || documentUploading}
                        >
                            Clear Form
                        </button>

                        <button
                            type="submit"
                            className="adoption-submit-button"
                            disabled={
                                submitting ||
                                documentUploading
                            }
                        >
                            {documentUploading
                                ? "Uploading document..."
                                : submitting
                                    ? "Submitting application..."
                                    : `Submit Application for ${pet.name}`}
                        </button>
                    </div>

                     {hasProgress && draftSavedAt && (
                        <small className="adoption-draft-note">
                            ✓ Draft saved at{" "}
                            {new Date(draftSavedAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                            })}
                        </small>
                    )}
                </form>
            </div>

            {leaveOpen && (
                <div
                    className="adopter-confirm-backdrop"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="leave-application-title"
                    onClick={() => setLeaveOpen(false)}
                >
                    <div
                        className="adopter-confirm"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="adopter-confirm-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 8v4M12 16h.01" />
                            </svg>
                        </div>

                        <h3 id="leave-application-title">
                            Leave your application?
                        </h3>

                        <p>
                            You've filled in part of the form for{" "}
                            <strong>{pet.name}</strong>. If you leave now,
                            your answers won't be saved.
                        </p>

                        <div className="adopter-confirm-actions">
                            <button
                                type="button"
                                className="adopter-confirm-keep"
                                onClick={() => setLeaveOpen(false)}
                                autoFocus
                            >
                                Keep editing
                            </button>

                            <button
                                type="button"
                                className="adopter-confirm-leave"
                                onClick={() => {
                                    setLeaveOpen(false);
                                    onBack?.();
                                }}
                            >
                                Leave form
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}