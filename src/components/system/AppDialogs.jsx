import { useEffect, useState } from "react";
import "../../styles/components/AppDialogs.css";

// One themed confirm box, text prompt and toast list for every page.
// Modules call these instead of the browser's confirm / prompt / alert:
//   await window.rbConfirm({ title, message, confirmLabel, cancelLabel, danger })   -> true / false
//   await window.rbPrompt({ title, message, label, placeholder, required, confirmLabel, danger }) -> text / null
//   window.rbToast(text, "success" | "error")
export default function AppDialogs() {
    const [dialog, setDialog] = useState(null);
    const [promptText, setPromptText] = useState("");
    const [promptError, setPromptError] = useState("");
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        window.rbConfirm = (options) =>
            new Promise((resolve) => {
                setDialog({ ...options, kind: "confirm", resolve });
            });

        window.rbPrompt = (options) =>
            new Promise((resolve) => {
                setPromptText(options.defaultValue || "");
                setPromptError("");
                setDialog({ ...options, kind: "prompt", resolve });
            });

        window.rbToast = (text, tone = "success") => {
            const id = `${Date.now()}-${Math.random()}`;
            setToasts((current) => [...current, { id, text, tone }]);
            setTimeout(() => {
                setToasts((current) => current.filter((toast) => toast.id !== id));
            }, 3200);
        };

        return () => {
            delete window.rbConfirm;
            delete window.rbPrompt;
            delete window.rbToast;
        };
    }, []);

    // Read once here (React Compiler tracks these instead of dialog.kind on a null dialog)
    const isPrompt = dialog?.kind === "prompt";
    const isPromptRequired = Boolean(dialog?.required);
    const promptLabel = dialog?.label || "This";

    function closeDialog(answer) {
        dialog?.resolve(answer);
        setDialog(null);
    }

    function cancelDialog() {
        closeDialog(isPrompt ? null : false);
    }

    function confirmDialog() {
        if (!isPrompt) {
            closeDialog(true);
            return;
        }

        const text = promptText.trim();
        if (isPromptRequired && !text) {
            setPromptError(`${promptLabel} is required.`);
            return;
        }
        closeDialog(text);
    }

    useEffect(() => {
        if (!dialog) return undefined;

        function closeOnEscape(event) {
            if (event.key === "Escape") cancelDialog();
        }

        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    });

    return (
        <>
            {dialog && (
                <div className="ao-confirm-backdrop" onClick={cancelDialog}>
                    <div
                        className={`ao-confirm${dialog.danger ? " danger" : ""}`}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ao-confirm-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 id="ao-confirm-title">{dialog.title}</h3>
                        {dialog.message && <p>{dialog.message}</p>}

                        {isPrompt && (
                            <label className="ao-prompt-field">
                                {dialog.label && (
                                    <span>
                                        {dialog.label}
                                        {isPromptRequired ? " *" : " (optional)"}
                                    </span>
                                )}
                                <textarea
                                    value={promptText}
                                    placeholder={dialog.placeholder || ""}
                                    autoFocus
                                    rows={3}
                                    onChange={(event) => {
                                        setPromptText(event.target.value);
                                        setPromptError("");
                                    }}
                                />
                                {promptError && <small className="ao-prompt-error">{promptError}</small>}
                            </label>
                        )}

                        <div className="ao-confirm-actions">
                            <button type="button" autoFocus={!isPrompt} onClick={cancelDialog}>
                                {dialog.cancelLabel || "Cancel"}
                            </button>
                            <button type="button" className="ao-confirm-ok" onClick={confirmDialog}>
                                {dialog.confirmLabel || "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="ao-toasts" aria-live="polite">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`ao-toast ${toast.tone}`} role={toast.tone === "error" ? "alert" : undefined}>
                        <i aria-hidden="true">{toast.tone === "error" ? "!" : "✓"}</i>
                        {toast.text}
                    </div>
                ))}
            </div>
        </>
    );
}
