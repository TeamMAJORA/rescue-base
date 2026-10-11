import { useEffect, useMemo, useState } from "react";

// Medical Assistance — foster asks for help, Admin & Staff resolve it in Foster Care.
// Sends to /api/foster/assignments/:id/medical-requests (the route Admin & Staff read).

const API = import.meta.env.VITE_BACKEND_URL;

const OTHER = "__other";

const ISSUE_TYPES = [
    "Injury",
    "Loss of Appetite",
    "Vomiting",
    "Diarrhea",
    "Difficulty Walking",
    "Skin Problem",
];

const URGENCY = [
    { value: "Low", hint: "Can wait", tone: "low" },
    { value: "Medium", hint: "This week", tone: "medium" },
    { value: "High", hint: "Within a day", tone: "high" },
    { value: "Emergency", hint: "Right now", tone: "emergency" },
];

const URGENCY_TAG = { Low: "", Medium: "orange", High: "red", Emergency: "red" };

const STATUS = {
    pending: { label: "Pending", tone: "orange" },
    in_progress: { label: "In progress", tone: "blue" },
    resolved: { label: "Resolved", tone: "green" },
};

// ---------- Shared UI pieces (stats strip, tabs, search bar) ----------

const ICONS = {
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
        </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    list: <path d="M4 6h16M4 12h16M4 18h10" />,
    paw: (
        <>
            <circle cx="11" cy="4" r="2" />
            <circle cx="18" cy="8" r="2" />
            <circle cx="4" cy="8" r="2" />
            <path d="M8 14c0-2 2-4 4-4s4 2 4 4-1 6-4 6-4-4-4-6z" />
        </>
    ),
    bell: (
        <>
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    calendar: (
        <>
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M8 2v4M16 2v4M3 10h18" />
        </>
    ),
    alert: (
        <>
            <path d="M12 3 2 21h20z" />
            <path d="M12 10v4M12 17.5v.01" />
        </>
    ),
    camera: (
        <>
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
        </>
    ),
};

function Icon({ name, size = 15 }) {
    return (
        <svg
            className="ao-icon"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {ICONS[name]}
        </svg>
    );
}

function StatsStrip({ highlight, items }) {
    return (
        <div className="ao-strip">
            <div className="ao-strip-cta">
                <div>
                    <b>{highlight.value}</b>
                    <small>{highlight.label}</small>
                </div>
            </div>

            {items.map((item) => (
                <div className="ao-strip-item" key={item.label}>
                    <div className="ao-strip-label">
                        <Icon name={item.icon} />
                        {item.label}
                    </div>
                    <div className="ao-strip-value">
                        {item.value}
                        {item.note && <em>{item.note}</em>}
                    </div>
                </div>
            ))}
        </div>
    );
}

function Tabs({ tabs, value, onChange }) {
    return (
        <div className="ao-tabs" role="tablist">
            {tabs.map((tab) => (
                <button
                    type="button"
                    key={tab.value}
                    role="tab"
                    aria-selected={value === tab.value}
                    className={value === tab.value ? "active" : ""}
                    onClick={() => onChange(tab.value)}
                >
                    {tab.label}
                    {tab.count > 0 && <i>{tab.count}</i>}
                </button>
            ))}
        </div>
    );
}

function daysBetween(from, to = new Date()) {
    const a = new Date(from);
    const b = new Date(to);
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 86400000);
}

function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function relativeDay(value) {
    const days = daysBetween(value);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    return `${days} days ago`;
}

async function uploadPhoto(file, token) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API}/api/uploads/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to upload the photo.");
    }

    return data.imageUrl;
}


// Shown when the foster has no active assignment, so the page layout still appears
const EMPTY_ASSIGNMENT = {
    _id: "",
    petName: "your foster pet",
    updates: [],
    medicalRequests: [],
    behaviorEvaluation: null,
};

export default function MedicalAssistance({ assignment: assignedPet, refreshAssignment }) {
    const hasAssignment = Boolean(assignedPet);
    const assignment = assignedPet || EMPTY_ASSIGNMENT;
    const NO_ASSIGNMENT_TEXT = "Once the shelter assigns you a pet, you can request medical help here.";

    const token = localStorage.getItem("token");

    const [issueType, setIssueType] = useState("");
    const [issueOther, setIssueOther] = useState("");
    const [urgency, setUrgency] = useState("Medium");
    const [description, setDescription] = useState("");
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("success");
    const [tab, setTab] = useState("all");

    useEffect(() => {
        if (!photo) {
            setPhotoPreview("");
            return undefined;
        }
        const url = URL.createObjectURL(photo);
        setPhotoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photo]);

    const requests = useMemo(
        () =>
            [...(assignment?.medicalRequests || [])].sort(
                (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            ),
        [assignment]
    );


    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setLoading(true);
            setMessage("");

            const photoUrl = photo ? await uploadPhoto(photo, token) : "";
            const type = issueType === OTHER ? issueOther.trim() : issueType;

            const response = await fetch(
                `${API}/api/foster/assignments/${assignment._id}/medical-requests`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        issueType: type,
                        // Admin & Staff see "issue", so lead with the type
                        issue: `${type}: ${description.trim()}`,
                        urgency,
                        photoUrl,
                    }),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Unable to send the request.");
            }

            setIssueType("");
            setIssueOther("");
            setUrgency("Medium");
            setDescription("");
            setPhoto(null);
            setMessage("Request sent. The shelter will reply here.");
            setMessageType("success");
            await refreshAssignment?.();
        } catch (error) {
            setMessage(error.message || "Something went wrong.");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    }

    // Older requests saved "Type: description" in issue — split for display
    function splitIssue(request) {
        const type = request.issueType || "";
        let text = request.issue || "";
        if (type && text.startsWith(`${type}:`)) text = text.slice(type.length + 1).trim();
        return { type: type || "Medical request", text };
    }

    const open = requests.filter((r) => r.status !== "resolved");
    const inProgress = requests.filter((r) => r.status === "in_progress").length;
    const resolved = requests.filter((r) => r.status === "resolved").length;
    const last = requests[0];

    const shown =
        tab === "open"
            ? open
            : tab === "resolved"
              ? requests.filter((r) => r.status === "resolved")
              : requests;

    return (
        <section className="ao-page">
            {!hasAssignment && (
                <div className="ao-banner orange">
                    <svg className="ao-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v4M12 16v.01" />
                    </svg>
                    <div>
                        <b>No foster pet assigned yet</b>
                        {NO_ASSIGNMENT_TEXT}
                    </div>
                </div>
            )}
            <StatsStrip
                highlight={{
                    value: open.length,
                    label:
                        open.length === 0
                            ? "No open requests"
                            : open.length === 1
                              ? "Open request — the shelter is looking into it"
                              : "Open requests — the shelter is looking into them",
                }}
                items={[
                    { icon: "clock", label: "In progress", value: inProgress },
                    { icon: "check", label: "Resolved", value: resolved },
                    {
                        icon: "calendar",
                        label: "Last request",
                        value: last
                            ? new Date(last.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "—",
                        note: last ? relativeDay(last.createdAt) : "",
                    },
                ]}
            />

            {message && <div className={`ao-alert ${messageType}`}>{message}</div>}

            <div className="ao-layout">
                {/* ---------- FORM ---------- */}
                <section className="ao-card">
                    <h2>Request Medical Help</h2>
                    <p className="ao-hint">Tell the shelter what's wrong. Staff will reply here.</p>

                    <form className="ao-form" onSubmit={handleSubmit}>
                        <fieldset className="ao-fieldset" disabled={!hasAssignment}>
                        <label className="ao-field">
                            <span>Pet</span>
                            <input value={assignment.petName} readOnly />
                        </label>

                        <label className="ao-field">
                            <span>What's wrong? <span className="ao-req">*</span></span>
                            <select value={issueType} onChange={(e) => setIssueType(e.target.value)} required>
                                <option value="">Select a problem</option>
                                {ISSUE_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                                <option value={OTHER}>Other (type your own)</option>
                            </select>
                            {issueType === OTHER && (
                                <input
                                    value={issueOther}
                                    onChange={(e) => setIssueOther(e.target.value)}
                                    placeholder="Describe the problem in a few words..."
                                    required
                                />
                            )}
                        </label>

                        <div className="ao-field">
                            <span>How urgent? <span className="ao-req">*</span></span>
                            <div className="ao-urgency">
                                {URGENCY.map((u) => (
                                    <button
                                        type="button"
                                        key={u.value}
                                        className={`${u.tone}${urgency === u.value ? " on" : ""}`}
                                        aria-pressed={urgency === u.value}
                                        onClick={() => setUrgency(u.value)}
                                    >
                                        {u.value}
                                        <small>{u.hint}</small>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="ao-field">
                            <span>Describe the Problem <span className="ao-req">*</span></span>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What happened, since when, any other symptoms..."
                                required
                            />
                        </label>

                        <label className="ao-photo">
                            {photoPreview ? (
                                <>
                                    <img className="ao-photo-preview" src={photoPreview} alt="Selected" />
                                    <span>Tap to change photo</span>
                                </>
                            ) : (
                                <>
                                    <Icon name="camera" size={26} />
                                    <b>Add a photo</b>
                                    <span>Optional · helps staff see the problem</span>
                                </>
                            )}
                            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                        </label>

                        <button type="submit" className="ao-btn primary block" disabled={loading}>
                            {loading ? "Sending..." : "Send Request"}
                        </button>
                    </fieldset>
                    </form>
                </section>

                {/* ---------- MY REQUESTS ---------- */}
                <section className="ao-card">
                    <div className="ao-list-head">
                        <Tabs
                            tabs={[
                                { value: "all", label: "All" },
                                { value: "open", label: "Open", count: open.length },
                                { value: "resolved", label: "Resolved" },
                            ]}
                            value={tab}
                            onChange={setTab}
                        />
                    </div>

                    {shown.length === 0 ? (
                        <p className="ao-empty">
                            {requests.length === 0 ? "No medical requests sent yet." : "Nothing here."}
                        </p>
                    ) : (
                        <div className="ao-list">
                            {shown.map((request) => {
                                const { type, text } = splitIssue(request);
                                const st = STATUS[request.status] || STATUS.pending;
                                const isOpen = request.status !== "resolved";

                                return (
                                    <article key={request._id} className={`ao-item ao-med-item${isOpen ? " flag" : ""}`}>
                                        <div className="ao-avatar">
                                            <Icon name={isOpen ? "alert" : "check"} size={18} />
                                        </div>

                                        <div>
                                            <h3>
                                                {type}
                                                <span className={`ao-tag ${URGENCY_TAG[request.urgency] || ""} ao-type-badge`}>
                                                    {request.urgency}
                                                </span>
                                            </h3>
                                            <div className="ao-meta">
                                                Sent {formatDate(request.createdAt)} · {relativeDay(request.createdAt)}
                                            </div>
                                            {text && <p className="ao-med-notes">{text}</p>}
                                            <div className="ao-tags">
                                                <span className={`ao-tag ${st.tone}`}>{st.label}</span>
                                                {request.photoUrl && (
                                                    <a className="ao-tag" href={request.photoUrl} target="_blank" rel="noreferrer">
                                                        View photo
                                                    </a>
                                                )}
                                            </div>
                                            {request.resolutionNotes && (
                                                <div className="ao-reply">
                                                    <b>Shelter reply</b>
                                                    {request.resolutionNotes}
                                                </div>
                                            )}
                                        </div>

                                        <div />
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
}
