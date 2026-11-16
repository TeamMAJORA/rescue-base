import { formatDate } from "./formatDate";

// One validation look for every form that uses the browser's built-in rules
// (required, type="email", minLength, min/max, pattern, or setCustomValidity).
//
// Instead of the browser's pop-up bubble (one field at a time, browser language), the message is
// written under the field in our style:
// - on submit: every problem shows at once and the first one gets focus
// - when leaving a field: only if something was typed (never for a field just tabbed past)
// - while typing: the message disappears as soon as the value is valid
//
// Forms with their own inline validation use noValidate (log in, adoption application) and are untouched.
// No nodes are added to React's tree: the message lives in a data attribute shown by CSS (Forms.css),
// and in aria-description so screen readers read it with the field.

const ERROR_ATTRIBUTE = "data-rb-error";
let focusedThisSubmit = false;

function labelFor(field) {
    const text = (field.labels?.[0]?.innerText || field.getAttribute("aria-label") || field.placeholder || "")
        .split("\n")[0]
        .replace(/\*|\(optional\)|[?:]/gi, "")
        .trim();
    if (!text) return "";
    // "Assessed By" -> "assessed by"; keep acronyms (QR, GIS) and names as written
    return /^[A-Z]{2,}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
}

function readableDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : value;
}

function messageFor(field) {
    const validity = field.validity;
    const label = labelFor(field);
    const choose = field.tagName === "SELECT" || ["radio", "checkbox", "file", "date", "time"].includes(field.type);

    if (validity.customError) return field.validationMessage;
    if (validity.valueMissing) {
        if (field.type === "checkbox" && !field.name) return "Tick this box to continue.";
        return label ? `${choose ? "Choose" : "Enter"} ${label}.` : "This field is required.";
    }
    if (validity.typeMismatch) {
        if (field.type === "email") return "Enter an email like name@example.com.";
        if (field.type === "url") return "Enter a web address like https://example.com.";
    }
    if (validity.tooShort) return `Use at least ${field.minLength} characters (${field.value.length} so far).`;
    if (validity.tooLong) return `Use ${field.maxLength} characters or fewer.`;
    if (validity.rangeUnderflow) return field.type === "date" ? `Choose ${readableDate(field.min)} or later.` : `Enter ${field.min} or more.`;
    if (validity.rangeOverflow) return field.type === "date" ? `Choose ${readableDate(field.max)} or earlier.` : `Enter ${field.max} or less.`;
    if (validity.stepMismatch) return "Enter a whole number.";
    if (validity.patternMismatch) return field.title || "Check the format.";
    if (validity.badInput) return "Enter a valid value.";
    return field.validationMessage || "Check this field.";
}

// Where the message goes: the field's label/field box, or the group around radios.
// A field inside an input group (search box, +63 phone box) puts it under the whole group.
function containerFor(field) {
    if (field.type === "radio") {
        return field.closest("fieldset, [role='radiogroup']") || field.parentElement?.parentElement || field.parentElement;
    }
    let container = field.closest("label") || field.parentElement;
    const style = container && getComputedStyle(container);
    if (container && style.display.includes("flex") && style.flexDirection === "row" && container.offsetHeight < field.offsetHeight + 12) {
        container = container.parentElement;
    }
    return container;
}

function showError(field) {
    const message = messageFor(field);
    containerFor(field)?.setAttribute(ERROR_ATTRIBUTE, message);
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-description", message);
}

function clearError(field) {
    const container = containerFor(field);
    if (container?.hasAttribute(ERROR_ATTRIBUTE)) container.removeAttribute(ERROR_ATTRIBUTE);
    if (field.getAttribute("aria-invalid") === "true") field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-description");
}

function isField(target) {
    return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}

function handleInvalid(event) {
    const field = event.target;
    if (!isField(field)) return;
    event.preventDefault(); // no browser bubble
    showError(field);

    if (!focusedThisSubmit) {
        focusedThisSubmit = true;
        field.focus({ preventScroll: true });
        field.scrollIntoView({ block: "center", behavior: "smooth" });
        setTimeout(() => { focusedThisSubmit = false; }, 0);
    }
}

function handleInput(event) {
    const field = event.target;
    if (!isField(field) || field.form?.noValidate || !field.hasAttribute("aria-invalid")) return;
    if (field.validity.valid) clearError(field);
    else if (field.type !== "radio") showError(field); // keep the message accurate (e.g. "3 so far")
}

function handleBlur(event) {
    const field = event.target;
    if (!isField(field) || !field.form || field.form.noValidate || !field.willValidate) return;
    const hasValue = field.type === "radio" || field.type === "checkbox" ? false : String(field.value).trim() !== "";
    if (hasValue && !field.validity.valid) showError(field);
}

export function installFormValidation() {
    document.addEventListener("invalid", handleInvalid, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("change", handleInput, true);
    document.addEventListener("focusout", handleBlur, true);
}
