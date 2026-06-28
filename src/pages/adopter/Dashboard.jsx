import { useEffect,useMemo, useState } from "react";
import "../../styles/adopter/Dashboard.css";
import assets from "../../data/assets.json";

const shelters = [
    {
        name: "All Shelters",
        location: "2 Locations",
        phone: "",
        active: true,
    },
    {
        name: "Shelter 1",
        location: "Location",
        phone: "+68**********",
        active: false,
    },
    {
        name: "Shelter 2",
        location: "Location",
        phone: "+68**********",
        active: false,
    },
];

const pets = [
    {
        name: "Max",
        type: "Dog",
        breed: "Shih Tzu",
        age: "4 years",
        status: "Available",
        image: assets.images.authPets,
        tags: ["Kid Friendly", "Vaccinated"],
    },
    {
        name: "Blacky",
        type: "Dog",
        breed: "Aspin",
        age: "1 year",
        status: "Pending",
        image: assets.images.authPets2,
        tags: ["Kid Friendly"],
    },
    {
        name: "Chichay",
        type: "Cat",
        breed: "Puspin",
        age: "4 years",
        status: "Foster",
        image: assets.images.authPets,
        tags: ["Calm", "Indoor"],
    },
    {
        name: "Milo",
        type: "Dog",
        breed: "Mixed Breed",
        age: "2 years",
        status: "Available",
        image: assets.images.authPets2,
        tags: ["Playful"],
    },
    {
        name: "Luna",
        type: "Cat",
        breed: "Puspin",
        age: "1 year",
        status: "Available",
        image: assets.images.authPets,
        tags: ["Gentle"],
    },
    {
        name: "Coco",
        type: "Dog",
        breed: "Aspin",
        age: "3 years",
        status: "Available",
        image: assets.images.authPets2,
        tags: ["Friendly"],
    },
    {
        name: "Mochi",
        type: "Cat",
        breed: "Persian Mix",
        age: "2 years",
        status: "Available",
        image: assets.images.authPets,
        tags: ["Quiet"],
    },
    {
        name: "Buddy",
        type: "Dog",
        breed: "Golden Mix",
        age: "5 years",
        status: "Pending",
        image: assets.images.authPets2,
        tags: ["Trained"],
    },
    {
        name: "Snow",
        type: "Cat",
        breed: "Puspin",
        age: "8 months",
        status: "Available",
        image: assets.images.authPets,
        tags: ["Young"],
    },
];

function ApplicationStatusCard({ application, onReview}) {
    const statusText = {
        pending : "Pending review",
        approved : "Approved",
        rejected : "Rejected",
    };

    return (
        <section className={`dashboard-application-card ${application.status}`}>
            <div>
                <p className="dashboard-application-label">Adoption Application</p>

                <h2>
                    {application.status === "pending"
                        ? "You have a pending application"
                        : application.status === "approved"
                            ? "Your applciation was approved"
                            : "Your application was rejected"
                    }
                </h2>

                <p>
                    Pet : <strong>{application.petName || "Not selected"}</strong>
                </p>

                <p>
                    Status : {" "}
                    <strong>{statusText[application.status] || application.status}</strong>
                </p>
            </div>

            <button type="button" onClick={onReview}>
                    Review Application
            </button>
        </section>
    );
}

function ApplicationDetailsModal({ application, onClose }) {
    if (!application) return null;

    return (
        <div className="application-modal-overlay">
            <section className="application-modal">
                <button
                    className="application-modal-close"
                    type="button"
                    onClick={onClose}
                >
                    x
                </button>

                <h2> Application Details </h2>

                <div className="application-detail-grid">
                    <p><strong>Status:</strong> {application.status} </p>
                    <p><strong>Full Name:</strong> {application.fullName} </p>
                    <p><strong>Email:</strong> {application.email} </p>
                    <p><strong>Phone:</strong> {application.phone} </p>
                    <p><strong>Address</strong> {application.address} </p>
                    <p><strong>Pet Name:</strong> {application.petName || "Not Selected" } </p>
                    <p><strong>Pet Breed:</strong> {application.petBreed || "N/A" } </p>
                    <p><strong>Home Type:</strong> {application.homeType} </p>
                    <p><strong>Has Children:</strong> {application.hasChildren} </p>
                    <p><strong>Has Other Pets:</strong> {application.hasOtherPets} </p>
                </div>

                <div className="application-detail-section">
                    <h3>Reason for adoption</h3>
                    <p> {application.reason || "No reason provided" } </p>
                </div>

                <div className="application-detail-section">
                    <h3>Pet Care Experience</h3>
                    <p> {application.experience || "No experience provided" } </p>
                </div>

            </section>
        </div>
    )
}

function DashboardHeader({ onLogout, onApply }) {

    const [application, setApplication] = useState(null);
    const [showApplication, setShowApplication] = useState(null);

    return (
        <header className="dashboard-header">
            <a className="dashboard-brand" href="/">
                <img src={assets.logo} alt="RescueBase logo" />
                <span>RescueBase</span>
            </a>

            <nav className="dashboard-nav">
                <a href="#about">About Us</a>
                <img src={assets.icons.redPaw} alt="" />
                <a href="#pets">Browse Pets</a>
                <img src={assets.icons.redPaw} alt="" />
                <a href="#foster">Donate & Foster</a>
                <img src={assets.icons.redPaw} alt="" />
            </nav>

            <button className="dashboard-user-btn" type="button" onClick={onLogout}>
                <span>♡</span>
                Vervou
            </button>
        </header>
    );
}

function ShelterCard({ shelter }) {
    return (
        <article className={`dashboard-shelter-card ${shelter.active ? "active" : ""}`}>
            <div className="dashboard-shelter-avatar"></div>

            <div>
                <h3>{shelter.name}</h3>
                <p>⌾ {shelter.location}</p>
                {shelter.phone && <p>☎ {shelter.phone}</p>}
            </div>
        </article>
    );
}

function PetCard({ pet, onApply }) {
    return (
        <article className="dashboard-pet-card">
            <div className="dashboard-pet-image">
                <img src={pet.image} alt={pet.name} />

                <span className={`dashboard-pet-status ${pet.status.toLowerCase()}`}>
                    {pet.status}
                </span>
            </div>

            <div className="dashboard-pet-info">
                <h3>{pet.name}</h3>
                <p>{pet.breed}</p>
                <p>{pet.age}</p>

                <div className="dashboard-pet-tags">
                    {pet.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                    ))}
                </div>

                <button
                    className="dashboard-apply-btn"
                    type="button"
                    onClick={() => onApply?.(pet)}
                >
                    Apply to Adopt
                </button>
            </div>
        </article>
    );
}

export default function Dashboard({ onLogout, onApply }) {
    const [filter, setFilter] = useState("All");
    const [application, setApplication] = useState(null);
    const [showApplication, setShowApplication] = useState(false);

    const filteredPets = useMemo(() => {
        if (filter === "All") return pets;
        return pets.filter((pet) => pet.type === filter);
    }, [filter]);

    useEffect(() => {
        async function fetchApplication() {
            try {
                const savedUser = JSON.parse(
                    localStorage.getItem("rescuebase_user") || "{}" 
                );

                if (!savedUser.email) return;

                const response = await fetch(
                    `http://localhost:5000/api/adoptions/user/${encodeURIComponent(savedUser.email)}/latest`
                );

                const data = await response.json();
                console.log("Latest application", data);

                if (data.success && data.application) {
                    setApplication(data.application);
                }
            } catch (error) {
                console.error("Fetch application error:", error);
            }
        }

        fetchApplication();
    }, []);

    const hasApplication = Boolean(application);

    return (
        <main className="dashboard-page">
            <DashboardHeader onLogout={onLogout} />

            <section className="dashboard-hero">
                <img src={assets.images.bannerPets} alt="" />

                <div className="dashboard-hero-text">
                    <h1>
                        Find Your Perfect <span>Match</span>
                    </h1>
                    <p>Helping every rescued pet find a loving family faster.</p>
                </div>
            </section>

            <section className="dashboard-content" id="pets">
                <aside className="dashboard-sidebar">
                    <h2>⌾ Shelters Near You</h2>

                    <div className="dashboard-shelter-list">
                        {shelters.map((shelter) => (
                            <ShelterCard key={shelter.name} shelter={shelter} />
                        ))}
                    </div>
                </aside>

                <section className="dashboard-main">

                    {hasApplication && (
                        <ApplicationStatusCard
                            application = {application}
                            onReview={() => setShowApplication(true)}
                        />
                    )}

                    <div className="dashboard-top-row">
                        <div className="dashboard-filters">
                            {["All", "Dog", "Cat"].map((item) => (
                                <button
                                    key={item}
                                    className={filter === item ? "active" : ""}
                                    type="button"
                                    onClick={() => setFilter(item)}
                                >
                                    {item === "All" ? "All Pets" : `${item}s`}
                                </button>
                            ))}
                        </div>

                        <button
                            className="dashboard-quiz-btn"
                            type="button"
                            onClick={() => {
                                if (hasApplication) {
                                    setShowApplication(true);
                                    return;
                                }

                                onApply?.(null);
                            }}
                        >
                            {hasApplication ? "Review Application" : "Submit Application" }
                        </button>
                    </div>

                    <div className="dashboard-pet-grid">
                        {filteredPets.map((pet) => (
                            <PetCard key={pet.name} pet={pet} onApply={onApply} />
                        ))}
                    </div>
                </section>
            </section>

            {showApplication && (
                <ApplicationDetailsModal
                    application={application}
                    onClose={() => setShowApplication(false)}
                />
            )}

        </main>
    );
}