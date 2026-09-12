import { useState } from "react";

const starterActivities = [
    {
        id: 1,
        action: "Accepted Rescue Assignment",
        description: "Accepted rescue assignment for Unknown Dog.",
        date: "2026-08-06",
        time: "09:15 AM",
    },
    {
        id: 2,
        action: "Submitted Mobile Field Intake",
        description: "Submitted field intake for Bella.",
        date: "2026-08-05",
        time: "02:42 PM",
    },
    {
        id: 3,
        action: "Completed Rescue",
        description: "Completed rescue at Koronadal Public Market.",
        date: "2026-08-05",
        time: "03:18 PM",
    },
];

export default function ActivityLog() {

    const [activities] = useState(starterActivities);

    return (
        <section className="volunteer-activity-page">

            <section className="staff-panel">

                <div className="staff-panel-heading">
                    <h2>Activity Log</h2>
                </div>

                <div className="volunteer-activity-list">

                    {activities.map((activity) => (

                        <article
                            key={activity.id}
                            className="volunteer-activity-card"
                        >

                            <h3>
                                {activity.action}
                            </h3>

                            <p>
                                {activity.description}
                            </p>

                            <small>
                                {activity.date} • {activity.time}
                            </small>

                        </article>

                    ))}

                </div>

            </section>

        </section>
    );
}