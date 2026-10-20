import { useEffect, useMemo, useRef, useState } from "react";



// Styled confirm popup + toast from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

function notify(text, tone = "success") {
    if (window.rbToast) {
        window.rbToast(text, tone);
    } else {
        window.alert(text);
    }
}

function notifyErr(text) {
    notify(text, "error");
}

const API = import.meta.env.VITE_BACKEND_URL;

const ACTIVE_STATUSES = [
    "pending",
    "interview_scheduled",
    "interview_completed",
];

const FILTER_OPTIONS = {
    active: [
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "interview", label: "Interview" },
    ],
    history: [
        { value: "all", label: "All" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "withdrawn", label: "Withdrawn" },
    ],
};

function formatDate(date) {
    if (!date) return "Not scheduled";

    const parsed = new Date(date);

    return Number.isNaN(parsed.getTime())
        ? "Invalid date"
        : parsed.toLocaleString();
}

function getLocalDateTimeValue(date) {
    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 16);
}

function RejectModal({ application, onClose, onConfirm, loading }) {
    const [reason, setReason] = useState("");

    useEffect(() => {
        setReason("");
    }, [application]);

    if (!application) return null;

    function handleSubmit(event) {
        event.preventDefault();

        const trimmedReason = reason.trim();

        if (!trimmedReason || loading) return;

        onConfirm(application._id, trimmedReason);
    }

    return (
        <div className="admin-modal-overlay">
            <section className="admin-modal">
                <button
                    className="admin-modal-class"
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                >
                    x
                </button>

                <h2>Reject Adoption Application</h2>

                <p>
                    Provide a reason for rejecting the application of{" "}
                    <strong>{application.fullName}</strong> for{" "}
                    <strong>{application.petName}</strong>.
                </p>

                <form onSubmit={handleSubmit}>
                    <label htmlFor="rejection-reason">
                        Rejection Reason
                    </label>

                    <textarea
                        id="rejection-reason"
                        value={reason}
                        onChange={(event) =>
                            setReason(event.target.value)
                        }
                        placeholder="Explain why this application is being rejected..."
                        rows={5}
                        required
                        disabled={loading}
                    />

                    <div className="admin-modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="reject"
                            disabled={loading || !reason.trim()}
                        >
                            {loading
                                ? "Rejecting..."
                                : "Confirm Rejection"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WHEEL_ITEM_HEIGHT = 36;
const WHEEL_HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const WHEEL_MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
const WHEEL_PERIODS = ["AM", "PM"];
const SHELTER_OPEN_HOUR = 8;
const SHELTER_CLOSE_HOUR = 17;

function isSameDay(a, b) {
    return (
        a &&
        b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function to24Hour(hour, period) {
    return (Number(hour) % 12) + (period === "PM" ? 12 : 0);
}

function WheelColumn({ items, value, onChange, label }) {
    const columnRef = useRef(null);
    const scrollTimer = useRef(null);
    const selectedIndex = Math.max(0, items.indexOf(value));

    useEffect(() => {
        const column = columnRef.current;
        if (!column) return;

        const target = selectedIndex * WHEEL_ITEM_HEIGHT;

        if (Math.abs(column.scrollTop - target) > 2) {
            column.scrollTo({ top: target });
        }
    }, [selectedIndex]);

    function handleScroll() {
        clearTimeout(scrollTimer.current);

        scrollTimer.current = setTimeout(() => {
            const column = columnRef.current;
            if (!column) return;

            const nextIndex = Math.min(
                items.length - 1,
                Math.max(0, Math.round(column.scrollTop / WHEEL_ITEM_HEIGHT))
            );

            if (items[nextIndex] !== value) {
                onChange(items[nextIndex]);
            }
        }, 120);
    }

    return (
        <div
            ref={columnRef}
            className="admin-wheel-column"
            onScroll={handleScroll}
            role="listbox"
            aria-label={label}
        >
            {items.map((item, index) => {
                const distance = Math.abs(index - selectedIndex);

                return (
                    <button
                        key={item}
                        type="button"
                        role="option"
                        aria-selected={item === value}
                        className={`admin-wheel-item ${distance === 0 ? "is-selected" : distance === 1 ? "is-near" : ""}`}
                        onClick={() =>
                            columnRef.current?.scrollTo({
                                top: index * WHEEL_ITEM_HEIGHT,
                                behavior: "smooth",
                            })
                        }
                    >
                        {item}
                    </button>
                );
            })}
        </div>
    );
}

function InterviewModal({
    application,
    onClose,
    onConfirm,
    loading,
    bookedSlots = [],
}) {
    const [viewMonth, setViewMonth] = useState(() => new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [hour, setHour] = useState("9");
    const [minute, setMinute] = useState("00");
    const [period, setPeriod] = useState("AM");

    useEffect(() => {
        const existing = application?.interviewSchedule
            ? new Date(application.interviewSchedule)
            : null;

        if (existing && !Number.isNaN(existing.getTime()) && existing > new Date()) {
            const existingHour = existing.getHours();
            const roundedMinute = Math.round(existing.getMinutes() / 5) * 5;

            setViewMonth(new Date(existing.getFullYear(), existing.getMonth(), 1));
            setSelectedDay(new Date(existing.getFullYear(), existing.getMonth(), existing.getDate()));
            setHour(String(existingHour % 12 || 12));
            setMinute(String(Math.min(roundedMinute, 55)).padStart(2, "0"));
            setPeriod(existingHour >= 12 ? "PM" : "AM");
            return;
        }

        const now = new Date();
        setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
        setSelectedDay(null);
        setHour("9");
        setMinute("00");
        setPeriod("AM");
    }, [application]);

    if (!application) return null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

    const calendarCells = [
        ...Array.from({ length: firstWeekday }, (_, index) => ({
            day: daysInPrevMonth - firstWeekday + index + 1,
            outside: true,
        })),
        ...Array.from({ length: daysInMonth }, (_, index) => ({
            day: index + 1,
            date: new Date(year, month, index + 1),
        })),
    ];

    const hour24 = to24Hour(hour, period);

    const finalDate = selectedDay
        ? new Date(
            selectedDay.getFullYear(),
            selectedDay.getMonth(),
            selectedDay.getDate(),
            hour24,
            Number(minute)
        )
        : null;

    const isBooked =
        finalDate &&
        bookedSlots.some((value) => new Date(value).getTime() === finalDate.getTime());

    let timeError = "";

    if (finalDate) {
        if (finalDate <= now) {
            timeError = "This time has already passed.";
        } else if (hour24 < SHELTER_OPEN_HOUR || hour24 >= SHELTER_CLOSE_HOUR) {
            timeError = "Interviews run from 8:00 AM to 5:00 PM only.";
        } else if (isBooked) {
            timeError = "Another applicant already has an interview at this time.";
        }
    }

    function handleConfirm() {
        if (!finalDate || timeError || loading) return;
        onConfirm(application._id, finalDate.toISOString());
    }

    return (
        <div className="admin-modal-overlay">
            <section className="admin-schedule-modal" role="dialog" aria-modal="true">
                <header className="admin-schedule-header">
                    <span className="admin-schedule-header-icon" aria-hidden="true">
                        <ReviewIcon name="calendar" />
                    </span>

                    <div>
                        <h2>
                            {application.interviewSchedule
                                ? "Reschedule Adoption Interview"
                                : "Schedule Adoption Interview"}
                        </h2>

                        <p>
                            <span>{application.fullName}</span>
                            <span>
                                <img src="/icons/sidebar/brown paw.svg" alt="" />
                                {application.petName}
                            </span>
                        </p>
                    </div>

                    <button
                        type="button"
                        className="admin-review-close"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close"
                    >
                        <ReviewIcon name="x" />
                    </button>
                </header>

                <div className="admin-schedule-body">
                    <div className="admin-schedule-section">
                        <span className="admin-schedule-label">
                            Select date <em>*</em>
                        </span>

                        <div className="admin-schedule-calendar">
                            <div className="admin-schedule-month">
                                <button
                                    type="button"
                                    onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                                    disabled={isCurrentMonth}
                                    aria-label="Previous month"
                                >
                                    ‹
                                </button>

                                <strong>
                                    {viewMonth.toLocaleString("en-PH", { month: "long", year: "numeric" })}
                                </strong>

                                <button
                                    type="button"
                                    onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                                    aria-label="Next month"
                                >
                                    ›
                                </button>
                            </div>

                            <div className="admin-schedule-grid">
                                {WEEK_DAYS.map((day) => (
                                    <span key={day} className="admin-schedule-weekday">{day}</span>
                                ))}

                                {calendarCells.map((cell, index) => {
                                    if (cell.outside) {
                                        return (
                                            <span key={`out-${index}`} className="admin-schedule-day is-outside">
                                                {cell.day}
                                            </span>
                                        );
                                    }

                                    const isPast = cell.date < today;
                                    const isSelected = isSameDay(cell.date, selectedDay);
                                    const isToday = isSameDay(cell.date, today);

                                    return (
                                        <button
                                            key={cell.day}
                                            type="button"
                                            className={`admin-schedule-day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                                            disabled={isPast}
                                            onClick={() => setSelectedDay(cell.date)}
                                        >
                                            {cell.day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="admin-schedule-section">
                        <div className="admin-schedule-label-row">
                            <span className="admin-schedule-label">
                                Select time <em>*</em>
                            </span>
                            <small>8:00 AM – 5:00 PM</small>
                        </div>

                        <div className="admin-wheel">
                            <WheelColumn items={WHEEL_HOURS} value={hour} onChange={setHour} label="Hour" />
                            <span className="admin-wheel-colon">:</span>
                            <WheelColumn items={WHEEL_MINUTES} value={minute} onChange={setMinute} label="Minute" />
                            <WheelColumn items={WHEEL_PERIODS} value={period} onChange={setPeriod} label="AM or PM" />
                        </div>

                        <p className="admin-wheel-hint">Scroll or tap a number to change it.</p>
                    </div>
                </div>

                <div className={`admin-schedule-summary ${finalDate && !timeError ? "is-ready" : ""} ${timeError ? "has-error" : ""}`}>
                    <span className="admin-schedule-summary-icon" aria-hidden="true">
                        <ReviewIcon name="calendar" />
                    </span>

                    <div>
                        <small>{timeError || "Interview will be set for"}</small>
                        <strong>
                            {finalDate
                                ? `${finalDate.toLocaleDateString("en-PH", {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                })} · ${hour}:${minute} ${period}`
                                : "Pick a date first"}
                        </strong>
                    </div>
                </div>

                <p className="admin-schedule-note">
                    <ReviewIcon name="check" />
                    The pet will remain available during the interview and application review process.
                </p>

                <footer className="admin-schedule-footer">
                    <button
                        type="button"
                        className="admin-review-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="admin-review-approve admin-schedule-confirm"
                        onClick={handleConfirm}
                        disabled={loading || !finalDate || Boolean(timeError)}
                    >
                        <ReviewIcon name="check" />
                        {loading ? "Scheduling..." : "Confirm Interview"}
                    </button>
                </footer>
            </section>
        </div>
    );
}

function getInitials(name) {
    return String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function formatShortDate(date, withTime = false) {
    if (!date) return "";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toLocaleString(
        "en-PH",
        withTime
            ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
            : { month: "short", day: "numeric", year: "numeric" }
    );
}

function ApplicationRow({
    application,
    onReview,
    onSchedule,
    onCompleteInterview,
    onApprove,
    onReject,
    busy,
}) {
    const status = String(
        application.status || "pending"
    ).toLowerCase();

    const statusLabel = {
        pending: "Pending review",
        interview_scheduled: "Interview scheduled",
        interview_completed: "Interview done",
        approved: "Approved",
        rejected: "Rejected",
        withdrawn: "Withdrawn",
    }[status] || status.replaceAll("_", " ");

    const household = [
        application.homeType,
        application.hasChildren === "Yes" ? "Has kids" : "No kids",
        application.hasOtherPets === "Yes" ? "Has pets" : "No pets",
    ].filter(Boolean);

    return (
        <article className="admin-application-row">
            <div className="admin-application-applicant">
                <span className="admin-application-avatar" aria-hidden="true">
                    {getInitials(application.fullName)}
                </span>

                <div>
                    <h3>{application.fullName || "Unknown Applicant"}</h3>
                    <p>{application.email}</p>
                </div>
            </div>

            <div className="admin-application-pet">
                <span className="admin-application-pet-thumb">
                    {application.petImage ? (
                        <img src={application.petImage} alt={application.petName} />
                    ) : (
                        <img
                            src="/icons/sidebar/brown paw.svg"
                            alt=""
                            className="is-placeholder"
                        />
                    )}
                </span>

                <div>
                    <strong>{application.petName || "Not Selected"}</strong>
                    <small>{application.petBreed || "Breed not available"}</small>
                </div>
            </div>

            <div className="admin-application-household">
                {household.map((item) => (
                    <span key={item}>{item}</span>
                ))}
            </div>

            <div className="admin-application-state">
                <span className={`admin-status-pill ${status}`}>
                    {statusLabel}
                </span>

                <small>
                    {status === "interview_scheduled" && application.interviewSchedule
                        ? `Interview ${formatShortDate(application.interviewSchedule, true)}`
                        : `Applied ${formatShortDate(application.createdAt)}`}
                </small>
            </div>

            <div className="admin-application-status">
                <button
                    type="button"
                    onClick={() => onReview(application)}
                >
                    Review
                </button>

                {status === "pending" && (
                    <>
                        <button
                            type="button"
                            className="approve"
                            onClick={() => onSchedule(application)}
                            disabled={busy}
                        >
                            Schedule Interview
                        </button>

                        <button
                            type="button"
                            className="reject"
                            onClick={() => onReject(application)}
                            disabled={busy}
                        >
                            Reject
                        </button>
                    </>
                )}

                {status === "interview_scheduled" && (
                    <>
                        <button
                            type="button"
                            className="secondary"
                            onClick={() => onSchedule(application)}
                            disabled={busy}
                        >
                            Reschedule
                        </button>

                        <button
                            type="button"
                            className="approve"
                            onClick={() => onCompleteInterview(application)}
                            disabled={busy}
                        >
                            Mark Completed
                        </button>

                        <button
                            type="button"
                            className="reject"
                            onClick={() => onReject(application)}
                            disabled={busy}
                        >
                            Reject
                        </button>
                    </>
                )}

                {status === "interview_completed" && (
                    <>
                        <button
                            type="button"
                            className="approve"
                            onClick={() => onApprove(application)}
                            disabled={busy}
                        >
                            Approve Adoption
                        </button>

                        <button
                            type="button"
                            className="reject"
                            onClick={() => onReject(application)}
                            disabled={busy}
                        >
                            Reject
                        </button>
                    </>
                )}
            </div>
        </article>
    );
}

const STATUS_LABELS = {
    pending: "Pending review",
    interview_scheduled: "Interview scheduled",
    interview_completed: "Interview done",
    approved: "Approved",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
};

function ReviewIcon({ name }) {
    const paths = {
        mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
        phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
        home: <><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10" /></>,
        pin: <><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>,
        file: <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="9.5" cy="9.5" r="1.8" /><path d="m20 16-5-5-9 9" /></>,
        calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
        check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
        x: <path d="M7 7l10 10M17 7 7 17" />,
        lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    };

    return (
        <svg className="admin-review-icon" viewBox="0 0 24 24" aria-hidden="true">
            {paths[name]}
        </svg>
    );
}

function getReviewSteps(application) {
    const status = String(application.status || "pending").toLowerCase();
    const hasInterview = Boolean(application.interviewSchedule);
    const isClosed = ["approved", "rejected", "withdrawn"].includes(status);

    return [
        {
            label: "Submitted",
            detail: formatShortDate(application.createdAt),
            state: "done",
        },
        {
            label: "Review",
            detail: status === "pending" ? "Awaiting check" : "Checked",
            state: status === "pending" ? "current" : "done",
        },
        {
            label: "Interview",
            detail: hasInterview
                ? formatShortDate(application.interviewSchedule, true)
                : isClosed
                    ? "Not held"
                    : "Not scheduled",
            state:
                status === "interview_scheduled"
                    ? "current"
                    : status === "interview_completed" || (isClosed && hasInterview)
                        ? "done"
                        : "upcoming",
        },
        {
            label: "Decision",
            detail: isClosed ? STATUS_LABELS[status] : "Approve or reject",
            state:
                status === "approved"
                    ? "done"
                    : status === "rejected" || status === "withdrawn"
                        ? "rejected"
                        : status === "interview_completed"
                            ? "current"
                            : "upcoming",
        },
    ];
}

function ApplicationModal({
    application,
    onClose,
    onScheduleInterview,
    onCompleteInterview,
    onApprove,
    onReject,
    onRequestDocuments,
    loading,
}) {
    const [interviewDay, setInterviewDay] = useState("");
    const [interviewTime, setInterviewTime] = useState("");
    const [rescheduling, setRescheduling] = useState(false);
    const [interviewError, setInterviewError] = useState("");
    const [docRequestOpen, setDocRequestOpen] = useState(false);
    const [docRequestReason, setDocRequestReason] = useState("");
    const [docRequestError, setDocRequestError] = useState("");

    useEffect(() => {
        setInterviewDay("");
        setInterviewTime("");
        setRescheduling(false);
        setInterviewError("");
        setDocRequestOpen(false);
        setDocRequestReason("");
        setDocRequestError("");
    }, [application?._id]);

    if (!application) return null;

    const status = String(application.status || "pending").toLowerCase();
    const isPending = status === "pending";
    const isScheduled = status === "interview_scheduled";
    const isCompleted = status === "interview_completed";
    const isClosed = ["approved", "rejected", "withdrawn"].includes(status);
    const documents = Array.isArray(application.documents) ? application.documents : [];
    const showInterviewForm = isPending || (isScheduled && rescheduling);
    const today = getLocalDateTimeValue(new Date()).slice(0, 10);
    const docRequest = application.documentRequest || {};

    async function handleSendDocRequest() {
        const reason = docRequestReason.trim();

        if (!reason) {
            setDocRequestError("Tell the applicant what needs to be fixed.");
            return;
        }

        setDocRequestError("");
        const sent = await onRequestDocuments?.(application._id, reason);

        if (sent) {
            setDocRequestOpen(false);
            setDocRequestReason("");
        }
    }

    async function handleSchedule() {
        if (!interviewDay || !interviewTime || loading) return;

        const selected = new Date(`${interviewDay}T${interviewTime}`);

        if (Number.isNaN(selected.getTime()) || selected <= new Date()) {
            setInterviewError("Please pick a future date and time.");
            return;
        }

        setInterviewError("");
        await onScheduleInterview(application._id, selected.toISOString());
    }

    return (
        <div className="admin-modal-overlay">
            <section className="admin-review-modal" role="dialog" aria-modal="true">
                <header className="admin-review-header">
                    <span className="admin-application-avatar admin-review-avatar" aria-hidden="true">
                        {getInitials(application.fullName)}
                    </span>

                    <div className="admin-review-identity">
                        <span>Application Details</span>
                        <h2>{application.fullName || "Unknown Applicant"}</h2>
                        <p>
                            <span><ReviewIcon name="mail" />{application.email}</span>
                            {application.phone && (
                                <span><ReviewIcon name="phone" />{application.phone}</span>
                            )}
                        </p>
                    </div>

                    <span className={`admin-status-pill admin-review-pill ${status}`}>
                        {STATUS_LABELS[status] || status}
                    </span>

                    <button
                        type="button"
                        className="admin-review-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <ReviewIcon name="x" />
                    </button>
                </header>

                <ol className="admin-review-steps">
                    {getReviewSteps(application).map((step, index) => (
                        <li key={step.label} className={`is-${step.state}`}>
                            <span className="admin-review-step-dot">
                                {step.state === "done" ? (
                                    <ReviewIcon name="check" />
                                ) : step.state === "rejected" ? (
                                    <ReviewIcon name="x" />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <div>
                                <strong>{step.label}</strong>
                                <small>{step.detail}</small>
                            </div>
                        </li>
                    ))}
                </ol>

                <div className="admin-review-body">
                    <div className="admin-review-column">
                        <article className="admin-review-card">
                            <h3>Applicant</h3>

                            <div className="admin-review-facts">
                                <div>
                                    <span className="admin-review-fact-icon"><ReviewIcon name="phone" /></span>
                                    <p><small>Phone</small>{application.phone || "Not provided"}</p>
                                </div>

                                <div>
                                    <span className="admin-review-fact-icon"><ReviewIcon name="home" /></span>
                                    <p><small>Home type</small>{application.homeType || "Not provided"}</p>
                                </div>

                                <div className="is-wide">
                                    <span className="admin-review-fact-icon"><ReviewIcon name="pin" /></span>
                                    <p><small>Address</small>{application.address || "Not provided"}</p>
                                </div>
                            </div>
                        </article>

                        <article className="admin-review-card">
                            <h3>Household</h3>

                            <div className="admin-review-household">
                                <div>
                                    <span>Has children</span>
                                    <b className={application.hasChildren === "Yes" ? "is-yes" : "is-no"}>
                                        {application.hasChildren || "N/A"}
                                    </b>
                                </div>

                                <div>
                                    <span>Other pets</span>
                                    <b className={application.hasOtherPets === "Yes" ? "is-yes" : "is-no"}>
                                        {application.hasOtherPets || "N/A"}
                                    </b>
                                </div>
                            </div>
                        </article>

                        <article className="admin-review-card">
                            <h3>Reason for adoption</h3>
                            <p className="admin-review-text">
                                {application.reason || "No reason provided."}
                            </p>
                        </article>

                        <article className="admin-review-card">
                            <h3>Pet-care experience</h3>
                            <p className="admin-review-text">
                                {application.experience || "No experience provided."}
                            </p>
                        </article>

                        {application.reviewNotes && (
                            <article className={`admin-review-card ${status === "rejected" ? "is-rejected" : ""}`}>
                                <h3>{status === "rejected" ? "Rejection reason" : "Review notes"}</h3>
                                <p className="admin-review-text">{application.reviewNotes}</p>
                                {application.reviewedByName && (
                                    <small className="admin-review-meta">
                                        By {application.reviewedByName}
                                        {application.reviewedAt && ` · ${formatShortDate(application.reviewedAt)}`}
                                    </small>
                                )}
                            </article>
                        )}
                    </div>

                    <div className="admin-review-column">
                        <article className="admin-review-card">
                            <h3>Applying for</h3>

                            <div className="admin-review-pet">
                                <span className="admin-application-pet-thumb admin-review-pet-thumb">
                                    {application.petImage ? (
                                        <img src={application.petImage} alt={application.petName} />
                                    ) : (
                                        <img src="/icons/sidebar/brown paw.svg" alt="" className="is-placeholder" />
                                    )}
                                </span>

                                <div>
                                    <strong>{application.petName || "Not selected"}</strong>
                                    <small>{application.petBreed || "Breed not available"}</small>
                                </div>
                            </div>
                        </article>

                        <article className="admin-review-card">
                            <div className="admin-review-card-heading">
                                <h3>Submitted documents</h3>
                                <span className="admin-review-count">
                                    {documents.length} {documents.length === 1 ? "file" : "files"}
                                </span>
                            </div>

                            {docRequest.status === "requested" && (
                                <div className="admin-doc-request-note is-waiting">
                                    <strong>Resubmission requested · {formatShortDate(docRequest.requestedAt)}</strong>
                                    <small>{docRequest.reason}</small>
                                </div>
                            )}

                            {docRequest.status === "resubmitted" && (
                                <div className="admin-doc-request-note is-new">
                                    <strong>New documents uploaded · {formatShortDate(docRequest.resubmittedAt)}</strong>
                                    <small>Previous request: {docRequest.reason}</small>
                                </div>
                            )}

                            {documents.length === 0 ? (
                                <p className="admin-review-text">No documents uploaded.</p>
                            ) : (
                                documents.map((document, index) => (
                                    <div className="admin-review-document" key={document._id || index}>
                                        <span className="admin-review-fact-icon"><ReviewIcon name="file" /></span>

                                        <p>
                                            <strong>{document.documentName || "Unnamed document"}</strong>
                                            <small
                                                className={
                                                    document.status === "rejected"
                                                        ? "is-rejected"
                                                        : application.documentsVerified
                                                            ? "is-verified"
                                                            : ""
                                                }
                                            >
                                                {document.status === "rejected"
                                                    ? "Needs resubmission"
                                                    : application.documentsVerified
                                                        ? "Verified"
                                                        : "Pending verification"}
                                            </small>
                                        </p>

                                        {document.documentUrl && (
                                            <a
                                                href={document.documentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                View
                                            </a>
                                        )}
                                    </div>
                                ))
                            )}

                            {!isClosed && docRequest.status !== "requested" && !docRequestOpen && (
                                <button
                                    type="button"
                                    className="admin-doc-request-btn"
                                    onClick={() => setDocRequestOpen(true)}
                                    disabled={loading}
                                >
                                    Request resubmission
                                </button>
                            )}

                            {docRequestOpen && (
                                <div className="admin-doc-request-form">
                                    <label htmlFor="doc-request-reason">What should the applicant fix?</label>

                                    <div className="admin-doc-request-chips">
                                        {["ID photo is blurry", "ID is expired", "Name does not match the application", "Not a valid ID"].map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                className={docRequestReason === chip ? "is-picked" : ""}
                                                onClick={() => {
                                                    setDocRequestReason(chip);
                                                    setDocRequestError("");
                                                }}
                                            >
                                                {chip}
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        id="doc-request-reason"
                                        rows={3}
                                        maxLength={500}
                                        value={docRequestReason}
                                        onChange={(event) => {
                                            setDocRequestReason(event.target.value);
                                            setDocRequestError("");
                                        }}
                                        placeholder="e.g. The photo is too dark to read your name."
                                    />

                                    {docRequestError && (
                                        <small className="admin-doc-request-error">{docRequestError}</small>
                                    )}

                                    <div className="admin-doc-request-actions">
                                        <button
                                            type="button"
                                            className="admin-doc-request-cancel"
                                            onClick={() => {
                                                setDocRequestOpen(false);
                                                setDocRequestReason("");
                                                setDocRequestError("");
                                            }}
                                            disabled={loading}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-doc-request-send"
                                            onClick={handleSendDocRequest}
                                            disabled={loading}
                                        >
                                            {loading ? "Sending..." : "Send request"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </article>

                        <article className="admin-review-card">
                            <div className="admin-review-card-heading">
                                <h3>Interview</h3>
                                <span className={`admin-review-count ${application.interviewSchedule ? "is-set" : ""}`}>
                                    {isCompleted || (isClosed && application.interviewSchedule)
                                        ? "Completed"
                                        : application.interviewSchedule
                                            ? "Scheduled"
                                            : "Not scheduled"}
                                </span>
                            </div>

                            {application.interviewSchedule && !showInterviewForm && (
                                <div className="admin-review-interview-date">
                                    <ReviewIcon name="calendar" />
                                    {formatShortDate(application.interviewSchedule, true)}
                                </div>
                            )}

                            {isScheduled && !rescheduling && (
                                <button
                                    type="button"
                                    className="admin-review-link"
                                    onClick={() => setRescheduling(true)}
                                >
                                    Reschedule interview
                                </button>
                            )}

                            {showInterviewForm && (
                                <>
                                    <p className="admin-review-hint">
                                        <ReviewIcon name="calendar" />
                                        Pick a date and time to invite the applicant.
                                    </p>

                                    <div className="admin-review-interview-inputs">
                                        <input
                                            type="date"
                                            min={today}
                                            value={interviewDay}
                                            onChange={(event) => setInterviewDay(event.target.value)}
                                            disabled={loading}
                                            aria-label="Interview date"
                                        />

                                        <input
                                            type="time"
                                            value={interviewTime}
                                            onChange={(event) => setInterviewTime(event.target.value)}
                                            disabled={loading}
                                            aria-label="Interview time"
                                        />
                                    </div>

                                    {interviewError && (
                                        <p className="admin-review-error">{interviewError}</p>
                                    )}

                                    <button
                                        type="button"
                                        className="admin-review-primary"
                                        onClick={handleSchedule}
                                        disabled={loading || !interviewDay || !interviewTime}
                                    >
                                        <ReviewIcon name="calendar" />
                                        {loading
                                            ? "Saving..."
                                            : isScheduled
                                                ? "Save New Schedule"
                                                : "Schedule Interview"}
                                    </button>
                                </>
                            )}

                            {isClosed && !application.interviewSchedule && (
                                <p className="admin-review-text">No interview was held.</p>
                            )}
                        </article>
                    </div>
                </div>

                <footer className="admin-review-footer">
                    <p>
                        {!isClosed && !isCompleted && (
                            <>
                                <ReviewIcon name="lock" />
                                Approve unlocks after the interview is done.
                            </>
                        )}
                    </p>

                    <div>
                        <button type="button" className="admin-review-secondary" onClick={onClose}>
                            Close
                        </button>

                        {!isClosed && (
                            <button
                                type="button"
                                className="admin-review-danger"
                                onClick={() => onReject(application)}
                                disabled={loading}
                            >
                                Reject Application
                            </button>
                        )}

                        {isScheduled && (
                            <button
                                type="button"
                                className="admin-review-approve"
                                onClick={() => onCompleteInterview(application)}
                                disabled={loading}
                            >
                                Mark Interview Done
                            </button>
                        )}

                        {!isClosed && !isScheduled && (
                            <button
                                type="button"
                                className="admin-review-approve"
                                onClick={() => onApprove(application)}
                                disabled={loading || !isCompleted}
                            >
                                Approve
                            </button>
                        )}
                    </div>
                </footer>
            </section>
        </div>
    );
}

export default function AdoptionApplications() {
    const [applications, setApplications] = useState([]);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [rejectionApplication, setRejectionApplication] = useState(null);
    const [interviewApplication, setInterviewApplication] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busyApplicationId, setBusyApplicationId] = useState(null);

    const token = localStorage.getItem("token");

    const activeApplications = useMemo(
        () =>
            applications.filter((application) =>
                ACTIVE_STATUSES.includes(
                    String(application.status || "pending").toLowerCase()
                )
            ),
        [applications]
    );

    const [activeTab, setActiveTab] = useState("active");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("newest");

    const historyApplications = useMemo(
        () =>
            applications.filter(
                (application) =>
                    !ACTIVE_STATUSES.includes(
                        String(application.status || "pending").toLowerCase()
                    )
            ),
        [applications]
    );

    const visibleApplications = useMemo(() => {
        const source =
            activeTab === "active" ? activeApplications : historyApplications;

        const query = searchTerm.trim().toLowerCase();

        return source
            .filter((application) => {
                const status = String(application.status || "pending").toLowerCase();

                if (statusFilter === "all") return true;
                if (statusFilter === "interview") return status.startsWith("interview");
                return status === statusFilter;
            })
            .filter((application) => {
                if (!query) return true;

                return [
                    application.fullName,
                    application.email,
                    application.petName,
                ].some((value) =>
                    String(value || "").toLowerCase().includes(query)
                );
            })
            .sort((a, b) => {
                const difference = new Date(b.createdAt) - new Date(a.createdAt);
                return sortOrder === "newest" ? difference : -difference;
            });
    }, [
        activeTab,
        activeApplications,
        historyApplications,
        searchTerm,
        statusFilter,
        sortOrder,
    ]);

    function switchTab(tab) {
        setActiveTab(tab);
        setStatusFilter("all");
    }

    const bookedSlots = useMemo(
    () =>
        applications
            .filter(
                (application) =>
                    application.status === "interview_scheduled" &&
                    application.interviewSchedule &&
                    application._id !== interviewApplication?._id
            )
            .map((application) => application.interviewSchedule),
    [applications, interviewApplication]
    );

    const pendingCount = useMemo(
        () =>
            activeApplications.filter(
                (application) =>
                    String(application.status).toLowerCase() === "pending"
            ).length,
        [activeApplications]
    );

    const interviewCount = useMemo(
        () =>
            activeApplications.filter((application) =>
                [
                    "interview_scheduled",
                    "interview_completed",
                ].includes(String(application.status).toLowerCase())
            ).length,
        [activeApplications]
    );

    async function fetchApplications() {
        try {
            setLoading(true);

            const response = await fetch(`${API}/api/adoptions`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Failed to fetch adoption applications."
                );
            }

            setApplications(
                Array.isArray(data.applications) ? data.applications : []
            );
        } catch (error) {
            console.error("Fetch applications error:", error);
            notifyErr(error.message || "Unable to load adoption applications.");
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateStatus(
        id,
        status,
        reviewNotes = "",
        interviewSchedule = null
    ) {
        try {
            setSaving(true);
            setBusyApplicationId(id);

            const body = {
                status,
                reviewNotes,
            };

            if (status === "interview_scheduled") {
                body.interviewSchedule = interviewSchedule;
            }

            const response = await fetch(
                `${API}/api/adoptions/${id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Failed to update application status."
                );
            }

            setRejectionApplication(null);
            setInterviewApplication(null);
            setSelectedApplication(null);

            await fetchApplications();

            return true;
        } catch (error) {
            console.error("Update status error:", error);
            notifyErr(error.message || "Server error while updating application.");
            return false;
        } finally {
            setSaving(false);
            setBusyApplicationId(null);
        }
    }

    async function handleRequestDocuments(id, reason) {
        try {
            setSaving(true);

            const response = await fetch(`${API}/api/adoptions/${id}/documents/request`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ reason }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to send the request.");
            }

            // Keep the modal open and show the new state right away
            setSelectedApplication((current) =>
                current && current._id === id
                    ? {
                        ...current,
                        documents: data.application.documents,
                        documentsVerified: data.application.documentsVerified,
                        documentRequest: data.application.documentRequest,
                    }
                    : current
            );

            notify("Resubmission request sent to the applicant.");
            await fetchApplications();
            return true;
        } catch (error) {
            console.error("Request documents error:", error);
            notifyErr(error.message || "Server error while sending the request.");
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function handleRejectApplication(id, reason) {
        return handleUpdateStatus(id, "rejected", reason);
    }

    async function handleScheduleInterview(id, interviewSchedule) {
        return handleUpdateStatus(
            id,
            "interview_scheduled",
            "",
            interviewSchedule
        );
    }

    async function handleCompleteInterview(application) {
        const confirmed = await askConfirm({ title: "Mark interview as completed?", message: `Mark the interview for ${application.fullName} as completed?`, confirmLabel: "Mark completed" });

        if (!confirmed) return;

        await handleUpdateStatus(
            application._id,
            "interview_completed"
        );
    }

    async function handleApproveApplication(application) {
        const confirmed = await askConfirm({ title: "Approve this adoption?", message: `Approve the adoption of ${application.petName} by ` +
                `${application.fullName}? This will mark the pet as adopted ` +
                "and close other active applications.", confirmLabel: "Approve" });

        if (!confirmed) return;

        await handleUpdateStatus(application._id, "approved");
    }

    useEffect(() => {
        fetchApplications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <section className="admin-adoption-page">
            {/* Stats strip (same style as User Management) */}
            <div className="um-strip">
                <div className="um-strip-total">
                    <b>{applications.length}</b>
                    <small>Total applications</small>
                </div>
                <div>
                    <small>Pending review</small>
                    <b>{pendingCount}</b>
                </div>
                <div>
                    <small>Interview stage</small>
                    <b>{interviewCount}</b>
                </div>
                <div>
                    <small>Approved</small>
                    <b>{applications.filter((item) => item.status === "approved").length}</b>
                </div>
            </div>

            <section className="admin-panel admin-adoption-list-panel">
                <div className="admin-adoption-tabs" role="tablist">
                    {[
                        { key: "active", label: "Active", count: activeApplications.length },
                        { key: "history", label: "History", count: historyApplications.length },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            className={activeTab === tab.key ? "is-active" : ""}
                            onClick={() => switchTab(tab.key)}
                        >
                            {tab.label}
                            <span>{tab.count}</span>
                        </button>
                    ))}

                    <button
                        type="button"
                        className="admin-adoption-refresh"
                        onClick={fetchApplications}
                        disabled={loading || saving}
                    >
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                <div className="admin-adoption-toolbar">
                    <label className="admin-adoption-search">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                        </svg>

                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search applicant, email or pet…"
                            aria-label="Search applications"
                        />
                    </label>

                    <div className="admin-adoption-filters">
                        {FILTER_OPTIONS[activeTab].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={statusFilter === option.value ? "is-active" : ""}
                                onClick={() => setStatusFilter(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <select
                        className="admin-adoption-sort"
                        value={sortOrder}
                        onChange={(event) => setSortOrder(event.target.value)}
                        aria-label="Sort applications"
                    >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                    </select>
                </div>

                {loading ? (
                    <p className="admin-empty">Loading applications...</p>
                ) : visibleApplications.length === 0 ? (
                    <p className="admin-empty ad-empty">
                        {searchTerm || statusFilter !== "all"
                            ? "No applications match your search or filter."
                            : activeTab === "active"
                                ? "There are no active adoption applications."
                                : "No closed applications yet."}
                    </p>
                ) : (
                    <>
                        <div className="admin-application-columns" aria-hidden="true">
                            <span>Applicant</span>
                            <span>Pet</span>
                            <span>Household</span>
                            <span>Status</span>
                            <span>Actions</span>
                        </div>

                        <div className="admin-application-list">
                            {visibleApplications.map((application) => (
                                <ApplicationRow
                                    key={application._id}
                                    application={application}
                                    onReview={setSelectedApplication}
                                    onSchedule={setInterviewApplication}
                                    onCompleteInterview={handleCompleteInterview}
                                    onApprove={handleApproveApplication}
                                    onReject={setRejectionApplication}
                                    busy={
                                        saving &&
                                        busyApplicationId === application._id
                                    }
                                />
                            ))}
                        </div>
                    </>
                )}
            </section>

            <ApplicationModal
                application={selectedApplication}
                onClose={() => setSelectedApplication(null)}
                onScheduleInterview={handleScheduleInterview}
                onCompleteInterview={handleCompleteInterview}
                onApprove={handleApproveApplication}
                onReject={setRejectionApplication}        
                onRequestDocuments={handleRequestDocuments}
                loading={saving}
            />

            <InterviewModal
                application={interviewApplication}
                onClose={() => setInterviewApplication(null)}
                onConfirm={handleScheduleInterview}
                loading={saving}
                bookedSlots={bookedSlots}
            />

            <RejectModal
                application={rejectionApplication}
                onClose={() => setRejectionApplication(null)}
                onConfirm={handleRejectApplication}
                loading={saving}
            />
        </section>
    );
}
