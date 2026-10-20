import { useState } from "react";
import { getNextReportDue } from "../utils/reportDue";

const API = import.meta.env.VITE_BACKEND_URL;

// Same line-icon style as My Foster Pet
const FDO_ICONS = {
    paw: (
        <>
            <circle cx="11" cy="4" r="2" />
            <circle cx="18" cy="8" r="2" />
            <circle cx="4" cy="8" r="2" />
            <path d="M8 14c0-2 2-4 4-4s4 2 4 4-1 6-4 6-4-4-4-6z" />
        </>
    ),
    calendar: (
        <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
        </>
    ),
    flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
    check: <path d="M20 6 9 17l-5-5" />,
    plus: <path d="M12 5v14M5 12h14" />,
    mail: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
        </>
    ),
    phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
    chat: <path d="M4 5h16v11H9l-5 4z" />,
    report: (
        <>
            <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
            <path d="M14 3v5h5M9 13h6M9 17h6" />
        </>
    ),
    pulse: <path d="M3 12h4l3-7 4 14 3-7h4" />,
    home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    heart: <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />,
};

function FdoIcon({ name, size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            {FDO_ICONS[name]}
        </svg>
    );
}

function shortDate(date) {
    return new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TONE_ORDER = { alert: 0, due: 1, info: 2 };

// Everything the foster has to act on (or is waiting on), for every pet
function buildAttentionItems(pets) {
    const items = [];

    pets.forEach((pet) => {
        const name = pet.petName || "your foster pet";

        // 1. Weekly report: overdue, or due within 2 days
        const due = getNextReportDue(pet);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDay = new Date(due);
        dueDay.setHours(0, 0, 0, 0);
        const daysLeft = Math.round((dueDay - today) / DAY_MS);

        if (due.getTime() < Date.now()) {
            items.push({
                key: `report-${pet._id}`, tone: "alert", icon: "report",
                title: `${name}'s weekly report is overdue`,
                text: `It was due ${shortDate(due)}.`,
                action: "Submit report", page: "updates", petId: pet._id,
            });
        } else if (daysLeft <= 2) {
            items.push({
                key: `report-${pet._id}`, tone: "due", icon: "report",
                title: `${name}'s weekly report is due ${daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`}`,
                text: `Due ${shortDate(due)}.`,
                action: "Submit report", page: "updates", petId: pet._id,
            });
        }

        // 2. Behavior evaluation
        const evaluation = pet.behaviorEvaluation?.status || "not_submitted";
        if (evaluation === "revision") {
            items.push({
                key: `behavior-${pet._id}`, tone: "alert", icon: "heart",
                title: `Revise ${name}'s behavior evaluation`,
                text: pet.behaviorEvaluation?.reviewNotes || "The shelter asked for changes.",
                action: "Revise", page: "behavior", petId: pet._id,
            });
        } else if (evaluation === "not_submitted") {
            items.push({
                key: `behavior-${pet._id}`, tone: "due", icon: "heart",
                title: `Submit ${name}'s behavior evaluation`,
                text: "Helps the shelter match them with the right adopter.",
                action: "Start", page: "behavior", petId: pet._id,
            });
        }

        // 3. Early return request
        const request = pet.returnRequest || {};
        if (request.status === "pending") {
            items.push({
                key: `return-${pet._id}`, tone: "info", icon: "home",
                title: `Return request for ${name} is being reviewed`,
                text: request.requestedAt ? `Sent ${shortDate(request.requestedAt)}.` : "The shelter will contact you.",
                action: "View", page: "assignment", petId: pet._id,
            });
        } else if (
            request.status === "declined" &&
            request.handledAt &&
            Date.now() - new Date(request.handledAt).getTime() < 7 * DAY_MS
        ) {
            items.push({
                key: `return-${pet._id}`, tone: "alert", icon: "home",
                title: `Return request for ${name} was declined`,
                text: request.adminNote || "Contact the shelter for details.",
                action: "View", page: "assignment", petId: pet._id,
            });
        }

        // 4. Open medical requests
        (pet.medicalRequests || [])
            .filter((req) => req.status !== "resolved")
            .forEach((req) => {
                items.push({
                    key: `medical-${req._id}`,
                    tone: req.urgency === "Emergency" || req.urgency === "High" ? "alert" : "info",
                    icon: "pulse",
                    title: `Medical request for ${name}: ${req.status === "in_progress" ? "in progress" : "waiting for the shelter"}`,
                    text: req.issue,
                    action: "View", page: "medical", petId: pet._id,
                });
            });
    });

    return items.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

// Report pill for a pet card
function reportBadge(pet) {
    const due = getNextReportDue(pet);
    if (due.getTime() < Date.now()) return { tone: "alert", label: "Report overdue" };
    if (due.getTime() - Date.now() <= 2 * DAY_MS) return { tone: "due", label: `Report due ${shortDate(due)}` };
    return { tone: "good", label: "Reports on track" };
}

function daysInCare(pet) {
    if (!pet.startDate) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(pet.startDate)) / DAY_MS));
}

// Notification type -> icon + the page it opens
const ACTIVITY_TYPES = {
    foster_update: { icon: "paw", page: "assignment" },
    application_update: { icon: "report", page: "application" },
    medical_update: { icon: "pulse", page: "medical" },
    adoption_update: { icon: "heart", page: null },
};

function timeAgo(date) {
    const minutes = Math.floor((Date.now() - new Date(date)) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return shortDate(date);
}

const FOSTER_REMINDERS = [
    "Submit a weekly report for every pet in your care.",
    "Follow each pet's care checklist from the shelter.",
    "Keep scheduled vet visits and vaccinations.",
    "Contact the shelter right away in an emergency.",
];

function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

export default function DashboardOverview({
    fosterName,
    application,
    assignment,
    assignments = [],
    onNavigate,
    notifications = [],
    onOpenNotifications,
    onRefreshNotifications,
}) {
    const pets = assignments.length ? assignments : assignment ? [assignment] : [];
    const appStatus = String(application?.status || "").toLowerCase();

    // Pet whose weekly report is due soonest (overdue ones come first)
    const nextReport = pets
        .map((pet) => ({ pet, due: getNextReportDue(pet) }))
        .sort((a, b) => a.due - b.due)[0];
    const reportOverdue = nextReport && nextReport.due.getTime() < Date.now();

    // One short line that tells the foster where they stand
    let statusChips;
    if (pets.length) {
        statusChips = (
            <>
                <span className="fdo-chip">
                    <FdoIcon name="paw" />
                    Caring for {pets.length} {pets.length === 1 ? "pet" : "pets"}
                </span>
                <span className={`fdo-chip ${reportOverdue ? "is-alert" : "is-due"}`}>
                    <FdoIcon name={reportOverdue ? "flag" : "calendar"} />
                    {reportOverdue
                        ? `${nextReport.pet.petName}'s weekly report is overdue`
                        : `Next report due ${shortDate(nextReport.due)} · ${nextReport.pet.petName}`}
                </span>
            </>
        );
    } else if (appStatus === "approved") {
        statusChips = (
            <span className="fdo-chip is-good">
                <FdoIcon name="check" />
                You're approved. The shelter will assign you a pet soon.
            </span>
        );
    } else if (appStatus === "pending") {
        statusChips = (
            <span className="fdo-chip is-due">
                <FdoIcon name="calendar" />
                Your foster application is under review.
            </span>
        );
    } else if (appStatus === "rejected") {
        statusChips = (
            <span className="fdo-chip is-alert">
                <FdoIcon name="flag" />
                Your application wasn't approved this time. Check My Application for details.
            </span>
        );
    } else {
        statusChips = (
            <span className="fdo-chip">
                <FdoIcon name="paw" />
                Apply to the foster program to get started.
            </span>
        );
    }

    const attention = buildAttentionItems(pets);
    // Contact Shelter panel (same endpoint as My Foster Pet)
    const [contactOpen, setContactOpen] = useState(false);
    const [contact, setContact] = useState(null);

    async function toggleContact() {
        const opening = !contactOpen;
        setContactOpen(opening);

        if (!opening || contact) return;

        try {
            const token = localStorage.getItem("token");
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

    // Recent Activity: newest 5 shelter notifications
    const recentActivity = notifications.slice(0, 5);

    async function openActivity(notification) {
        if (!notification.read) {
            try {
                const token = localStorage.getItem("token");
                await fetch(`${API}/api/notifications/${notification._id}/read`, {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${token}` },
                });
                await onRefreshNotifications?.();
            } catch (error) {
                console.error(error);
            }
        }

        const page = ACTIVITY_TYPES[notification.type]?.page;
        if (page) onNavigate?.(page);
    }

    // Slots from the approved application (never fewer than pets in care)
    const capacity = Math.max(Number(application?.capacity) || 1, pets.length);
    const openSlots = capacity - pets.length;

    return (
        <section className="foster-dashboard-overview">
            <section className="fdo-hero">
                <img className="fdo-hero-paw is-one" src="/icons/heroPaw.svg" alt="" aria-hidden="true" />
                <img className="fdo-hero-paw is-two" src="/icons/heroPaw.svg" alt="" aria-hidden="true" />

                <div className="fdo-hero-text">
                    <span className="foster-label">Foster Dashboard</span>
                    <h2>{greeting()}, {fosterName}</h2>
                    <p>
                        {pets.length
                            ? "Thank you for opening your home. Here's what needs your attention today."
                            : "Thank you for being part of the RescueBase Foster Program."}
                    </p>
                    <div className="fdo-chips">{statusChips}</div>
                </div>

                <div className="fdo-hero-side">
                    <div className="fdo-hero-badge">
                        <img src="/icons/Foster.svg" alt="" aria-hidden="true" />
                    </div>
                    <small>Application</small>
                    <strong className={`status ${appStatus || "pending"}`}>
                        {application?.status || "Not Submitted"}
                    </strong>
                </div>
            </section>

            {pets.length > 0 && (
                <section className="fdo-actions">
                    <div className="fdo-actions-grid">
                        <button
                            type="button"
                            className="fdo-action is-primary"
                            onClick={() => onNavigate?.("updates", nextReport?.pet._id)}
                        >
                            <span className="fdo-action-icon"><FdoIcon name="report" size={20} /></span>
                            <span className="fdo-action-text">
                                <b>Submit Weekly Report</b>
                                <small>
                                    {pets.length > 1
                                        ? `For ${nextReport.pet.petName}, due soonest`
                                        : `How ${nextReport.pet.petName} is doing this week`}
                                </small>
                            </span>
                        </button>

                        <button
                            type="button"
                            className="fdo-action is-medical"
                            onClick={() => onNavigate?.("medical", pets.length === 1 ? pets[0]._id : null)}
                        >
                            <span className="fdo-action-icon"><FdoIcon name="plus" size={20} /></span>
                            <span className="fdo-action-text">
                                <b>Request Medical Help</b>
                                <small>Report an injury or illness</small>
                            </span>
                        </button>

                        <button
                            type="button"
                            className={`fdo-action ${contactOpen ? "is-open" : ""}`}
                            onClick={toggleContact}
                            aria-expanded={contactOpen}
                        >
                            <span className="fdo-action-icon"><FdoIcon name="chat" size={20} /></span>
                            <span className="fdo-action-text">
                                <b>Contact Shelter</b>
                                <small>{contactOpen ? "Hide contacts" : "Call or email the shelter"}</small>
                            </span>
                        </button>
                    </div>

                    {contactOpen && (
                        <div className="fah-contact fdo-contact" role="region" aria-label="Shelter contacts">
                            {!contact ? (
                                <p className="fah-contact-empty">Loading contacts...</p>
                            ) : !contact.email && !contact.phone ? (
                                <p className="fah-contact-empty">The shelter hasn't added contact details yet.</p>
                            ) : (
                                <>
                                    {contact.phone && (
                                        <a className="fah-contact-item" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>
                                            <span className="fah-fact-icon"><FdoIcon name="phone" size={18} /></span>
                                            <div>
                                                <small>Call or text</small>
                                                <b>{contact.phone}</b>
                                            </div>
                                        </a>
                                    )}
                                    {contact.email && (
                                        <a className="fah-contact-item" href={`mailto:${contact.email}?subject=${encodeURIComponent("Foster question")}`}>
                                            <span className="fah-fact-icon"><FdoIcon name="mail" size={18} /></span>
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
                </section>
            )}

            {pets.length > 0 && (
                <section className="fdo-attn">
                    <header className="fdo-attn-head">
                        <h3>Needs your attention</h3>
                        {attention.length > 0 && (
                            <span className="fdo-attn-count">{attention.length}</span>
                        )}
                    </header>

                    {attention.length ? (
                        <ul className="fdo-attn-list">
                            {attention.map((item) => (
                                <li key={item.key} className={`fdo-attn-row is-${item.tone}`}>
                                    <span className="fdo-attn-icon">
                                        <FdoIcon name={item.icon} size={18} />
                                    </span>
                                    <div className="fdo-attn-text">
                                        <b>{item.title}</b>
                                        <small>{item.text}</small>
                                    </div>
                                    <button
                                        type="button"
                                        className="fdo-attn-btn"
                                        onClick={() => onNavigate?.(item.page, item.petId)}
                                    >
                                        {item.action}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="fdo-attn-empty">
                            <span className="fdo-attn-empty-icon">
                                <img src="/icons/checkmark.svg" alt="" aria-hidden="true" />
                            </span>
                            <div>
                                <b>You're all caught up</b>
                                <small>No reports, evaluations or requests need you right now.</small>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {pets.length > 0 && (
                <section className="fdo-pets">
                    <header className="fdo-pets-head">
                        <div>
                            <h3>Your foster pets</h3>
                            <small>
                                {pets.length} of {capacity} {capacity === 1 ? "slot" : "slots"} used
                            </small>
                        </div>
                        <button
                            type="button"
                            className="fdo-link"
                            onClick={() => onNavigate?.("assignment")}
                        >
                            View details →
                        </button>
                    </header>

                    <div className="fdo-pets-grid">
                        {pets.map((pet) => {
                            const badge = reportBadge(pet);
                            const days = daysInCare(pet);
                            const info = [pet.petBreed, pet.animalId?.age, pet.animalId?.gender]
                                .filter(Boolean)
                                .join(" · ");

                            return (
                                <button
                                    key={pet._id}
                                    type="button"
                                    className="fdo-pet"
                                    onClick={() => onNavigate?.("assignment", pet._id)}
                                >
                                    <span className="fdo-pet-photo">
                                        {pet.petImage ? (
                                            <img src={pet.petImage} alt={pet.petName} />
                                        ) : (
                                            <img className="is-placeholder" src="/icons/brown paw.svg" alt="" aria-hidden="true" />
                                        )}
                                    </span>
                                    <span className="fdo-pet-body">
                                        <b>{pet.petName}</b>
                                        <small>{info || "Foster pet"}</small>
                                        <span className="fdo-pet-days">
                                            <FdoIcon name="calendar" size={14} />
                                            {days === 0 ? "Arrived today" : `${days} ${days === 1 ? "day" : "days"} in your care`}
                                        </span>
                                        <span className={`fdo-pill is-${badge.tone}`}>{badge.label}</span>
                                    </span>
                                </button>
                            );
                        })}

                        {Array.from({ length: openSlots }, (_, index) => (
                            <div key={`slot-${index}`} className="fdo-pet is-slot">
                                <img src="/icons/home.svg" alt="" aria-hidden="true" />
                                <b>Open slot</b>
                                <small>The shelter may assign another pet to you.</small>
                            </div>
                        ))}
                    </div>
                </section>
            )}
            <section className="fdo-bottom">
                <article className="fdo-card">
                    <header className="fdo-pets-head">
                        <h3>Recent activity</h3>
                        {notifications.length > 0 && (
                            <button type="button" className="fdo-link" onClick={onOpenNotifications}>
                                View all →
                            </button>
                        )}
                    </header>

                    {recentActivity.length ? (
                        <ul className="fdo-activity">
                            {recentActivity.map((item) => (
                                <li key={item._id}>
                                    <button
                                        type="button"
                                        className={`fdo-activity-row ${item.read ? "" : "is-unread"}`}
                                        onClick={() => openActivity(item)}
                                    >
                                        <span className="fdo-activity-icon">
                                            <FdoIcon name={ACTIVITY_TYPES[item.type]?.icon || "chat"} size={16} />
                                        </span>
                                        <span className="fdo-activity-text">
                                            <b>{item.title}</b>
                                            <small>{item.message}</small>
                                        </span>
                                        <time>{timeAgo(item.createdAt)}</time>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="fdo-activity-empty">
                            <img src="/icons/brown paw.svg" alt="" aria-hidden="true" />
                            <b>No activity yet</b>
                            <small>Updates from the shelter will show up here.</small>
                        </div>
                    )}
                </article>

                <article className="fdo-card fdo-reminders">
                    <img className="fdo-reminders-paw" src="/icons/heroPaw.svg" alt="" aria-hidden="true" />
                    <header className="fdo-pets-head">
                        <h3>Foster reminders</h3>
                    </header>
                    <ul>
                        {FOSTER_REMINDERS.map((text) => (
                            <li key={text}>
                                <span><FdoIcon name="check" size={14} /></span>
                                {text}
                            </li>
                        ))}
                    </ul>
                </article>
            </section>
        </section>
    );
}