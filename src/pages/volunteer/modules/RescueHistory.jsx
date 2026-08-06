import { useState } from "react";

const starterHistory = [
    {
        id: 1,
        animal: "Unknown Dog",
        location: "Koronadal Public Market",
        completedDate: "2026-08-05",
        duration: "1 hour 20 mins",
        outcome: "Successfully rescued",
    },
    {
        id: 2,
        animal: "Orange Cat",
        location: "City Hall",
        completedDate: "2026-08-03",
        duration: "45 mins",
        outcome: "Transferred to shelter",
    },
];

export default function RescueHistory() {

    const [history] = useState(starterHistory);

    return (
        <section className="volunteer-history-page">

            <section className="staff-panel">

                <div className="staff-panel-heading">
                    <h2>My Rescue History</h2>
                </div>

                <div className="volunteer-history-list">

                    {history.map((record) => (

                        <article
                            key={record.id}
                            className="volunteer-history-card"
                        >

                            <h3>{record.animal}</h3>

                            <p>
                                <strong>Location:</strong>{" "}
                                {record.location}
                            </p>

                            <p>
                                <strong>Date:</strong>{" "}
                                {record.completedDate}
                            </p>

                            <p>
                                <strong>Duration:</strong>{" "}
                                {record.duration}
                            </p>

                            <p>
                                <strong>Outcome:</strong>{" "}
                                {record.outcome}
                            </p>

                            <span
                                className="staff-status-pill completed"
                            >
                                Completed
                            </span>

                        </article>

                    ))}

                </div>

            </section>

        </section>
    );
}