import { useEffect, useState } from "react";

// Saved (hearted) pets live in this browser only. The pet list and the pet pop-up share them,
// so a heart tapped in one shows up in the other straight away.
const SAVED_KEY = "rescuebase_saved_pets";
const SAVED_EVENT = "rescuebase:saved-pets";

function readSavedPetIds() {
    try {
        return JSON.parse(localStorage.getItem(SAVED_KEY)) || [];
    } catch {
        return [];
    }
}

export function useSavedPets() {
    const [savedIds, setSavedIds] = useState(readSavedPetIds);

    useEffect(() => {
        const syncSavedIds = () => setSavedIds(readSavedPetIds());
        window.addEventListener(SAVED_EVENT, syncSavedIds);
        return () => window.removeEventListener(SAVED_EVENT, syncSavedIds);
    }, []);

    function toggleSaved(petId) {
        const current = readSavedPetIds();
        const next = current.includes(petId)
            ? current.filter((savedId) => savedId !== petId)
            : [...current, petId];

        try {
            localStorage.setItem(SAVED_KEY, JSON.stringify(next));
        } catch {
            // storage unavailable — keep it in memory only
        }

        setSavedIds(next);
        window.dispatchEvent(new Event(SAVED_EVENT));
    }

    return { savedIds, isSaved: (petId) => savedIds.includes(petId), toggleSaved };
}
