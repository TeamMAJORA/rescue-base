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

                            {assignment
                                ? `Thank you for caring for ${assignment.petName}. Your dedication gives rescued animals a second chance.`
                                : "Thank you for being part of the RescueBase Foster Program. Once approved, your foster assignment will appear here."}

                        </p>
                    </div>
                    <div className="foster-dashboard-status">
                        <span>
                            Application Status
                        </span>
                        <strong
                            className={`status ${application?.status || "pending"}`}
                        >
                            {application?.status || "Not Submitted"}
                        </strong>
                    </div>
                </section>

                <section className="foster-dashboard-stats">
                    <article className="foster-stat-card">
                        <span>
                            Current Foster
                        </span>

                        <strong>
                            {assignment
                                ? assignment.petName
                                : "None"}
                        </strong>
                    </article>
                    <article className="foster-stat-card">
                        <span>
                            Weekly Updates
                        </span>
                        <strong>
                            {updateCount}
                        </strong>
                    </article>

                    <article className="foster-stat-card">
                        <span>
                            Days Together
                        </span>
                        <strong>
                            {assignment
                                ? daysFostering
                                : 0}
                        </strong>
                    </article>

                    <article className="foster-stat-card">
                        <span>
                            Foster Progress
                        </span>
                        <strong>
                            {assignment
                                ? "Active"
                                : "Waiting"}
                        </strong>
                    </article>
                </section>

                <section className="foster-panel foster-current-pet">
                    <div className="foster-current-image">

                        <img
                            src={
                                assignment?.petImage ||
                                "https://placehold.co/250x250?text=Pet"
                            }
                            alt={
                                assignment?.petName ||
                                "Pet"
                            }
                        />
                    </div>

                    <div className="foster-current-info">
                        <h2>

                            {assignment?.petName ||
                                "No Active Foster"}

                        </h2>

                        <p>
                            <strong>
                                Breed:
                            </strong>{" "}

                            {assignment?.petBreed ||
                                "Unknown"}
                        </p>

                        <p>
                            <strong>
                                Status:
                            </strong>{" "}

                            {assignment?.status ||
                                "None"}
                        </p>

                        <p>
                            <strong>
                                Started:
                            </strong>{" "}

                            {formatDate(
                                assignment?.startDate
                            )}
                        </p>

                        <div className="foster-care-box">
                            <h4>
                                Care Instructions
                            </h4>
                            <p>
                                {assignment?.careInstructions ||
                                    "No care instructions available."}
                            </p>
                        </div>
                    </div>
                </section>
                <section className="foster-dashboard-grid">
                    <article className="foster-panel">
                        <h3>
                            Today's Tasks
                        </h3>
                        <ul className="foster-reminders">
                            <li>
                                Feed your foster pet.
                            </li>
                            <li>
                                Ensure fresh drinking water.
                            </li>
                            <li>
                                Spend quality interaction time.
                            </li>
                            <li>
                                Monitor for unusual behavior.
                            </li>
                            <li>
                                Submit weekly report if due.
                            </li>
                        </ul>
                    </article>
                    <article className="foster-panel">
                        <h3>
                            Recent Activity
                        </h3>
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
                                            {formatDate(
                                                update.createdAt
                                            )}
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
                        <h3>
                            Shelter Reminders
                        </h3>
                        <ul className="foster-reminders">
                            <li>
                                Submit your weekly report every week.
                            </li>
                            <li>
                                Follow all shelter care instructions.
                            </li>
                            <li>
                                Contact RescueBase immediately during emergencies.
                            </li>
                            <li>
                                Attend scheduled veterinary visits.
                            </li>
                        </ul>
                    </article>
                </section>
            </section>
        )
    }
}