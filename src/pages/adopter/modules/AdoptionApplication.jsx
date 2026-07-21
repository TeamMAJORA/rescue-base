import { useState } from "react";
import "../../../styles/adopter/AdoptionApplication.css";

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

export default function AdoptionApplication({
    pet,
    onBack,
    onApplicationSubmitted,
}) {
    const savedUser = getSavedUser();

    const [form, setForm] = useState({
        fullName:
            savedUser.name ||
            savedUser.username ||
            "",

        email: savedUser.email || "",
        phone: "",
        address: "",

        homeType: "House",
        hasChildren: "No",
        hasOtherPets: "No",

        reason: "",
        experience: "",
    });

    const [document, setDocument] = useState(null);

    const [documentUploading, setDocumentUploading] =
        useState(false);

    const [submitting, setSubmitting] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [messageType, setMessageType] =
        useState("");

    function showMessage(type, text) {
        setMessageType(type);
        setMessage(text);
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((currentForm) => ({
            ...currentForm,
            [name]: value,
        }));
    }

    async function handleDocumentUpload(event) {
        const file = event.target.files?.[0];

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

        if (
            !form.fullName.trim() ||
            !form.email.trim() ||
            !form.phone.trim() ||
            !form.address.trim()
        ) {
            showMessage(
                "error",
                "Please complete all applicant information."
            );

            return;
        }

        if (!form.reason.trim()) {
            showMessage(
                "error",
                "Please explain why you want to adopt this animal."
            );

            return;
        }

        try {
            setSubmitting(true);
            showMessage("", "");

            const payload = {
                applicantUserId:
                    savedUser._id || null,

                fullName: form.fullName.trim(),

                email: form.email
                    .trim()
                    .toLowerCase(),

                phone: form.phone.trim(),
                address: form.address.trim(),

                animalId: pet._id,

                homeType: form.homeType,
                hasChildren: form.hasChildren,
                hasOtherPets: form.hasOtherPets,

                reason: form.reason.trim(),

                experience:
                    form.experience.trim(),

                documents: document
                    ? [document]
                    : [],
            };

            const response = await fetch(
                `${API}/api/adoptions`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
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
                    onClick={() => onBack?.()}
                    disabled={
                        submitting ||
                        documentUploading
                    }
                >
                    ← Back to Pets
                </button>
            </header>

            <div className="adoption-module-layout">
                <aside className="adoption-selected-pet">
                    <div className="adoption-selected-pet-image">
                        {pet.image ? (
                            <img
                                src={pet.image}
                                alt={pet.name}
                            />
                        ) : (
                            <span>🐾</span>
                        )}
                    </div>

                    <span
                        className={`adopter-status ${
                            pet.status ||
                            "available"
                        }`}
                    >
                        {String(
                            pet.status ||
                                "available"
                        ).replace("_", " ")}
                    </span>

                    <h2>{pet.name}</h2>

                    <p>
                        {pet.type || "Pet"} •{" "}
                        {pet.breed ||
                            "Unknown breed"}
                    </p>

                    <div className="adoption-selected-pet-details">
                        <article>
                            <span>Age</span>
                            <strong>
                                {pet.age ||
                                    "Unknown"}
                            </strong>
                        </article>

                        <article>
                            <span>Gender</span>
                            <strong>
                                {pet.gender ||
                                    "Unknown"}
                            </strong>
                        </article>

                        <article>
                            <span>Size</span>
                            <strong>
                                {pet.size ||
                                    "Unknown"}
                            </strong>
                        </article>

                        <article>
                            <span>Location</span>
                            <strong>
                                {pet.location ||
                                    "RescueBase Shelter"}
                            </strong>
                        </article>
                    </div>

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
                </aside>

                <form
                    className="adoption-module-form"
                    onSubmit={handleSubmit}
                >
                    <section className="adoption-form-group">
                        <div className="adoption-form-heading">
                            <span>Step 1</span>
                            <h3>
                                Applicant Information
                            </h3>
                        </div>

                        <div className="adoption-form-grid">
                            <label>
                                Full Name

                                <input
                                    type="text"
                                    name="fullName"
                                    value={
                                        form.fullName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                />
                            </label>

                            <label>
                                Email Address

                                <input
                                    type="email"
                                    name="email"
                                    value={
                                        form.email
                                    }
                                    readOnly
                                    required
                                />

                                <small>
                                    This uses your
                                    registered RescueBase
                                    email.
                                </small>
                            </label>

                            <label>
                                Phone Number

                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="09XXXXXXXXX"
                                    required
                                />
                            </label>

                            <label>
                                Home Type

                                <select
                                    name="homeType"
                                    value={
                                        form.homeType
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                >
                                    <option value="House">
                                        House
                                    </option>

                                    <option value="Apartment">
                                        Apartment
                                    </option>

                                    <option value="Condominium">
                                        Condominium
                                    </option>

                                    <option value="Boarding House">
                                        Boarding House
                                    </option>

                                    <option value="Other">
                                        Other
                                    </option>
                                </select>
                            </label>

                            <label className="adoption-form-wide">
                                Complete Address

                                <textarea
                                    name="address"
                                    value={
                                        form.address
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="House number, street, barangay, city, and province"
                                    required
                                />
                            </label>
                        </div>
                    </section>

                    <section className="adoption-form-group">
                        <div className="adoption-form-heading">
                            <span>Step 2</span>
                            <h3>
                                Household Information
                            </h3>
                        </div>

                        <div className="adoption-form-grid">
                            <label>
                                Do you have children at
                                home?

                                <select
                                    name="hasChildren"
                                    value={
                                        form.hasChildren
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                >
                                    <option value="No">
                                        No
                                    </option>

                                    <option value="Yes">
                                        Yes
                                    </option>
                                </select>
                            </label>

                            <label>
                                Do you have other pets?

                                <select
                                    name="hasOtherPets"
                                    value={
                                        form.hasOtherPets
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                >
                                    <option value="No">
                                        No
                                    </option>

                                    <option value="Yes">
                                        Yes
                                    </option>
                                </select>
                            </label>

                            <label className="adoption-form-wide">
                                Why do you want to adopt{" "}
                                {pet.name}?

                                <textarea
                                    name="reason"
                                    value={
                                        form.reason
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Tell us why you want to provide this animal with a permanent home."
                                    required
                                />
                            </label>

                            <label className="adoption-form-wide">
                                Previous pet-care
                                experience

                                <textarea
                                    name="experience"
                                    value={
                                        form.experience
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Describe your experience caring for animals, or write None."
                                />
                            </label>
                        </div>
                    </section>

                    <section className="adoption-form-group">
                        <div className="adoption-form-heading">
                            <span>Step 3</span>
                            <h3>
                                Identification Document
                            </h3>
                        </div>

                        <div className="adoption-document-upload">
                            <label>
                                Upload identification image

                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    onChange={
                                        handleDocumentUpload
                                    }
                                    disabled={
                                        documentUploading ||
                                        submitting
                                    }
                                />

                                <small>
                                    PNG, JPG, JPEG, or WEBP.
                                    Maximum file size is 5
                                    MB.
                                </small>
                            </label>
                        </div>

                        {document && (
                            <div className="adoption-document-preview">
                                <img
                                    src={
                                        document.documentUrl
                                    }
                                    alt="Uploaded identification document"
                                />

                                <div>
                                    <strong>
                                        {
                                            document.documentName
                                        }
                                    </strong>

                                    <span>
                                        Pending shelter
                                        verification
                                    </span>

                                    <button
                                        type="button"
                                        onClick={
                                            removeDocument
                                        }
                                        disabled={
                                            submitting ||
                                            documentUploading
                                        }
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
                            onClick={() =>
                                onBack?.()
                            }
                            disabled={
                                submitting ||
                                documentUploading
                            }
                        >
                            Cancel
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
                </form>
            </div>
        </section>
    );
}