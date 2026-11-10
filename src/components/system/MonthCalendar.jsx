import { useEffect, useRef, useState } from "react";
import "../../styles/components/MonthCalendar.css";

// Month calendar shared by the interview picker (no past days) and the
// lost & found report form (no future days). Days outside [minDate, maxDate] can't be picked.

const WEEK_DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = Array.from({ length: 12 }, (_, index) =>
    new Date(2000, index, 1).toLocaleString("en-PH", { month: "long" })
);

export function isSameDay(a, b) {
    return (
        a &&
        b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

// Date -> "YYYY-MM-DD" (local day, not UTC)
export function toDayValue(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function firstOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function MonthCalendar({ selected, onPick, minDate, maxDate }) {
    const today = startOfToday();
    const firstMonth = firstOfMonth(minDate);
    const lastMonth = firstOfMonth(maxDate);

    const [viewMonth, setViewMonth] = useState(() => {
        const start = firstOfMonth(selected || today);
        if (start < firstMonth) return firstMonth;
        if (start > lastMonth) return lastMonth;
        return start;
    });

    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const trail = (7 - ((lead + daysInMonth) % 7)) % 7;
    const years = Array.from(
        { length: maxDate.getFullYear() - minDate.getFullYear() + 1 },
        (_, index) => minDate.getFullYear() + index
    );

    const cells = [
        ...Array.from({ length: lead }, (_, i) => ({ day: daysInPrev - lead + i + 1, outside: true })),
        ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, date: new Date(year, month, i + 1) })),
        ...Array.from({ length: trail }, (_, i) => ({ day: i + 1, outside: true })),
    ];

    // Stay inside the allowed months
    function goToMonth(nextYear, nextMonth) {
        const target = new Date(nextYear, nextMonth, 1);
        if (target < firstMonth) setViewMonth(firstMonth);
        else if (target > lastMonth) setViewMonth(lastMonth);
        else setViewMonth(target);
    }

    const isMonthOutOfRange = (monthIndex) => {
        const candidate = new Date(year, monthIndex, 1);
        return candidate < firstMonth || candidate > lastMonth;
    };

    return (
        <div className="aip-pop aip-calendar">
            <div className="aip-month">
                <div className="aip-month-selects">
                    <select value={month} onChange={(event) => goToMonth(year, Number(event.target.value))} aria-label="Month">
                        {MONTH_NAMES.map((name, index) => (
                            <option key={name} value={index} disabled={isMonthOutOfRange(index)}>
                                {name}
                            </option>
                        ))}
                    </select>
                    <select value={year} onChange={(event) => goToMonth(Number(event.target.value), month)} aria-label="Year">
                        {years.map((value) => (
                            <option key={value} value={value}>{value}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <button
                        type="button"
                        onClick={() => goToMonth(year, month - 1)}
                        disabled={viewMonth <= firstMonth}
                        aria-label="Previous month"
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        onClick={() => goToMonth(year, month + 1)}
                        disabled={viewMonth >= lastMonth}
                        aria-label="Next month"
                    >
                        ›
                    </button>
                </div>
            </div>

            <div className="aip-grid">
                {WEEK_DAYS.map((name) => (
                    <span key={name} className="aip-weekday">{name}</span>
                ))}
                {cells.map((cell, index) =>
                    cell.outside ? (
                        <span key={`out-${index}`} className="aip-day is-outside">{cell.day}</span>
                    ) : (
                        <button
                            key={cell.day}
                            type="button"
                            className={`aip-day${isSameDay(cell.date, selected) ? " is-selected" : ""}${isSameDay(cell.date, today) ? " is-today" : ""}`}
                            disabled={cell.date < minDate || cell.date > maxDate}
                            onClick={() => onPick(toDayValue(cell.date))}
                        >
                            {cell.day}
                        </button>
                    )
                )}
            </div>
        </div>
    );
}

// A field that opens the calendar below it. value / onChange use "YYYY-MM-DD".
// floating: the calendar overlays the page; turn it off inside scrolling pop-ups, where it would be cut off.
export function DateField({ value, onChange, minDate, maxDate, placeholder = "Pick a date", ariaLabel, floating = true }) {
    const [open, setOpen] = useState(false);
    const boxRef = useRef(null);
    const selected = value ? new Date(`${value}T00:00`) : null;

    // Click outside or Esc closes the calendar
    useEffect(() => {
        if (!open) return undefined;
        function handleClick(event) {
            if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
        }
        function handleKey(event) {
            if (event.key === "Escape") setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open]);

    // Inside a scrolling pop-up, bring the opened calendar into view
    useEffect(() => {
        if (open && !floating) boxRef.current?.querySelector(".aip-calendar")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [open, floating]);

    return (
        <div className={`aip-datefield${floating ? " is-floating" : ""}`} ref={boxRef}>
            <button
                type="button"
                className={`aip-field${open ? " is-open" : ""}${selected ? "" : " is-empty"}`}
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-label={ariaLabel}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                <span>
                    {selected
                        ? selected.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                        : placeholder}
                </span>
                <i aria-hidden="true">▾</i>
            </button>

            {open && (
                <MonthCalendar
                    selected={selected}
                    minDate={minDate}
                    maxDate={maxDate}
                    onPick={(day) => {
                        onChange(day);
                        setOpen(false);
                    }}
                />
            )}
        </div>
    );
}
