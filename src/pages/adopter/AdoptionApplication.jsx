import { useState } from "react";
import "../../styles/adopter/AdoptionApplication.css";
import assets from "../../data/assets.json"

const API = import.meta.env.VITE_BACKEND_URL;

export default function AdoptionPage({ pet, setPage }) {
    const savedUser = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");

    const [form, setForm] = useState({
        fullName: savedUser.username || savedUser.name || "",
        email: savedUser.email || "",
        phone: "",
        address: "",
        petName: pet?.name || "",
        petBreed: pet?.breed || "",
        homeType: "House",
        hasChildren: "No",
        hasOtherPets: "No",
        reason: "",
        experience: "",
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    function handleChange(e) {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setLoading(true);
            setMessage("");

            const response = await fetch(`${API}/api/adoptions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...form,
                    status: "pending",
                    role: "adopter",
                }),
            });

            const data = await response.json();
            console.log("Adoption submit:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to submit application.");
                return;
            }

            localStorage.setItem(
                "rescuebase_pending_application",
                JSON.stringify({
                    status: "pending",
                    petName: data.application?.petName || form.petName,
                    petBreed: data.application?.petBreed || form.petBreed,
                    applicationId: data.application?._id,
                    submittedAt: new Date().toISOString(),
                })
            );

            setMessage("Application submitted! Waiting for approval.");

            setTimeout(() => {
                setPage("dashboard");
            }, 900);
        } catch (error) {
            console.error("Adoption submit error:", error);
            setMessage("Server error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="adoption-page">
            <header className="adoption-header">
                <button
                    className="adoption-back-btn"
                    type="button"
                    onClick={() => setPage("dashboard")}
                >
                    ← Back
                </button>

                <div className="adoption-brand">
                    <img src={assets.logo} alt="RescueBase logo" />
                    <span>RescueBase</span>
                </div>
            </header>

            <section className="adoption-hero">
                <div>
                    <h1>Adoption Application</h1>
                    <p>Submit your application and wait for shelter approval.</p>
                </div>

                <img src={assets.images.bannerPets} alt="" />
            </section>

            <section className="adoption-form-section">
                <form className="adoption-form" onSubmit={handleSubmit}>
                    <h2>Applicant Details</h2>

                    <div className="adoption-grid">
                        <label>
                            Full Name
                            <input
                                name="fullName"
                                value={form.fullName}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            Email
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            Phone Number
                            <input
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            Address
                            <input
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            Pet Name
                            <input
                                name="petName"
                                value={form.petName}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            Pet Breed
                            <input
                                name="petBreed"
                                value={form.petBreed}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            Home Type
                            <select name="homeType" value={form.homeType} onChange={handleChange}>
                                <option>House</option>
                                <option>Apartment</option>
                                <option>Condo</option>
                                <option>Boarding House</option>
                            </select>
                        </label>

                        <label>
                            Has Children?
                            <select name="hasChildren" value={form.hasChildren} onChange={handleChange}>
                                <option>No</option>
                                <option>Yes</option>
                            </select>
                        </label>

                        <label>
                            Has Other Pets?
                            <select name="hasOtherPets" value={form.hasOtherPets} onChange={handleChange}>
                                <option>No</option>
                                <option>Yes</option>
                            </select>
                        </label>

                        <label className="full">
                            Why do you want to adopt?
                            <textarea
                                name="reason"
                                value={form.reason}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label className="full">
                            Pet care experience
                            <textarea
                                name="experience"
                                value={form.experience}
                                onChange={handleChange}
                            />
                        </label>
                    </div>

                    {message && <p className="adoption-message">{message}</p>}

                    <div className="adoption-actions">
                        <button
                            className="adoption-cancel-btn"
                            type="button"
                            onClick={() => setPage("dashboard")}
                        >
                            Cancel
                        </button>

                        <button className="adoption-submit-btn" type="submit" disabled={loading}>
                            {loading ? "Submitting..." : "Submit Application"}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );

}