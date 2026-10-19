import { useEffect, useState } from "react";


const API = import.meta.env.VITE_BACKEND_URL;


// Line icons (same set/style as the admin Foster Care page)
const FA_ICONS = {
    home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    calendar: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
        </>
    ),
    pulse: <path d="M3 12h4l3-7 4 14 3-7h4" />,
    flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
    report: (
        <>
            <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
            <path d="M14 3v5h5M9 13h6M9 17h6" />
        </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    chat: <path d="M4 5h16v11H9l-5 4z" />,
    heart: <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />,
    mail: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
        </>
    ),
    phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
    check: <path d="M20 6 9 17l-5-5" />,
    paw: (
        <>
            <circle cx="11" cy="4" r="2" />
            <circle cx="18" cy="8" r="2" />
            <circle cx="4" cy="8" r="2" />
            <path d="M8 14c0-2 2-4 4-4s4 2 4 4-1 6-4 6-4-4-4-6z" />
        </>
    ),
};

function FaIcon({ name, size = 18 }) {
    return (
        <svg
            className="fah-icon"
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
            {FA_ICONS[name]}
        </svg>
    );
}

   export default function FosterAssignment({ application = null, onNavigate, onAdopt }) {
    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    const fosterEmail = String(
        savedUser.email || ""
    )
        .trim()
        .toLowerCase();

    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [message, setMessage] = useState("");
    const token = localStorage.getItem("token");

       const [contactOpen, setContactOpen] = useState(false);
       const [contact, setContact] = useState(null);

       // "Adopt": the foster's own latest adoption application (to know if one is in progress)
       const ACTIVE_ADOPTION = ["pending", "interview_scheduled", "interview_completed"];
       const ADOPTION_STATUS_TEXT = {
           pending: "pending review",
           interview_scheduled: "waiting for the interview",
           interview_completed: "waiting for the final decision",
       };
       const [adoptApp, setAdoptApp] = useState(null);

       async function loadAdoptionApp() {
           try {
               const response = await fetch(`${API}/api/adoptions/user/latest`, {
                   headers: { Authorization: `Bearer ${token}` },
               });
               const data = await response.json();
               setAdoptApp(response.ok && data.success ? data.application : null);
           } catch (error) {
               console.error(error);
           }
       }

       // Opens the adoption form (adopter dashboard) with this pet already picked
       function startAdoption(animalId) {
           if (adoptApp && ACTIVE_ADOPTION.includes(adoptApp.status)) {
               setMessage("You already have an adoption application in progress. Check it on the adopter dashboard.");
               return;
           }

           try {
               sessionStorage.setItem("rb_adopt_pet", animalId);
           } catch {
               // ignore storage errors
           }

           onAdopt?.();
       }

    // "Return Pet": foster asks the shelter to take the animal back early
    const emptyReturn = { reason: "", preferredDate: "", notes: "", urgent: false };
    const [returnOpen, setReturnOpen] = useState(false);
    const [returnForm, setReturnForm] = useState(emptyReturn);
    const [returnError, setReturnError] = useState("");
    const [returnSending, setReturnSending] = useState(false);

    function openReturn() {
        setReturnForm(emptyReturn);
        setReturnError("");
        setReturnOpen(true);
    }

    async function submitReturn(event) {
        event.preventDefault();

        if (!returnForm.reason) {
            setReturnError("Please choose a reason.");
            return;
        }

        try {
            setReturnSending(true);
            setReturnError("");

            const response = await fetch(
                `${API}/api/foster/assignments/${assignment._id}/return-request`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(returnForm),
                }
            );
            const data = await response.json();

            if (!response.ok || !data.success) {
                setReturnError(data.message || "Could not send your request.");
                return;
            }

            setReturnOpen(false);
            setMessage(data.message);
            loadAssignment();
        } catch (error) {
            console.error(error);
            setReturnError("Server error. Please try again.");
        } finally {
            setReturnSending(false);
        }
    }

    async function toggleContact() {
        const opening = !contactOpen;
        setContactOpen(opening);

        if (!opening || contact) return;

        try {
            const response = await fetch(`${API}/api/settings/contact`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setContact(response.ok && data.success ? data.contact : {});
        } catch (error) {
            console.error(error);
            setContact({});
        }
    }

    // The pet whose details are shown below the tabs
    const assignment =
        assignments.find((item) => item._id === selectedId) ||
        assignments[0] ||
        null;

        
       // The shelter animal record behind this assignment (needed to adopt it)
       const petAnimalId = String(assignment?.animalId?._id || assignment?.animalId || "");
       const adoptingThis =
           Boolean(petAnimalId) &&
           ACTIVE_ADOPTION.includes(adoptApp?.status) &&
           String(adoptApp?.animalId?._id || adoptApp?.animalId) === petAnimalId;
        
    async function loadAssignment() {
        try {
            setLoading(true);

            const response = await fetch(
                `${API}/api/foster/assignments/me/active`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setAssignments([]);
                setMessage(
                    data.message ||
                    "Unable to load foster assignment."
                );
                return;
            }
            setAssignments(
                data.assignments || (data.assignment ? [data.assignment] : [])
            );
            setMessage("");

        } catch (error) {
            console.error(error);

            setAssignments([]);

            setMessage("Server error while loading assignent.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (fosterEmail) {
            loadAssignment();
            loadAdoptionApp();
        }
    }, []);

    function formatDate(date) {
        if (!date) return "N/A";

        return new Date(date).toLocaleDateString(
            "en-PH",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
            }
        );
    }

    // Weekly report: "sent" if one went in during the last 7 days, otherwise when it's due
    function reportStatus(item) {
        
        if (item.returnRequest?.status === "pending") {
            return { label: "Return requested", tone: "is-return" };
        }

        const updates = item.updates || [];
        const last = updates.length ? updates[updates.length - 1].createdAt : null;
        const DAY = 24 * 60 * 60 * 1000;

        if (last && Date.now() - new Date(last).getTime() < 7 * DAY) {
            return { label: "Report sent", tone: "is-sent" };
        }

        const due = new Date(last || item.startDate || item.createdAt || Date.now());
        due.setDate(due.getDate() + 7);

        if (due.getTime() < Date.now()) {
            return { label: "Report overdue", tone: "is-overdue" };
        }

        return {
            label: `Report due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
            tone: "is-due",
        };
    }

    function petSubtitle(item) {
        const age = Number(item.animalId?.age);
        const ageText = age > 0 ? `${age} ${age === 1 ? "year" : "years"}` : "";
        return [item.petBreed || "Unknown breed", ageText].filter(Boolean).join(" · ");
    }

    // Capacity comes from the approved foster application
    const capacity = Math.max(Number(application?.capacity) || 1, assignments.length);
    const openSlots = capacity - assignments.length;

    const petTabs = (
        <div className="fat-strip">
            <div className="fat-tabs" role="tablist" aria-label="Your foster animals">
                {assignments.map((item) => {
                    const selected = item._id === assignment?._id;
                    const report = reportStatus(item);

                    return (
                        <button
                            key={item._id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={`fat-tab ${selected ? "is-selected" : ""}`}
                            onClick={() => {
                                setSelectedId(item._id);
                                setReturnOpen(false);
                            }}
                        >
                            <span className="fat-photo">
                                {item.petImage ? (
                                    <img src={item.petImage} alt="" />
                                ) : (
                                    <img src="/icons/brown paw.svg" alt="" className="fat-photo-icon" />
                                )}
                            </span>

                            <span className="fat-info">
                                <b>{item.petName}</b>
                                <small>{petSubtitle(item)}</small>
                                <span className="fat-pills">
                                    <span className="fat-pill is-active">Active</span>
                                    <span className={`fat-pill ${report.tone}`}>{report.label}</span>
                                </span>
                            </span>

                            {selected && (
                                <span className="fat-check" aria-hidden="true">
                                    <img src="/icons/checkmark.svg" alt="" />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="fat-capacity">
                <span className="fat-eyebrow">Foster Capacity</span>
                <b>
                    {assignments.length} of {capacity} {capacity === 1 ? "slot" : "slots"}
                </b>
                <span className="fat-bar" aria-hidden="true">
                    {Array.from({ length: capacity }, (_, index) => (
                        <i key={index} className={index < assignments.length ? "is-used" : ""} />
                    ))}
                </span>
                <small>
                    {openSlots > 0
                        ? `You can take ${openSlots} more ${openSlots === 1 ? "animal" : "animals"}.`
                        : "You're at full capacity."}
                </small>
            </div>
        </div>
    );

        // Care instructions as a checklist (one item per line / sentence)
    const DEFAULT_CARE = "Provide food, water, shelter, and weekly updates.";
    const careItems =
        !assignment?.careInstructions || assignment.careInstructions.trim() === DEFAULT_CARE
            ? ["Provide food and fresh water daily", "Provide a safe, comfortable shelter", "Submit a weekly update"]
            : assignment.careInstructions
                .split(/\n|;|\.\s+/)
                .map((item) => item.trim().replace(/\.$/, ""))
                .filter(Boolean);

    // Newest weekly updates first, and when the next one is due
    const recentUpdates = (assignment?.updates || []).slice().reverse();
    const nextDue = new Date(
        recentUpdates[0]?.createdAt || assignment?.startDate || assignment?.createdAt || Date.now()
    );
    nextDue.setDate(nextDue.getDate() + 7);
    const isOverdue = nextDue.getTime() < Date.now();

    if (loading) {
        return (
            <section className="foster-panel">
                <div className="foster-loading">
                    Loading assignment...
                </div>
            </section>
        );
    }

    if (!assignment) {
        const capacityNow = Number(application?.capacity) || 1;
        const steps = [
            { title: "Application approved", note: "You're a registered foster", state: "done" },
            { title: "Shelter finds a match", note: "Based on your preferences", state: "active" },
            { title: "Your pet arrives", note: "You'll get an email and a notification", state: "upcoming" },
        ];

        return (
            <section className="foster-panel">
                <div className="foster-section-heading">
                    <div>
                        <span>Current Foster</span>
                        <h2>Foster Assignment</h2>
                    </div>
                </div>

                <div className="foster-assignment-top fae-card">
                    <div className="fae-art" aria-hidden="true">
                        <img src="/icons/heroPaw.svg" alt="" className="fae-paw is-one" />
                        <img src="/icons/heroPaw.svg" alt="" className="fae-paw is-two" />
                        <img src="/icons/home.svg" alt="" className="fae-home" />
                    </div>

                    <div className="fah-body">
                        <span className="fah-eyebrow">No pet assigned yet</span>
                        <h2 className="fah-name">Your foster home is ready</h2>
                        <p className="fah-breed">
                            The shelter will match you with a pet that fits your preferences.
                        </p>

                        <div className="fah-facts is-three">
                            <div className="fah-fact">
                                <span className="fah-fact-icon"><FaIcon name="home" /></span>
                                <div>
                                    <small>Capacity</small>
                                    <b>0 of {capacityNow} {capacityNow === 1 ? "slot" : "slots"} used</b>
                                </div>
                            </div>

                            <div className="fah-fact">
                                <span className="fah-fact-icon"><FaIcon name="heart" /></span>
                                <div>
                                    <small>Prefers</small>
                                    <b>{application?.preferredAnimalType || "Any"}</b>
                                </div>
                            </div>

                            <div className="fah-fact">
                                <span className="fah-fact-icon"><FaIcon name="calendar" /></span>
                                <div>
                                    <small>Duration</small>
                                    <b>{application?.fosterDuration || "—"}</b>
                                </div>
                            </div>
                        </div>

                        <div className="fah-actions">
                            <button
                                type="button"
                                className="fah-btn is-primary"
                                onClick={() => onNavigate?.("application")}
                            >
                                <FaIcon name="report" size={16} />
                                View My Application
                            </button>

                            <button
                                type="button"
                                className={`fah-btn is-ghost ${contactOpen ? "is-open" : ""}`}
                                onClick={toggleContact}
                                aria-expanded={contactOpen}
                            >
                                <FaIcon name="chat" size={16} />
                                Contact Shelter
                            </button>
                        </div>

                        {contactOpen && (
                            <div className="fah-contact" role="region" aria-label="Shelter contacts">
                                {!contact ? (
                                    <p className="fah-contact-empty">Loading contacts...</p>
                                ) : !contact.email && !contact.phone ? (
                                    <p className="fah-contact-empty">The shelter hasn't added contact details yet.</p>
                                ) : (
                                    <>
                                        {contact.phone && (
                                            <a className="fah-contact-item" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>
                                                <span className="fah-fact-icon"><FaIcon name="phone" /></span>
                                                <div>
                                                    <small>Call or text</small>
                                                    <b>{contact.phone}</b>
                                                </div>
                                            </a>
                                        )}
                                        {contact.email && (
                                            <a className="fah-contact-item" href={`mailto:${contact.email}`}>
                                                <span className="fah-fact-icon"><FaIcon name="mail" /></span>
                                                <div>
                                                    <small>Email</small>
                                                    <b>{contact.email}</b>
                                                </div>
                                            </a>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <ol className="fae-steps">
                    {steps.map((step, index) => (
                        <li key={step.title} className={`fae-step is-${step.state}`}>
                            <span className="fae-step-dot">
                                {step.state === "done" ? <FaIcon name="check" size={14} /> : index + 1}
                            </span>
                            <div>
                                <b>{step.title}</b>
                                <small>{step.note}</small>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>
        );
    }

    return (
        <section className="foster-panel">
            <div className="foster-section-heading">
                <div>
                    <span>Current Foster</span>
                    <h2>
                        Foster Assignment
                    </h2>
                </div>
             </div>

            {petTabs}

            <div className="foster-assignment-top">
                <div className="fah-photo">
                    {assignment.petImage ? (
                        <img src={assignment.petImage} alt={assignment.petName} />
                    ) : (
                        <img src="/icons/brown paw.svg" alt="" className="fah-photo-icon" />
                    )}
                    <span className={`fah-badge is-${assignment.status}`}>
                        {assignment.status}
                    </span>
                </div>

                <div className="fah-body">
                    <span className="fah-eyebrow">Current Foster Assignment</span>
                    <h2 className="fah-name">{assignment.petName}</h2>
                    <p className="fah-breed">{petSubtitle(assignment)}</p>

                    <div className="fah-facts">
                        <div className="fah-fact">
                            <span className="fah-fact-icon"><FaIcon name="home" /></span>
                            <div>
                                <small>Shelter</small>
                                <b>{assignment.shelterName || "RescueBase Shelter"}</b>
                            </div>
                        </div>

                        <div className="fah-fact">
                            <span className="fah-fact-icon"><FaIcon name="calendar" /></span>
                            <div>
                                <small>Assigned Date</small>
                                <b>{formatDate(assignment.startDate)}</b>
                            </div>
                        </div>

                        <div className="fah-fact">
                            <span className="fah-fact-icon"><FaIcon name="pulse" /></span>
                            <div>
                                <small>Foster Care Status</small>
                                <b className={`fah-status is-${assignment.status}`}>{assignment.status}</b>
                            </div>
                        </div>

                        <div className="fah-fact">
                            <span className="fah-fact-icon"><FaIcon name="flag" /></span>
                            <div>
                                <small>Expected Completion</small>
                                <b>{assignment.endDate ? formatDate(assignment.endDate) : "Not set yet"}</b>
                            </div>
                        </div>
                    </div>

                    <div className="fah-actions">
                        <button
                            type="button"
                            className="fah-btn is-primary"
                            onClick={() => onNavigate?.("updates")}
                        >
                            <FaIcon name="report" size={16} />
                            Submit Weekly Report
                        </button>

                        <button
                            type="button"
                            className="fah-btn is-medical"
                            onClick={() => onNavigate?.("medical")}
                        >
                            <FaIcon name="plus" size={16} />
                            Request Medical Assistance
                        </button>

                        <button
                            type="button"
                            className={`fah-btn is-ghost ${contactOpen ? "is-open" : ""}`}
                            onClick={toggleContact}
                            aria-expanded={contactOpen}
                        >
                            <FaIcon name="chat" size={16} />
                            Contact Shelter
                        </button>

                           {assignment.returnRequest?.status !== "pending" && !returnOpen && (
                               <button type="button" className="fah-btn is-return" onClick={openReturn}>
                                   <FaIcon name="home" size={16} />
                                   Return Pet
                               </button>
                           )}

                           {petAnimalId && !adoptingThis && assignment.returnRequest?.status !== "pending" && (
                               <button
                                   type="button"
                                   className="fah-btn is-adopt"
                                   onClick={() => startAdoption(petAnimalId)}
                               >
                                   <FaIcon name="heart" size={16} />
                                   Adopt {assignment.petName}
                               </button>
                           )}
                       </div>

                       {adoptingThis && (
                           <p className="fah-return-note is-adopt">
                               <FaIcon name="heart" size={16} />
                               <span>
                                   Your adoption application for {assignment.petName} is{" "}
                                   <b>{ADOPTION_STATUS_TEXT[adoptApp.status] || adoptApp.status}</b>. Keep caring for
                                   them while staff review it.
                               </span>
                           </p>
                       )}

                    {assignment.returnRequest?.status === "pending" && (
                        <p className="fah-return-note">
                            <FaIcon name="home" size={16} />
                            <span>
                                You asked to return {assignment.petName} on{" "}
                                <b>{formatDate(assignment.returnRequest.requestedAt)}</b>
                                {" "}({assignment.returnRequest.reason}). Keep caring for them until the
                                shelter confirms they're back.
                            </span>
                        </p>
                    )}

                    {assignment.returnRequest?.status === "declined" && !returnOpen && (
                        <p className="fah-return-note is-declined">
                            <FaIcon name="home" size={16} />
                            <span>
                                Your return request was declined: <b>{assignment.returnRequest.adminNote}</b>
                            </span>
                        </p>
                    )}

                    {returnOpen && (
                        <form className="fah-return" onSubmit={submitReturn}>
                            <div className="fah-return-head">
                                <b>Return {assignment.petName} to the shelter</b>
                                <small>The shelter will contact you to arrange the handover.</small>
                            </div>

                            <div className="fah-return-reasons" role="radiogroup" aria-label="Reason">
                                {["Medical", "Behavior", "Personal", "Emergency"].map((reason) => (
                                    <button
                                        key={reason}
                                        type="button"
                                        role="radio"
                                        aria-checked={returnForm.reason === reason}
                                        className={returnForm.reason === reason ? "is-selected" : ""}
                                        onClick={() => {
                                            setReturnForm({ ...returnForm, reason });
                                            setReturnError("");
                                        }}
                                    >
                                        {reason}
                                    </button>
                                ))}
                            </div>

                            <div className="fah-return-grid">
                                <label>
                                    Preferred return date
                                    <input
                                        type="date"
                                        value={returnForm.preferredDate}
                                        min={new Date().toISOString().slice(0, 10)}
                                        onChange={(e) => setReturnForm({ ...returnForm, preferredDate: e.target.value })}
                                    />
                                </label>

                                <label className="fah-return-urgent">
                                    <input
                                        type="checkbox"
                                        checked={returnForm.urgent || returnForm.reason === "Emergency"}
                                        disabled={returnForm.reason === "Emergency"}
                                        onChange={(e) => setReturnForm({ ...returnForm, urgent: e.target.checked })}
                                    />
                                    This is urgent
                                </label>

                                <label className="is-wide">
                                    Notes for the shelter
                                    <textarea
                                        rows="3"
                                        maxLength={1000}
                                        value={returnForm.notes}
                                        onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                                        placeholder="What happened, and anything staff should know"
                                    />
                                </label>
                            </div>

                            {(returnForm.urgent || returnForm.reason === "Emergency") && (
                                <p className="fah-return-warn">
                                    For emergencies, also call the shelter right away.{" "}
                                    {!contactOpen && (
                                        <button type="button" onClick={toggleContact}>
                                            Show contacts
                                        </button>
                                    )}
                                </p>
                            )}

                            {returnError && <p className="fah-return-error">{returnError}</p>}

                            <div className="fah-return-actions">
                                <button
                                    type="button"
                                    className="fah-btn is-ghost"
                                    onClick={() => setReturnOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="fah-btn is-primary" disabled={returnSending}>
                                    {returnSending ? "Sending..." : "Send Return Request"}
                                </button>
                            </div>
                        </form>
                    )}

                    {contactOpen && (
                        <div className="fah-contact" role="region" aria-label="Shelter contacts">
                            {!contact ? (
                                <p className="fah-contact-empty">Loading contacts...</p>
                            ) : !contact.email && !contact.phone ? (
                                <p className="fah-contact-empty">
                                    The shelter hasn't added contact details yet.
                                </p>
                            ) : (
                                <>
                                    {contact.phone && (
                                        <a
                                            className="fah-contact-item"
                                            href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                                        >
                                            <span className="fah-fact-icon"><FaIcon name="phone" /></span>
                                            <div>
                                                <small>Call or text</small>
                                                <b>{contact.phone}</b>
                                            </div>
                                        </a>
                                    )}

                                    {contact.email && (
                                        <a
                                            className="fah-contact-item"
                                            href={`mailto:${contact.email}?subject=${encodeURIComponent(`Foster question about ${assignment.petName}`)}`}
                                        >
                                            <span className="fah-fact-icon"><FaIcon name="mail" /></span>
                                            <div>
                                                <small>Email</small>
                                                <b>{contact.email}</b>
                                            </div>
                                        </a>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="foster-assignment-sections">

                <section className="assignment-card">
                    <div className="acard-head">
                        <h3>Care Instructions</h3>
                    </div>

                    <ul className="acard-checklist">
                        {careItems.map((item) => (
                            <li key={item}>
                                <span className="acard-check"><FaIcon name="check" size={13} /></span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="assignment-card">
                    <div className="acard-head">
                        <h3>Recent Weekly Updates</h3>
                        <span className="acard-count">{recentUpdates.length} submitted</span>
                    </div>

                    {recentUpdates.length > 0 ? (
                        <div className="acard-updates">
                            {recentUpdates.slice(0, 3).map((update) => (
                                <article key={update._id} className="acard-update">
                                    {update.photoUrl && (
                                        <img src={update.photoUrl} alt="Weekly update" />
                                    )}
                                    <div>
                                        <div className="acard-update-head">
                                            <b>{formatDate(update.createdAt)}</b>
                                            <small>{update.submittedBy}</small>
                                        </div>
                                        <p>{update.note || "No notes added."}</p>
                                        {(update.healthStatus || update.appetite || update.behavior) && (
                                            <div className="acard-tags">
                                                {update.healthStatus && <span>Health: {update.healthStatus}</span>}
                                                {update.appetite && <span>Appetite: {update.appetite}</span>}
                                                {update.behavior && <span>Behavior: {update.behavior}</span>}
                                            </div>
                                        )}
                                    </div>
                                </article>
                            ))}

                            {recentUpdates.length > 3 && (
                                <button
                                    type="button"
                                    className="acard-link"
                                    onClick={() => onNavigate?.("updates")}
                                >
                                    View all {recentUpdates.length} updates →
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="acard-empty">
                            <span className="acard-empty-icon"><FaIcon name="paw" size={24} /></span>
                            <b>No weekly updates yet</b>
                            <p>
                                Share how {assignment.petName} is eating, sleeping and behaving.
                                Staff will see it right away.
                            </p>
                            <button
                                type="button"
                                className="fah-btn is-primary"
                                onClick={() => onNavigate?.("updates")}
                            >
                                <FaIcon name="report" size={16} />
                                Submit first report
                            </button>
                        </div>
                    )}

                    {assignment.returnRequest?.status !== "pending" && (
                        <p className={`acard-due ${isOverdue ? "is-overdue" : ""}`}>
                            <FaIcon name="calendar" size={18} />
                            {isOverdue ? "Report overdue since" : "Next report due"}{" "}
                            <b>{formatDate(nextDue)}</b>
                        </p>
                    )}
                </section>
            </div>
            {message && (
                <div className="assignment-message">
                    {message}
                </div>
            )}
        </section>
    );
}
