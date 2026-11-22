import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import "../../styles/components/QrScanDialog.css";

// Camera window that reads one QR code and hands its text to onScan (may be async). onScan returns:
// - nothing: done (the parent closes the window)
// - a string: an error to show, with "Scan again"
// - { message, linkLabel, linkHref }: a note to show, with a button that goes to linkHref
export default function QrScanDialog({ onScan, onClose }) {
    const videoRef = useRef(null);
    const [cameraError, setCameraError] = useState("");
    const [scanResult, setScanResult] = useState(null);
    const [scanRound, setScanRound] = useState(0);
    // Kept in a ref so a new onScan from the parent doesn't restart the camera
    const onScanRef = useRef(onScan);
    useEffect(() => { onScanRef.current = onScan; }, [onScan]);

    useEffect(() => {
        const closeOnEscape = (event) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [onClose]);

    useEffect(() => {
        if (scanResult) return undefined;
        let stream = null;
        let frameRequest = 0;
        let stopped = false;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });

        async function readFrame() {
            if (stopped) return;
            const video = videoRef.current;
            if (video && video.readyState >= video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const frame = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
                if (code?.data) {
                    let result;
                    try {
                        result = await onScanRef.current(code.data);
                    } catch (error) {
                        result = error.message || "Couldn't look up that tag.";
                    }
                    if (stopped || !result) return;
                    setScanResult(typeof result === "string" ? { message: result, isError: true } : result);
                    return;
                }
            }
            frameRequest = requestAnimationFrame(readFrame);
        }

        async function startCamera() {
            if (!navigator.mediaDevices?.getUserMedia) {
                setCameraError("This browser can't open the camera. Type the tag code in the search box instead.");
                return;
            }
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
                if (stopped) return stream.getTracks().forEach((track) => track.stop());
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                readFrame();
            } catch (error) {
                setCameraError(
                    error?.name === "NotAllowedError"
                        ? "Camera access was blocked. Allow the camera for this site, or type the tag code in the search box."
                        : "Couldn't open the camera. Type the tag code in the search box instead."
                );
            }
        }

        startCamera();
        return () => {
            stopped = true;
            cancelAnimationFrame(frameRequest);
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [scanResult, scanRound]);

    function scanAgain() {
        setScanResult(null);
        setScanRound((round) => round + 1);
    }

    return (
        <div className="ao-confirm-backdrop" onClick={onClose}>
            <div
                className="ao-confirm qr-scan"
                role="dialog"
                aria-modal="true"
                aria-labelledby="qr-scan-title"
                onClick={(event) => event.stopPropagation()}
            >
                <h3 id="qr-scan-title">Scan a pet's QR tag</h3>
                {cameraError ? (
                    <p className="qr-scan-error" role="alert">{cameraError}</p>
                ) : scanResult ? (
                    <p className={scanResult.isError ? "qr-scan-error" : undefined} role="alert">{scanResult.message}</p>
                ) : (
                    <>
                        <div className="qr-scan-frame">
                            <video ref={videoRef} muted playsInline aria-label="Camera preview" />
                        </div>
                        <p>Point the camera at the tag. The pet opens when it's read.</p>
                    </>
                )}
                <div className="ao-confirm-actions">
                    <button type="button" onClick={onClose}>Close</button>
                    {scanResult?.isError && (
                        <button type="button" className="ao-confirm-ok" onClick={scanAgain}>Scan again</button>
                    )}
                    {scanResult?.linkHref && (
                        <button type="button" className="ao-confirm-ok" onClick={() => { window.location.href = scanResult.linkHref; }}>{scanResult.linkLabel}</button>
                    )}
                </div>
            </div>
        </div>
    );
}
