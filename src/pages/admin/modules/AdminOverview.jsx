
import { useEffect, useState } from "react";
import "../../../styles/admin/AdminDashboardOverview.css";

const API = import.meta.env.VITE_BACKEND_URL;

export default function AdminOverview() {
    const [stats, setStats] = useState({
        pendingAdoptions: 0,
        activeFosters: 0,
        completedFosters: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function fetchDashboardStats() {
            setLoading(true);
            setError("");

            try {
                const token = localStorage.getItem("token");

                if (!token) {
                    throw new Error("Please log in to view dashboard statistics.");
                }

                const headers = {
                    Authorization: `Bearer ${token}`,
                };

                const [adoptionResponse, fosterResponse] = await Promise.all([
                    fetch(`${API}/api/adoptions`, { headers }),
                    fetch(`${API}/api/foster/assignments`, { headers }),
                ]);

                if (!adoptionResponse.ok || !fosterResponse.ok) {
                    throw new Error("Unable to load dashboard statistics.");
                }

                const [adoptionData, fosterData] = await Promise.all([
                    adoptionResponse.json(),
                    fosterResponse.json(),
                ]);

                const applications = adoptionData.applications || [];
                const assignments = fosterData.assignments || [];

                const nextStats = {
                    pendingAdoptions: applications.filter(
                        (application) => application.status === "pending"
                    ).length,

                    activeFosters: assignments.filter(
                        (assignment) => assignment.status === "active"
                    ).length,

                    completedFosters: assignments.filter(
                        (assignment) => assignment.status === "completed"
                    ).length,
                };

                if (!cancelled) {
                    setStats(nextStats);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Failed to load dashboard statistics.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchDashboardStats();

        return () => {
            cancelled = true;
        };
    }, []);

    const cards = [
        {
            title: "Pending Adoptions",
            value: stats.pendingAdoptions,
            description: "Applications waiting for review",
        },
        {
            title: "Active Foster Assignments",
            value: stats.activeFosters,
            description: "Assignments currently in progress",
        },
        {
            title: "Completed Foster Assignments",
            value: stats.completedFosters,
            description: "Assignments marked as completed",
        },
    ];

    return (
        <section className="admin-panel admin-simple-dashboard">
            <h2>Admin Dashboard</h2>
            <p>Overview of adoption applications and foster care activity.</p>

            {error && (
                <p role="alert" className="admin-dashboard-error">
                    {error}
                </p>
            )}

            <div className="admin-simple-actions">
                {cards.map((card) => (
                    <article key={card.title}>
                        <strong>{card.title}</strong>
                        <span className="admin-dashboard-stat-value">
                            {loading ? "—" : card.value}
                        </span>
                        <p>{card.description}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}
