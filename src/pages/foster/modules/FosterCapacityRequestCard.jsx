import { useState } from "react";
import { formatDate } from "../../../utils/formatDate";

const API = import.meta.env.VITE_BACKEND_URL;
const MAX_FOSTER_CAPACITY = 10;

function animalsLabel(count) {
    return `${count} ${count === 1 ? "animal" : "animals"}`;
}

// Approved foster asks staff to raise how many animals they can foster at once
export default function FosterCapacityRequestCard({ application, activeAssignmentCount = 0, onChanged }) {
    const currentCapacity = application.capacity || 1;
    const pendingRequest = application.capacityRequest?.status === "pending" ? application.capacityRequest : null;
    const isAtMaximum = currentCapacity >= MAX_FOSTER_CAPACITY;

    const [requestedCapacity, setRequestedCapacity] = useState(Math.min(currentCapacity + 1, MAX_FOSTER_CAPACITY));
    const [reason, setReason] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    async function sendCapacityRequest(method, body) {
        setIsSending(true);
        setMessage({ text: "", type: "" });
        try {
            const response = await fetch(`${API}/api/foster/applications/me/capacity-request`, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "ngrok-skip-browser-warning": "true",
                },
                body: body ? JSON.stringify(body) : undefined,
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                setMessage({ text: data.message || "Could not send the request.", type: "error" });
                return;
            }
            setMessage({ text: data.message, type: "success" });
            setReason("");
            onChanged?.();
        } catch (error) {
            console.error("Foster capacity request error:", error);
            setMessage({ text: "Server error. Please try again.", type: "error" });
        } finally {
            setIsSending(false);
        }
    }

    return (
        <div className="ffs-card fcr-card">
            <div className="ffs-head">
                <div>
                    <h3>Foster more animals</h3>
                    <p>
                        You can foster up to <b>{currentCapacity}</b> at a time. You have{" "}
                        <b>{activeAssignmentCount}</b> in your care now.
                    </p>
                </div>
                {pendingRequest && <span className="fcr-wait">Waiting for review</span>}
            </div>

            {message.text && <div className={`foster-alert ${message.type}`}>{message.text}</div>}

            {pendingRequest ? (
                <div className="fcr-sent">
                    <b>
                        Requested: {currentCapacity} → {animalsLabel(pendingRequest.requestedCapacity)}
                    </b>
                    <span>
                        Sent {formatDate(pendingRequest.requestedAt)}. Staff will reply in your notifications.
                    </span>
                    <button
                        type="button"
                        className="fcr-cancel"
                        disabled={isSending}
                        onClick={() => sendCapacityRequest("DELETE")}
                    >
                        {isSending ? "Cancelling…" : "Cancel request"}
                    </button>
                </div>
            ) : isAtMaximum ? (
                <p className="fcr-note">You are at the highest limit ({MAX_FOSTER_CAPACITY} animals).</p>
            ) : (
                <>
                    <form
                        className="fcr-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            sendCapacityRequest("POST", { requestedCapacity, reason });
                        }}
                    >
                        <div className="fcr-field">
                            <span className="fcr-label" id="fcr-new-maximum">New maximum</span>
                            <div className="ffc-stepper" role="group" aria-labelledby="fcr-new-maximum">
                                <button
                                    type="button"
                                    aria-label="Decrease new maximum"
                                    disabled={requestedCapacity <= currentCapacity + 1}
                                    onClick={() => setRequestedCapacity((value) => value - 1)}
                                >
                                    −
                                </button>
                                <output aria-live="polite">{requestedCapacity}</output>
                                <button
                                    type="button"
                                    aria-label="Increase new maximum"
                                    disabled={requestedCapacity >= MAX_FOSTER_CAPACITY}
                                    onClick={() => setRequestedCapacity((value) => value + 1)}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <label className="fcr-field fcr-reason">
                            <span className="fcr-label">Why (optional)</span>
                            <input
                                type="text"
                                maxLength={300}
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                placeholder="e.g. We moved to a bigger house"
                            />
                        </label>

                        <button type="submit" className="ffc-btn fcr-send" disabled={isSending}>
                            {isSending ? "Sending…" : "Send request"}
                        </button>
                    </form>
                    <p className="fcr-note">Staff review the request first. Your current limit stays until they approve it.</p>
                </>
            )}
        </div>
    );
}
