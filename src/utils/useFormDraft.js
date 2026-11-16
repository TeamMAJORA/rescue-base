import { useEffect, useState } from "react";

// Keeps a form's answers on this device while the person types, so leaving or refreshing never loses them.
// Saved as { values, savedAt } under `draftKey`; nothing is saved while `shouldSave` is false (empty form, editing).
export function readFormDraft(draftKey) {
    try {
        return JSON.parse(localStorage.getItem(draftKey) || "null")?.values ?? null;
    } catch {
        return null;
    }
}

export function useFormDraft(draftKey, values, shouldSave) {
    const [savedAt, setSavedAt] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(draftKey) || "null")?.savedAt ?? null;
        } catch {
            return null;
        }
    });
    const serializedValues = JSON.stringify(values);

    useEffect(() => {
        if (!shouldSave) return undefined;
        const timer = setTimeout(() => {
            const now = new Date().toISOString();
            try {
                localStorage.setItem(draftKey, JSON.stringify({ values: JSON.parse(serializedValues), savedAt: now }));
                setSavedAt(now);
            } catch {
                // storage full or blocked: the form still works, it just isn't saved
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [draftKey, serializedValues, shouldSave]);

    function clearDraft() {
        try {
            localStorage.removeItem(draftKey);
        } catch {
            // nothing saved to remove
        }
        setSavedAt(null);
    }

    return { draftSavedAt: savedAt, clearDraft };
}
