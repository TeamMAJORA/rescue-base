import { useEffect, useMemo, useRef, useState } from "react";
import { FACTORS } from "../../../../utils/matchScore";



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

// "Oct 26" this year, "Oct 26, 2025" for older years (Date column)
function formatDayLabel(date) {
    if (!date) return "—";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";
    const sameYear = parsed.getFullYear() === new Date().getFullYear();
    return parsed.toLocaleDateString(
        "en-PH",
        sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" }
    );
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

// Quiz match score for this application (from /api/matchmaking/responses).
// Only the adopter's latest application gets a score.
function getQuizScore(application, quizByEmail) {
    const quiz = quizByEmail[String(application.email || "").toLowerCase()];
    if (!quiz) return { label: "Not from match results" };

    const isThisApplication =
        String(quiz.latestApplication?._id || "") === String(application._id);
    if (!isThisApplication) return { label: "Older application" };

    if (quiz.appliedScore == null) return { label: quiz.appliedScoreNote || "No score" };
    return { score: Math.floor(quiz.appliedScore) };
}

function ApplicationRow({
    application,
    quizByEmail = {},
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

    const quiz = getQuizScore(application, quizByEmail);
    const scoreTone =
        quiz.score == null ? "" : quiz.score >= 80 ? "is-high" : quiz.score >= 60 ? "is-mid" : "is-low";

    return (
        <article
            className="admin-application-row is-clickable"
            role="button"
            tabIndex={0}
            title="Open application"
            onClick={() => onReview(application)}
            onKeyDown={(event) => {
                if (event.key === "Enter") onReview(application);
            }}
        >
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

            {quiz.score == null ? (
                <div className="admin-application-score is-none">{quiz.label}</div>
            ) : (
                <div className={`admin-application-score ${scoreTone}`}>
                    <b>{quiz.score}%</b>
                    <span className="admin-score-bar">
                        <i style={{ width: `${quiz.score}%` }} />
                    </span>
                </div>
            )}

            <div className="admin-application-state">
                <span className={`admin-status-pill ${status}`}>
                    {statusLabel}
                </span>
            </div>
            <div className="admin-application-date">
                <b>{formatDayLabel(application.createdAt)}</b>
                {status === "interview_scheduled" && application.interviewSchedule && (
                    <small>Interview {formatShortDate(application.interviewSchedule, true)}</small>
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

// ---------- Review tabs: Quiz Answers + Why This Match ----------

const REVIEW_TABS = [
    { key: "application", label: "Application" },
    { key: "quiz", label: "Quiz Answers" },
    { key: "why", label: "Why This Match" },
];

const QUIZ_GROUPS = [
    {
        title: "Pet preferences",
        rows: [
            ["Pet type", "preferredPetType"],
            ["Size", "preferredSize"],
        ],
    },
    {
        title: "Home & household",
        rows: [
            ["Home type", "homeType"],
            ["Home ownership", "homeOwnership"],
            ["Children at home", "hasChildren"],
            ["Other pets", "hasOtherPets"],
        ],
    },
    {
        title: "Experience & time",
        rows: [
            ["Pet experience", "petExperience"],
            ["Hours available daily", "dailyAvailableHours"],
            ["Exercise", "exerciseFrequency"],
            ["Willing to train", "willingToTrain"],
        ],
    },
];

const LEVELS = ["", "very low", "low", "moderate", "high", "very high"];

function scoreToneOf(score) {
    if (score == null) return "is-none";
    if (score >= 80) return "is-high";
    if (score >= 60) return "is-mid";
    return "is-low";
}

// Same reasons as the Recommendations page: up to 2 strong factors + conflicts/weakest factor
function buildMatchReasons(factors, conflicts, petName) {
    if (!factors) return [];

    const scored = FACTORS
        .map((factor) => ({ ...factor, ...factors[factor.key] }))
        .filter((factor) => factor.similarity !== null && factor.similarity !== undefined)
        .sort((a, b) => b.similarity - a.similarity);

    const describe = (factor) =>
        factor.type === "tolerance"
            ? `Can handle ${LEVELS[factor.adopterValue]}; ${petName} is ${LEVELS[factor.animalValue]}.`
            : `Wants ${LEVELS[factor.adopterValue]}; ${petName} is ${LEVELS[factor.animalValue]}.`;

    const good = scored
        .filter((factor) => factor.similarity >= 0.75)
        .slice(0, 2)
        .map((factor) => ({ tone: "is-good", title: factor.label, text: describe(factor) }));

    const weakest = scored.filter((factor) => factor.similarity < 0.75).slice(-1);

    const checks = [
        ...(conflicts || []).map((text) => ({ tone: "is-check", title: "Check", text })),
        ...weakest.map((factor) => ({ tone: "is-check", title: `Check: ${factor.label}`, text: describe(factor) })),
    ];

    return [...good, ...checks].slice(0, 4);
}

function QuizAnswersTab({ quiz }) {
    if (!quiz) {
        return (
            <div className="art-empty">
                <b>No quiz on record</b>
                <p>This applicant didn&apos;t take the matching quiz, so there are no answers to show.</p>
            </div>
        );
    }

    return (
        <div className="art-body is-sheet">
            <div className="art-grid-3">
                {QUIZ_GROUPS.map((group) => (
                    <article className="admin-review-card art-card" key={group.title}>
                        <h4>{group.title}</h4>
                        <dl className="art-answers">
                            {group.rows.map(([label, key]) => (
                                <div key={key}>
                                    <dt>{label}</dt>
                                    <dd>{quiz[key] || "—"}</dd>
                                </div>
                            ))}
                        </dl>
                    </article>
                ))}
            </div>

            <article className="admin-review-card art-card">
                <h4>Behavior preferences (1 = low, 5 = high)</h4>
                <div className="art-ratings">
                    {FACTORS.map((factor) => {
                        const value = Number(quiz[factor.quizKey]) || 0;
                        return (
                            <div key={factor.key}>
                                <span>{factor.label}</span>
                                <span className="art-dots" aria-label={`${value} of 5`}>
                                    {[1, 2, 3, 4, 5].map((dot) => (
                                        <i key={dot} className={dot <= value ? "is-on" : ""} />
                                    ))}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </article>

            <p className="art-note">
                Answered {quiz.completedAt || quiz.createdAt
                    ? new Date(quiz.completedAt || quiz.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}.
            </p>
        </div>
    );
}

// Words for each 1–5 level, per behavior factor (used in the compatibility card)
const FACTOR_WORDS = {
    energy: ["Very calm", "Calm", "Moderate energy", "High energy", "Very high energy"],
    friendliness: ["Reserved", "Somewhat shy", "Moderately friendly", "Friendly", "Very friendly"],
    humanSociability: ["Shy with people", "Cautious with people", "Moderate sociability", "Friendly with guests", "Loves people"],
    animalSociability: ["Prefers being alone", "Picky with animals", "Okay with animals", "Good with animals", "Loves other animals"],
    trainability: ["Stubborn", "Slow learner", "Average learner", "High trainability", "Quick learner"],
    anxiety: ["Very relaxed", "Relaxed", "Sometimes anxious", "Anxious", "Very anxious"],
    aggression: ["Gentle", "Mostly gentle", "Sometimes reactive", "Reactive", "Very reactive"],
    activity: ["Mostly resting", "Low activity", "Moderate activity", "Active", "Always moving"],
};

function factorWords(factor, value, side) {
    if (!value) return "Not rated";
    const words = FACTOR_WORDS[factor.key]?.[value - 1] || `${LEVELS[value]}`;
    // For tolerance factors the applicant says how much they can handle
    if (side === "wants" && factor.type === "tolerance") return `Can handle: ${words.toLowerCase()}`;
    return words;
}

function CompatibilityColumn({ title, tone, rows, side }) {
    return (
        <div className={`art-compat-col is-${tone}`}>
            <h5>{title}</h5>
            {rows.map((row) => {
                const value = side === "wants" ? row.adopterValue : row.animalValue;
                return (
                    <div className="art-compat-row" key={row.key}>
                        <b>{row.label}</b>
                        <span className="art-compat-track">
                            <i
                                className={row.matched == null ? "is-none" : row.matched ? "is-good" : "is-check"}
                                style={{ width: `${((value || 0) / 5) * 100}%` }}
                            />
                        </span>
                        <small>{factorWords(row, value, side)}</small>
                    </div>
                );
            })}
        </div>
    );
}

function WhyMatchTab({ application, quiz }) {
    if (!quiz) {
        return (
            <div className="art-empty">
                <b>Not from match results</b>
                <p>This applicant didn&apos;t take the matching quiz, so there&apos;s no match score to explain.</p>
            </div>
        );
    }

    const isThisApplication =
        String(quiz.latestApplication?._id || "") === String(application._id);

    if (!isThisApplication) {
        return (
            <div className="art-empty">
                <b>Older application</b>
                <p>Match details are only worked out for this applicant&apos;s latest application.</p>
            </div>
        );
    }

    const pet = quiz.appliedAnimal || {};
    const petName = pet.name || application.petName || "this pet";
    const score = quiz.appliedScore == null ? null : Math.floor(quiz.appliedScore);
    const reasons = buildMatchReasons(quiz.appliedFactors, quiz.appliedConflicts, petName);
    const checks = reasons.filter((reason) => reason.tone === "is-check");
    const firstName = String(application.fullName || quiz.adopterName || "Applicant").split(" ")[0];

    // One row per behavior factor with both sides' 1–5 values
    const compatRows = FACTORS.map((factor) => {
        const result = quiz.appliedFactors?.[factor.key] || {};
        const adopterValue = Number(result.adopterValue) || null;
        const animalValue = Number(result.animalValue) || null;
        const similarity = result.similarity;
        return {
            ...factor,
            adopterValue,
            animalValue,
            matched: similarity == null ? null : similarity >= 0.75,
        };
    }).filter((row) => row.adopterValue || row.animalValue);
    const others = (quiz.aiMatches || [])
        .filter((match) => match.score != null && String(match.animalId) !== String(application.animalId?._id || application.animalId))
        .slice(0, 3);

    return (
        <div className="art-body">
            <article className="admin-review-card art-card">
                <h4>
                    Compatibility
                    {score != null && (
                        <span className={`art-score ${scoreToneOf(score)}`}>{score}% match</span>
                    )}
                </h4>

                {compatRows.length > 0 ? (
                    <>
                        <div className="art-compat">
                            <CompatibilityColumn
                                title={`What ${firstName} wants`}
                                tone="wants"
                                rows={compatRows}
                                side="wants"
                            />
                            <CompatibilityColumn
                                title={`What ${petName} has`}
                                tone="has"
                                rows={compatRows}
                                side="has"
                            />
                        </div>

                        <div className="art-compat-legend">
                            <span className="is-good">Close match</span>
                            <span className="is-check">Worth checking</span>
                        </div>
                    </>
                ) : (
                    <p className="art-note">No behavior ratings to compare yet.</p>
                )}

                {checks.length > 0 && (
                    <ul className="art-checks">
                        {checks.map((reason) => (
                            <li key={reason.title + reason.text}>
                                <b>{reason.title}</b> {reason.text}
                            </li>
                        ))}
                    </ul>
                )}

                <p className="art-note">
                    Score from the matchmaking model. Bars compare the applicant&apos;s quiz answers
                    with the pet&apos;s behavior ratings (1–5). Advisory only.
                </p>
            </article>

            {others.length > 0 && (
                <article className="admin-review-card art-card">
                    <h4>Other good matches for this applicant</h4>
                    <div className="art-others">
                        {others.map((match) => (
                            <div key={match.animalId}>
                                <span>{match.name} · {match.type}</span>
                                <b className={`art-score ${scoreToneOf(Math.floor(match.score))}`}>{Math.floor(match.score)}%</b>
                            </div>
                        ))}
                    </div>
                </article>
            )}
        </div>
    );
}

function ApplicationModal({
    application,
    quiz = null,
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
    const [reviewTab, setReviewTab] = useState("application");

    useEffect(() => {
        setReviewTab("application");
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
                                <span><ReviewIcon name="phone" />0{application.phone}</span>
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

                {/* Which pet this application is for (shown on every tab) */}
                {(() => {
                    const isLatest =
                        quiz && String(quiz.latestApplication?._id || "") === String(application._id);
                    const matchScore =
                        isLatest && quiz.appliedScore != null ? Math.floor(quiz.appliedScore) : null;
                    const pet = (isLatest && quiz.appliedAnimal) || {};

                    return (
                        <section className="arv-applying" aria-label="Applying for">
                            <span className="arv-applying-photo">
                                {application.petImage || pet.image ? (
                                    <img src={application.petImage || pet.image} alt="" />
                                ) : (
                                    <img src="/icons/sidebar/brown paw.svg" alt="" className="is-placeholder" />
                                )}
                            </span>

                            <div className="arv-applying-info">
                                <small>Applying for</small>
                                <strong>{application.petName || "Not selected"}</strong>
                                <span>
                                    {[pet.type, application.petBreed || pet.breed || "Breed not available", pet.gender]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </span>
                            </div>

                            {matchScore != null && (
                                <div className={`arv-applying-score ${scoreToneOf(matchScore)}`}>
                                    <b>{matchScore}%</b>
                                    <small>quiz match</small>
                                </div>
                            )}
                        </section>
                    );
                })()}

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

                <nav className="art-tabs" role="tablist" aria-label="Review sections">
                    {REVIEW_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={reviewTab === tab.key}
                            className={reviewTab === tab.key ? "is-active" : ""}
                            onClick={() => setReviewTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {reviewTab === "quiz" && <QuizAnswersTab quiz={quiz} />}
                {reviewTab === "why" && <WhyMatchTab application={application} quiz={quiz} />}

                <div className="admin-review-body is-sheet" hidden={reviewTab !== "application"}>
                    <div className="admin-review-column">
                        <article className="admin-review-card">
                            <h3>Applicant information</h3>
                            <dl className="arv-rows">
                                <div>
                                    <dt>Phone</dt>
                                    <dd>0{application.phone || "Not provided"}</dd>
                                </div>
                                <div>
                                    <dt>Home type</dt>
                                    <dd>{application.homeType || "Not provided"}</dd>
                                </div>
                                <div>
                                    <dt>Address</dt>
                                    <dd>{application.address || "Not provided"}</dd>
                                </div>
                            </dl>
                        </article>

                        <article className="admin-review-card">
                            <h3>Household</h3>
                            <dl className="arv-rows">
                                <div>
                                    <dt>Has children</dt>
                                    <dd className={application.hasChildren === "Yes" ? "is-yes" : "is-no"}>
                                        {application.hasChildren || "N/A"}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Other pets</dt>
                                    <dd className={application.hasOtherPets === "Yes" ? "is-yes" : "is-no"}>
                                        {application.hasOtherPets || "N/A"}
                                    </dd>
                                </div>
                            </dl>
                        </article>

                        <article className="admin-review-card">
                            <h3>Responses</h3>
                            <div className="arv-answer">
                                <small>Reason for adoption</small>
                                <p>{application.reason || "No reason provided."}</p>
                            </div>
                            <div className="arv-answer">
                                <small>Pet-care experience</small>
                                <p>{application.experience || "No experience provided."}</p>
                            </div>
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
                            <h3>Submitted documents ({documents.length})</h3>

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
                                <h3>{application.interviewSchedule ? "Interview" : "Schedule interview"}</h3>
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
                    </div>
                </footer>
            </section>
        </div>
    );
}

export default function AdoptionApplications() {
    const [applications, setApplications] = useState([]);
    const [quizByEmail, setQuizByEmail] = useState({});
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
    // One sort for the list: "score-high" | "score-low" | "newest" | "oldest"
    const [sortOrder, setSortOrder] = useState("score-high");

    // Each header remembers its own direction, so both arrows always show.
    // ↓ = smallest to biggest, ↑ = biggest to smallest
    const [scoreDirection, setScoreDirection] = useState("score-high");
    const [dateDirection, setDateDirection] = useState("newest");

    // Clicking the column already in use flips it; clicking the other one switches to it
    function toggleScoreSort() {
        const next = sortOrder.startsWith("score")
            ? (scoreDirection === "score-high" ? "score-low" : "score-high")
            : scoreDirection;
        setScoreDirection(next);
        setSortOrder(next);
    }

    function toggleDateSort() {
        const isDate = sortOrder === "newest" || sortOrder === "oldest";
        const next = isDate ? (dateDirection === "newest" ? "oldest" : "newest") : dateDirection;
        setDateDirection(next);
        setSortOrder(next);
    }

    // Dropdown: also remembers the direction for its column
    function chooseSort(value) {
        if (value.startsWith("score")) setScoreDirection(value);
        else setDateDirection(value);
        setSortOrder(value);
    }

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
                const newestFirst = new Date(b.createdAt) - new Date(a.createdAt);

                if (sortOrder === "score-high" || sortOrder === "score-low") {
                    const scoreA = getQuizScore(a, quizByEmail).score;
                    const scoreB = getQuizScore(b, quizByEmail).score;

                    // Applications without a score always go last
                    if (scoreA == null && scoreB == null) return newestFirst;
                    if (scoreA == null) return 1;
                    if (scoreB == null) return -1;
                    if (scoreA === scoreB) return newestFirst;
                    return sortOrder === "score-high" ? scoreB - scoreA : scoreA - scoreB;
                }

                return sortOrder === "newest" ? newestFirst : -newestFirst;
            });
    }, [
        activeTab,
        activeApplications,
        historyApplications,
        searchTerm,
        statusFilter,
        sortOrder,
        quizByEmail,
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

            // Quiz match scores (a failure here just leaves the scores blank)
            try {
                const quizResponse = await fetch(`${API}/api/matchmaking/responses`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const quizData = await quizResponse.json().catch(() => ({}));
                const byEmail = {};
                (quizData.responses || []).forEach((item) => {
                    if (item.adopterEmail) byEmail[item.adopterEmail.toLowerCase()] = item;
                });
                setQuizByEmail(byEmail);
            } catch (quizError) {
                console.error("Fetch quiz scores error:", quizError);
            }
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
                        onChange={(event) => chooseSort(event.target.value)}
                        aria-label="Sort applications"
                    >
                        <option value="score-high">Highest score</option>
                        <option value="score-low">Lowest score</option>
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
                    <div className="admin-adoption-table">
                        <div className="admin-application-columns" aria-hidden="true">
                            <span>Applicant</span>
                            <span>Pet</span>
                            <button
                                type="button"
                                className={`aqr-sort ${sortOrder.startsWith("score") ? "is-active" : ""}`}
                                onClick={toggleScoreSort}
                                title="Sort by quiz score"
                            >
                                Quiz Score <span className="aqr-arrow">{scoreDirection === "score-low" ? "↓" : "↑"}</span>
                            </button>
                            <span>Status</span>
                            <button
                                type="button"
                                className={`aqr-sort ${sortOrder === "newest" || sortOrder === "oldest" ? "is-active" : ""}`}
                                onClick={toggleDateSort}
                                title="Sort by date"
                            >
                                Date <span className="aqr-arrow">{dateDirection === "oldest" ? "↓" : "↑"}</span>
                            </button>
                        </div>

                        <div className="admin-application-list">
                            {visibleApplications.map((application) => (
                                <ApplicationRow
                                    key={application._id}
                                    application={application}
                                    quizByEmail={quizByEmail}
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
                    </div>
                )}
            </section>

            <ApplicationModal
                application={selectedApplication}
                quiz={
                    selectedApplication
                        ? quizByEmail[String(selectedApplication.email || "").toLowerCase()] || null
                        : null
                }
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
