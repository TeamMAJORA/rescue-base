import { useState } from "react";
import "../../../styles/adopter/AdoptionApplication.css";
import PetDetailPanel from "../../../components/adopter/PetDetailPanel";
import InfoTip from "../../../components/system/InfoTip";
import PetTypeIcon from "../../../components/system/PetTypeIcon";
import { formatTime } from "../../../utils/formatDate";
import Icon from "../../../components/system/Icon";
import PhoneInput from "../../../components/system/PhoneInput";
import RequiredValue from "../../../components/system/RequiredValue";
import FormTracker from "../../../components/system/FormTracker";
import { readFormDraft, useFormDraft } from "../../../utils/useFormDraft";

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

    const [form, setForm] = useState(() => readFormDraft(DRAFT_KEY)?.form || {
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

    const [leaveOpen, setLeaveOpen] = useState(false);

    const [document, setDocument] = useState(() => readFormDraft(DRAFT_KEY)?.document || null);
    const [documentUploading, setDocumentUploading] =
        useState(false);

    const [submitting, setSubmitting] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [messageType, setMessageType] =
        useState("");

    const [activeStep, setActiveStep] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const hasProgress = Boolean(
        form.fullName || form.phone || form.address || form.reason || form.experience || document
    );
    const { draftSavedAt, clearDraft } = useFormDraft(DRAFT_KEY, { form, document }, hasProgress);
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

    const firstUnfinishedStep = trackerSteps.findIndex((step) => !step.done);
    const highlightedStep =
        activeStep ?? (firstUnfinishedStep === -1 ? trackerSteps.length - 1 : firstUnfinishedStep);

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
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true"
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
                        "ngrok-skip-browser-warning": "true",
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
            clearDraft();
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
                    <PetTypeIcon />
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
                    Browse available pets
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
                    <Icon name="arrow-left" /> Back to Pets
                </button>
            </header>

            <FormTracker
                steps={trackerSteps}
                currentIndex={highlightedStep}
                onSelect={scrollToStep}
                label="Application progress"
            />

            <div className="adoption-module-layout">
                <PetDetailPanel
                    className="browse-pet-details-panel"
                    pet={pet}
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
                    onSubmit={handleSubmit}
                >
                    <section className="adoption-form-group" id="adoption-step-1" onFocus={() => setActiveStep(0)}>
                        <div className="adoption-form-heading adoption-form-heading--numbered">
                            <b className="adoption-step-number">1</b>
                            <div>
                                <h3>Applicant information</h3>
                                <p>
                                    Tell us who you are and where the pet will live.
                                    Your email comes from your RescueBase account.
                                </p>
                            </div>
                        </div>

                        <div className="adoption-form-grid">
                            <label>
                                <span className="adoption-label-text">
                                    Full name <span className="required-mark">*</span>
                                </span>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    placeholder="First and last name"
                                    autoComplete="name"
                                    data-required-message="Enter your full name."
                                    required
                                />
                                </label>

                            <label>
                                Email address
                                <span className="adoption-locked-field">
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        autoComplete="email"
                                        readOnly
                                        required
                                    />
                                    <LockIcon />
                                </span>
                                <small>Uses your registered RescueBase email.</small>
                            </label>

                            <label>
                                <span className="adoption-label-text">
                                    Phone number <span className="required-mark">*</span>
                                </span>
                                <PhoneInput
                                    name="phone"
                                    value={form.phone}
                                    onDigitsChange={(phone) => {
                                        setMessage("");
                                        setForm((current) => ({ ...current, phone }));
                                    }}
                                    data-required-message="Enter your phone number."
                                    required
                                />
                                <small>We call or text this to schedule your interview.</small>
                            </label>

                            <div className="adoption-choice-field">
                                <span className="adoption-label-text">
                                    Home Type <span className="required-mark">*</span>
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
                                            data-required-message="Describe your home type."
                                            required
                                        />
                                    </>
                                )}
                            </div>

                            <label className="adoption-form-wide">
                                <span className="adoption-label-text">
                                    Complete address <span className="required-mark">*</span>
                                </span>
                            <textarea
                                name="address"
                                value={form.address}
                                autoComplete="street-address"
                                onChange={handleChange}
                                placeholder="House number, street, barangay, and city"
                                data-required-message="Enter your complete address."
                                required
                            />
                            </label>
                        </div>
                    </section>

                    <section className="adoption-form-group" id="adoption-step-2" onFocus={() => setActiveStep(1)}>
                        <div className="adoption-form-heading adoption-form-heading--numbered">
                            <b className="adoption-step-number">2</b>
                            <div>
                                <h3>Household information</h3>
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
                                        {question.label} <span className="required-mark">*</span>
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
                                    Why do you want to adopt {pet.name}? <span className="required-mark">*</span>
                                    <InfoTip text="Share what draws you to this pet and how they will fit into your daily life. Honest answers help staff during your interview." />
                                </span>
                                <span className="adoption-textarea-wrap">
                                    <textarea
                                        name="reason"
                                        value={form.reason}
                                        onChange={handleChange}
                                        placeholder="Tell us why you want to provide this animal with a permanent home."
                                        maxLength={500}
                                        data-required-message={`Tell us why you want to adopt ${pet.name}.`}
                                        required
                                    />
                                    <span className="adoption-char-count">{form.reason.length} / 500</span>
                                </span>
                            </label>

                            <label className="adoption-form-wide">
                                <span className="adoption-label-text">
                                    Previous pet-care experience <span className="required-mark">*</span>
                                    <InfoTip text="Mention pets you have owned or cared for, how long, and any training or vet care you handled. No experience is okay, just write None." />
                                </span>
                                <span className="adoption-textarea-wrap">
                                    <textarea
                                        name="experience"
                                        value={form.experience}
                                        onChange={handleChange}
                                        placeholder='Describe your experience caring for animals, or write "None".'
                                        maxLength={500}
                                        data-required-message='Describe your pet-care experience, or write "None".'
                                        required
                                    />
                                    <span className="adoption-char-count">{form.experience.length} / 500</span>
                                </span>
                            </label>
                        </div>
                    </section>

                    <section className="adoption-form-group" id="adoption-step-3" onFocus={() => setActiveStep(2)}>
                        <div className="adoption-form-heading adoption-form-heading--numbered">
                            <b className="adoption-step-number">3</b>
                            <div>
                                <h3>Identification document</h3>
                                <p>We only use this to verify who you are. It is seen by shelter staff only.</p>
                            </div>
                        </div>

                        <div className="adoption-id-field">
                            <span className="adoption-label-text">
                                Upload identification image <span className="required-mark">*</span>
                                <InfoTip text="A clear photo of any valid ID, such as a National ID, driver's license, passport, or school ID. Make sure your name and photo are readable." />
                            </span>

                            {!document && (
                                <label
                                    className={`adoption-dropzone ${dragActive ? "is-dragging" : ""} ${documentUploading ? "is-uploading" : ""}`}
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
                                            {documentUploading ? "Uploading your ID…" : "Drag and drop your ID here"}
                                        </strong>
                                        <small>or click to browse from your device</small>
                                        <span className="adoption-dropzone-tags">
                                            {["PNG", "JPG", "JPEG", "WEBP", "Max 5 MB"].map((tag) => (
                                                <span key={tag}>{tag}</span>
                                            ))}
                                        </span>
                                    </span>

                                    <span className="adoption-dropzone-button">Choose file</span>
                                </label>
                            )}

                            <RequiredValue value={document?.documentUrl} message="Upload a photo of a valid ID." />
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
                                        Remove document
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
                                clearDraft();
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
                                showMessage("success", "Form cleared. You can start over.");
                                window.setTimeout(() => setMessage(""), 3000);
                            }}
                            disabled={submitting || documentUploading}
                        >
                            Clear form
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
                                ? "Uploading document…"
                                : submitting
                                    ? "Submitting application…"
                                    : `Submit Application for ${pet.name}`}
                        </button>
                    </div>

                    {hasProgress && draftSavedAt && (
                        <small className="form-draft-note">
                            <Icon name="check" /> Draft saved at{" "}
                            {formatTime(draftSavedAt)}
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
                            <strong>{pet.name}</strong>. Your answers stay saved
                            on this device, so you can finish later.
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