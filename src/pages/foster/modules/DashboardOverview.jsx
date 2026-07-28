export default function DashboardOverview({
    fosterName,
    application,
    assignment,
}) {
    function formatDate(date) {
        if (!date) return "N/A";

        return new Date(date).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    const updateCount = assignment?.updates?.length || 0;

    const daysFostering = assignment?.startDate
        ? Math.floor(
            (Date.now() - new Date(assignment.startDate)) /
            (1000 * 60 * 60 * 24)
        )
        : 0;

    return (
        <section className="foster-dashboard-overview">
            <section className="foster-panel foster-dashboard-banner">
                <div>
                    <span className="foster-label">
                        Welcome Back
                    </span>
                    <h2>
                        {fosterName}
                    </h2>
                    <p>
                        Thank you for opening your home to rescued
                        animals. Here is your current foster activity.
                    </p>
                </div>

                <div className="foster-dashboard-status">
                    <span>Status</span>
                    <strong
                        className={`status ${application?.status || "pending"}`}
                    >
                        {application?.status || "No Application"}
                    </strong>
                </div>
            </section>
            <section className="foster-dashboard-stats">
                <article className="foster-stat-card">
                    <span>Current Foster</span>
                    <strong>
                        {assignment
                            ? assignment.petName
                            : "None"}
                    </strong>
                </article>
                <article className="foster-stat-card">
                    <span>Weekly Updates</span>
                    <strong>
                        {updateCount}
                    </strong>
                </article>
                <article className="foster-stat-card">
                    <span>Days Fostering</span>
                    <strong>
                        {assignment
                            ? daysFostering
                            : 0}
                    </strong>
                </article>
            </section>
            <section className="foster-panel foster-current-pet">
                <div className="foster-current-image">
                    <img
                        src={
                            assignment?.petImage ||
                            "https://placehold.co/240x240?text=Pet"
                        }
                        alt={assignment?.petName || "Pet"}
                    />
                </div>

                <div className="foster-current-info">
                    <h2>
                        {assignment?.petName || "No Active Foster"}
                    </h2>

                    <p>
                        <strong>Breed:</strong>{" "}
                        {assignment?.petBreed || "Unknown"}
                    </p>

                    <p>
                        <strong>Status:</strong>{" "}
                        {assignment?.status || "None"}
                    </p>

                    <p>
                        <strong>Started:</strong>{" "}
                        {formatDate(assignment?.startDate)}

                    </p>

                    <div className="foster-care-box">
                        <h4>Care Instructions</h4>
                        <p>
                            {assignment?.careInstructions ||
                                "No current foster assignment."}
                        </p>
                    </div>
                </div>
            </section>

            <section className="foster-dashboard-grid">
                <article className="foster-panel">
                    <h3>Recent Activity</h3>
                    {assignment?.updates?.length ? (
                        assignment.updates
                            .slice()
                            .reverse()
                            .slice(0, 5)
                            .map((update) => (
                                <div
                                    key={update._id}
                                    className="foster-activity"
                                >
                                    <strong>
                                        {formatDate(update.createdAt)}
                                    </strong>

                                    <p>
                                        {update.note}
                                    </p>
                                </div>
                            ))
                    ) : (
                        <p>
                            No updates submitted yet.
                        </p>
                    )}
                </article>

                <article className="foster-panel">
                    <h3>Reminder</h3>
                    <ul className="foster-reminders">
                        <li>
                            Submit a weekly update every week.
                        </li>
                        <li>
                            Follow the shelter's care instructions.
                        </li>
                        <li>
                            Contact RescueBase if emergencies occur.
                        </li>
                    </ul>
                </article>
            </section>
        </section>
    );
}