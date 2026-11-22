import { useEffect, useRef, useState } from "react";
import "../../styles/components/TimeField.css";
import useCloseOnOutsideClick from "../../hooks/useCloseOnOutsideClick";
import Icon from "./Icon";

// Time wheel (hour : minute AM/PM) shared by the interview picker and the forms' time fields.
// Times are "HH:mm" (24-hour) strings, the same as <input type="time">.

const WHEEL_ITEM_HEIGHT = 36;
export const WHEEL_HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
export const WHEEL_PERIODS = ["AM", "PM"];

export function minuteOptions(step) {
    return Array.from({ length: Math.ceil(60 / step) }, (_, index) => String(index * step).padStart(2, "0"));
}

export function to24Hour(hour, period) {
    return (Number(hour) % 12) + (period === "PM" ? 12 : 0);
}

// "14:30" -> { hour: "2", minute: "30", period: "PM" }
export function splitTime(time) {
    const [h, m] = String(time || "09:00").split(":").map(Number);
    return {
        hour: String(h % 12 || 12),
        minute: String(Number.isFinite(m) ? m : 0).padStart(2, "0"),
        period: h >= 12 ? "PM" : "AM",
    };
}

export function joinTime(hour, minute, period) {
    return `${String(to24Hour(hour, period)).padStart(2, "0")}:${minute}`;
}

export function WheelColumn({ items, value, onChange, label }) {
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

// A field that opens the time wheel below it, like DateField opens the calendar.
// floating: the wheel overlays the page; turn it off inside scrolling pop-ups, where it would be cut off.
// clearable: shows "Clear" for an optional time. Opening an empty field starts at defaultTime.
export default function TimeField({ value, onChange, ariaLabel, placeholder = "Pick a time", minuteStep = 5, clearable = false, defaultTime = "09:00", floating = true }) {
    const [isOpen, setIsOpen] = useState(false);
    const boxRef = useRef(null);
    const { hour, minute, period } = splitTime(value || defaultTime);

    useCloseOnOutsideClick(isOpen, boxRef, () => setIsOpen(false));

    // A saved minute off the step (e.g. 07 with 5-minute steps) still shows
    const minutes = minuteOptions(minuteStep);
    if (!minutes.includes(minute)) {
        minutes.push(minute);
        minutes.sort();
    }

    function toggle() {
        if (!isOpen && !value) onChange(defaultTime);
        setIsOpen((current) => !current);
    }

    return (
        <div className={`aip-timefield${floating ? " is-floating" : ""}`} ref={boxRef}>
            <button
                type="button"
                className={`aip-field${isOpen ? " is-open" : ""}${value ? "" : " is-empty"}`}
                onClick={toggle}
                aria-expanded={isOpen}
                aria-label={ariaLabel}
            >
                <img className="aip-clock inline-icon" src="/icons/Clock.svg" alt="" aria-hidden="true" />
                <span>{value ? `${hour}:${minute} ${period}` : placeholder}</span>
                <i aria-hidden="true"><Icon name="chevron-down" /></i>
            </button>

            {isOpen && (
                <div className="aip-pop aip-time">
                    <span className="aip-time-label">Time</span>
                    <div className="admin-wheel aip-wheel">
                        <WheelColumn items={WHEEL_HOURS} value={hour} onChange={(next) => onChange(joinTime(next, minute, period))} label="Hour" />
                        <span className="admin-wheel-colon">:</span>
                        <WheelColumn items={minutes} value={minute} onChange={(next) => onChange(joinTime(hour, next, period))} label="Minute" />
                        <WheelColumn items={WHEEL_PERIODS} value={period} onChange={(next) => onChange(joinTime(hour, minute, next))} label="AM or PM" />
                    </div>
                    <div className="aip-time-actions">
                        {clearable && (
                            <button
                                type="button"
                                className="aip-clear"
                                onClick={() => {
                                    onChange("");
                                    setIsOpen(false);
                                }}
                            >
                                Clear
                            </button>
                        )}
                        <button type="button" className="aip-done" onClick={() => setIsOpen(false)}>
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
