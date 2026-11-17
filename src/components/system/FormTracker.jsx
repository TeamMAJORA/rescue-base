import Icon from "./Icon";

// Progress across a form's steps: numbered steps, a tick when done, and "Step 2 of 3" / "Ready to submit".
// steps: [{ key, label, done }]. A step is a button when onSelect allows going to it.
export default function FormTracker({ steps, currentIndex, onSelect, canSelect = () => true, label = "Form progress" }) {
    const allDone = steps.every((step) => step.done);

    return (
        <nav className="form-tracker" aria-label={label}>
            <ol>
                {steps.map((step, index) => (
                    <li
                        key={step.key}
                        className={`${step.done ? "is-done" : ""} ${index === currentIndex ? "is-current" : ""}`.trim()}
                        aria-current={index === currentIndex ? "step" : undefined}
                    >
                        <button type="button" onClick={() => onSelect(index)} disabled={!canSelect(index)}>
                            <b>{step.done && index !== currentIndex ? <Icon name="check" /> : index + 1}</b>
                            <span>{step.label}</span>
                        </button>
                    </li>
                ))}
            </ol>

            <span className={`form-tracker-pill ${allDone ? "is-ready" : ""}`.trim()}>
                {allDone ? "Ready to submit" : `Step ${currentIndex + 1} of ${steps.length}`}
            </span>
        </nav>
    );
}
