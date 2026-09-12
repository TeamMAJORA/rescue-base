import { useState } from "react";

const starterAssignments = [
    {
        id: 1,
        animal: "Unknown Dog",
        location: "Koronadal Public Market",
        priority: "High",
        assignedBy: "Staff A",
        assignedDate: "2026-08-06",
        status: "Pending",
        notes: "Dog reported with injured leg.",
    },
    {
        id: 2,
        animal: "Orange Cat",
        location: "City Hall",
        priority: "Medium",
        assignedBy: "Staff B",
        assignedDate: "2026-08-05",
        status: "Accepted",
        notes: "Reported by local resident.",
    },
];

export default function RescueAssignments() {
    const [assignments, setAssignments] = useState(starterAssignments);

    function updateStatus(id, status) {
        setAssignments((current) =>
            current.map((assignment) =>
                assignment.id === id
                    ? {
                        ...assignment,
                        status,
                    }
                    : assignment
            )
        );
    }

    return (
        <section className="volunteer-rescue-page">
            <section className="staff-panel">
                <div className="staff-panel-heading">
                    <h2>My Rescue Assignments</h2>
                </div>

                <div className="volunteer-rescue-list">
                    {assignments.map((assignment) => (
                        <article
                            key={assignment.id}
                            className="volunteer-rescue-card"
                        >
                            <div>
                                <h3>{assignment.animal}</h3>
                                <p>
                                    <strong>Location:</strong>{" "}
                                    {assignment.location}
                                </p>

                                <p>
                                    <strong>Priority:</strong>{" "}
                                    {assignment.priority}
                                </p>

                                <p>
                                    <strong>Assigned By:</strong>{" "}
                                    {assignment.assignedBy}
                                </p>

                                <p>
                                    <strong>Date:</strong>{" "}
                                    {assignment.assignedDate}
                                </p>

                                <p>
                                    <strong>Notes:</strong>{" "}
                                    {assignment.notes}
                                </p>

                                <span
                                    className={`staff-status-pill ${assignment.status.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                    {assignment.status}
                                </span>
                            </div>
                            <div className="volunteer-rescue-actions">
                                {assignment.status === "Pending" && (
                                    <button
                                        onClick={() =>
                                            updateStatus(
                                                assignment.id,
                                                "Accepted"
                                            )
                                        }
                                    >
                                        Accept
                                    </button>
                                )}

                                {assignment.status === "Accepted" && (
                                    <>
                                        <button
                                            onClick={() =>
                                                updateStatus(
                                                    assignment.id,
                                                    "In Progress"
                                                )
                                            }
                                        >
                                            Start Rescue
                                        </button>

                                        <button>
                                            Open Mobile Intake
                                        </button>
                                    </>
                                )}

                                {assignment.status === "In Progress" && (
                                    <button
                                        onClick={() =>
                                            updateStatus(
                                                assignment.id,
                                                "Completed"
                                            )
                                        }
                                    >
                                        Complete Rescue
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </section>
    );
}