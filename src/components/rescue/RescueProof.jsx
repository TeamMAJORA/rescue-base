import { useState } from "react";
import "../../styles/components/RescueProof.css";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const MAX_PROOF_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function uploadProofPhoto(file) {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) throw new Error("Please choose a PNG, JPG or WEBP image.");
    if (file.size > MAX_PHOTO_BYTES) throw new Error("Image is too large. Max 5 MB.");

    const formData = new FormData();
    formData.append("folder", "rescuebase/rescue-proof");
    formData.append("image", file);

    const response = await fetch(`${API}/api/uploads/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, // the browser sets Content-Type for files
        body: formData,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) throw new Error(data.message || "Photo upload failed.");

    return data.imageUrl;
}

// Asked when a volunteer (or staff on the job) marks a rescue as completed
export function CompleteWithProofModal({ assignment, onSubmit, onClose }) {
    const [completionNotes, setCompletionNotes] = useState("");
    const [completionPhotos, setCompletionPhotos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handlePhotosChosen(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length) return;

        if (completionPhotos.length + files.length > MAX_PROOF_PHOTOS) {
            setError(`Add up to ${MAX_PROOF_PHOTOS} photos only.`);
            return;
        }

        try {
            setUploading(true);
            setError("");
            const uploadedUrls = [];
            for (const file of files) uploadedUrls.push(await uploadProofPhoto(file));
            setCompletionPhotos((current) => [...current, ...uploadedUrls]);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!completionNotes.trim()) return setError("Describe what was done.");
        if (completionPhotos.length === 0) return setError("Add at least one photo as proof.");

        try {
            setSubmitting(true);
            setError("");
            await onSubmit({ completionNotes: completionNotes.trim(), completionPhotos });
        } catch (err) {
            setError(err.message || "Could not complete the rescue.");
            setSubmitting(false);
        }
    }

    return (
        <div className="ao-confirm-backdrop" onClick={onClose}>
            <form
                className="ao-confirm rp-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="rp-complete-title"
                onClick={(event) => event.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <h3 id="rp-complete-title">Complete "{assignment.title}"</h3>
                <p>Staff will be notified and can see your notes and photos.</p>

                <label className="rp-field">
                    <span>
                        What was done? <em>*</em>
                    </span>
                    <textarea
                        rows={3}
                        value={completionNotes}
                        maxLength={1000}
                        placeholder="e.g. Walked 6 dogs for 30 minutes each, all returned to kennels"
                        onChange={(event) => setCompletionNotes(event.target.value)}
                    />
                </label>

                <div className="rp-field">
                    <span>
                        Proof photos <em>*</em> <small>(1–{MAX_PROOF_PHOTOS})</small>
                    </span>
                    <div className="rp-photos">
                        {completionPhotos.map((url) => (
                            <span key={url} className="rp-photo">
                                <img src={url} alt="Proof" />
                                <button
                                    type="button"
                                    aria-label="Remove photo"
                                    onClick={() => setCompletionPhotos((current) => current.filter((item) => item !== url))}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                        {completionPhotos.length < MAX_PROOF_PHOTOS && (
                            <label className={`rp-add${uploading ? " is-busy" : ""}`}>
                                {uploading ? "Uploading..." : "+ Add photo"}
                                <input
                                    type="file"
                                    accept={ALLOWED_PHOTO_TYPES.join(",")}
                                    multiple
                                    disabled={uploading}
                                    onChange={handlePhotosChosen}
                                />
                            </label>
                        )}
                    </div>
                </div>

                {error && <p className="rp-error" role="alert">{error}</p>}

                <div className="ao-confirm-actions">
                    <button type="button" onClick={onClose} disabled={submitting}>
                        Cancel
                    </button>
                    <button type="submit" className="ao-confirm-ok" disabled={uploading || submitting}>
                        {submitting ? "Submitting..." : "Complete rescue"}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Staff view of what the volunteer submitted
export function RescueProofModal({ assignment, onClose }) {
    const completedAt = assignment.completedAt
        ? new Date(assignment.completedAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
        : "";
    const photos = assignment.completionPhotos || [];

    return (
        <div className="ao-confirm-backdrop" onClick={onClose}>
            <div
                className="ao-confirm rp-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="rp-view-title"
                onClick={(event) => event.stopPropagation()}
            >
                <h3 id="rp-view-title">Proof: {assignment.title}</h3>
                <p>
                    Completed by {assignment.volunteerName || "volunteer"}
                    {completedAt ? ` · ${completedAt}` : ""}
                </p>

                <div className="rp-field">
                    <span>What was done</span>
                    <p className="rp-notes">{assignment.completionNotes || "No notes given."}</p>
                </div>

                <div className="rp-field">
                    <span>Photos</span>
                    {photos.length === 0 ? (
                        <p className="rp-notes">No photos (completed before proof was required).</p>
                    ) : (
                        <div className="rp-photos is-large">
                            {photos.map((url) => (
                                <a key={url} className="rp-photo" href={url} target="_blank" rel="noreferrer" title="Open full size">
                                    <img src={url} alt="Proof" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                <div className="ao-confirm-actions">
                    <button type="button" className="ao-confirm-ok" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
