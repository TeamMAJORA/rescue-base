// The app's own confirm box, text prompt and toasts (rendered by components/system/AppDialogs,
// which App.jsx mounts once). Use these instead of window.confirm / prompt / alert.

function getDialogs() {
    if (!window.rbConfirm) {
        // Fail fast: a missing AppDialogs is a bug, and a destructive action must not run unconfirmed
        console.error("AppDialogs is not mounted; the action was cancelled.");
    }
    return window;
}

// Resolves true / false. Options: { title, message, confirmLabel, cancelLabel, danger }
export function askConfirm(options) {
    const dialogs = getDialogs();
    return dialogs.rbConfirm ? dialogs.rbConfirm(options) : Promise.resolve(false);
}

// Resolves the typed text, or null when cancelled. Options: { title, message, label, placeholder, required, confirmLabel, danger }
export function askPrompt(options) {
    const dialogs = getDialogs();
    return dialogs.rbPrompt ? dialogs.rbPrompt(options) : Promise.resolve(null);
}

export function notify(text, tone = "success") {
    getDialogs().rbToast?.(text, tone);
}

export function notifyError(text) {
    notify(text, "error");
}

export function notifySuccess(text) {
    notify(text, "success");
}
