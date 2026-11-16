import { useEffect } from "react";

// Small pop-up for the footer's Privacy, Terms and Contact links
export default function InfoModal({ title, onClose, children }) {
    useEffect(() => {
        const handleKey = (event) => event.key === "Escape" && onClose();
        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKey);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    return (
        <div className="info-modal-backdrop" onClick={onClose}>
            <div
                className="info-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="info-modal-title"
                onClick={(event) => event.stopPropagation()}
            >
                <button type="button" className="info-modal-close" onClick={onClose} aria-label="Close">
                    ×
                </button>
                <h2 id="info-modal-title">{title}</h2>
                <div className="info-modal-body">{children}</div>
            </div>
        </div>
    );
}
