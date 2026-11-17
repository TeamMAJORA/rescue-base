// The one loading indicator for content areas (audit L1): spinner + what is loading.
// Styles live in styles/components/Feedback.css. Use `inline` inside small boxes and map overlays.
export default function LoadingState({ label = "Loading…", inline = false }) {
    return (
        <div className={`rb-loading${inline ? " is-inline" : ""}`} role="status" aria-live="polite">
            <span className="rb-spinner" aria-hidden="true" />
            {label}
        </div>
    );
}
