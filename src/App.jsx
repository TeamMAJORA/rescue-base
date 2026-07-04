import { useState } from "react";
import "./styles/App.css";
import './animations/AppAnimation.css'
import assets from "./data/assets.json";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/adopter/Dashboard";
import AdoptionPage from "./pages/adopter/AdoptionApplication";
import AdminDashboard from "./pages/admin/AdminDashboard";
import FosterDashboard from "./pages/foster/FosterDashboard";

// Array = OBJECT 
const pets = [
    {
        name: "Max",
        breed: "Shih Tzu",
        age: "4 years",
        tag: "Kid Friendly",
        image: assets.images.authPets,
    },
    {
        name: "Blacky",
        breed: "Aspin",
        age: "1 year",
        tag: "Kid Friendly",
        image: assets.images.authPets2,
    },
    {
        name: "Chichay",
        breed: "Puspin",
        age: "4 years",
        tag: "Kid Friendly",
        image: assets.images.authPets,
    },
];

const stats = [
    { value: "2,847", label: "Pets Adopted" },
    { value: "94%", label: "Match Rate" },
    { value: "12", label: "Partner Shelters" },
    { value: "4.9", label: "Adopter Rating" },
];

const adoptionSteps = [
    {
        icon: assets.icons.pawSearch,
        title: "Take the Match Quiz",
        text: "Answer a few fun questions about your lifestyle. Our AI finds pets that fit you.",
    },
    {
        icon: assets.icons.redHeart,
        title: "Meet Your Matches",
        text: "Browse your personalized pet gallery with safe profiles, photos, and personality breakdowns.",
    },
    {
        icon: assets.icons.home,
        title: "Apply & Bring Them Home",
        text: "Submit your application in minutes. Our staff guides you through every step of the journey.",
    },
];

const features = [
    {
        icon: assets.icons.pawSearch,
        title: "AI-Powered Matching",
        text: "Our quiz algorithm weighs lifestyle, experience, and home setup to surface your most compatible pets first.",
    },
    {
        icon: assets.icons.passport,
        title: "Digital Pet Passport",
        text: "Every animal has a complete medical history, vaccination records, and personality notes — all in one place.",
    },
    {
        icon: assets.icons.home,
        title: "Guardian Watch",
        text: "Our in-house AI care monitoring watches out for common issues before adoption.",
    },
    {
        icon: assets.icons.redHeart,
        title: "Real-Time Analytics",
        text: "Shelter managers get live dashboards, intake trends, adoption rates, and donation impact at a glance.",
    },
];

function Header({ onLogin }) {
    return (
        <header className="header">
            <a className="brand" href="/">
                <img src={assets.logo} alt="RescueBase logo" />
                <span>RescueBase</span>
            </a>

            <nav className="nav">
                <a href="#about">About Us</a>
                <img src={assets.icons.redPaw} alt="" />
                <a href="#pets">Browse Pets</a>
                <img src={assets.icons.redPaw} alt="" />
            </nav>

            <div className="header-actions">
                <button className="login-btn" type="button" onClick={onLogin}>
                    <img src={assets.icons.yellowPaw} alt="" />
                    Log in
                </button>

                <button className="start-btn" type="button" onClick={onLogin}>
                    <img src={assets.icons.yellowPaw} alt="" />
                    Get Started
                </button>
            </div>
        </header>
    );
}

function PetCard({ pet }) {
    return (
        <article className="pet-card">
            <img className="pet-image" src={pet.image} alt={pet.name} />

            <div className="pet-details">
                <h3>{pet.name}</h3>
                <p>{pet.breed}</p>
                <p>{pet.age}</p>
                <span>{pet.tag}</span>
            </div>
        </article>
    );
}

function StatsBand() {
    return (
        <section className="stats-band">
            {stats.map((item) => (
                <div className="stat-item" key={item.label}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                </div>
            ))}
        </section>
    );
}

function AdoptionSteps() {
    return (
        <section className="steps-section">
            <div className="section-heading">
                <h2>Adoption in three steps</h2>
                <p>We've made finding your forever pet as joyful as the moment you meet them.</p>
            </div>

            <div className="steps-grid">
                {adoptionSteps.map((steps, index) => (
                    <article className="step-card" key={steps.title}>
                        <img src={steps.icon} alt="" />
                        <h3>{steps.title}</h3>
                        <p>{steps.text}</p>

                        {index < adoptionSteps.length - 1 && (
                            <img src={assets.icons.stepArrow} alt="" className="step-arrow" />
                        )}
                    </article>
                ))}
            </div>

        </section>
    );
}

function FeatureSection() {
    return (
        <section className="features-section">
            <div className="section-heading">
                <h2>More than an adoption site</h2>
                <p>A complete platform for adopters, shelter staff, and managers — all connected.</p>
            </div>

            <div className="features-grid">
                {features.map((feature) => (
                    <article className="feature-card" key={feature.title}>
                        <img src={feature.icon} alt="" />
                        <div>
                            <h3>{feature.title}</h3>
                            <p>{feature.text}</p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

function CTAFooter() {
    return (
        <section className="cta-footer" id="about">
            <img className="cta-pets" src={assets.images.bannerPets} alt="" />

            <div className="cta-content">
                <h2>
                    From Rescue to Forever <span>Home</span>
                </h2>

                <p>It takes five minutes to take the quiz. It takes a lifetime to love them.</p>

                <div className="cta-actions">
                    <button className="match-btn cta-match-btn" type="button">
                        Find my Match
                        <img src={assets.icons.heart} alt="" />
                    </button>

                    <button className="outline-btn" type="button">
                        Support a Shelter
                    </button>
                </div>
            </div>

            <footer className="footer">
                <div className="footer-brand">
                    <h3>RescueBase</h3>
                    <p>
                        A smart, joyful platform that makes pet adoption feel less scary —
                        for shelters and adopters.
                    </p>
                </div>

                <div>
                    <h4>For Adopters</h4>
                    <a href="#pets">Browse Pets</a>
                    <a href="#pets">Match Quiz</a>
                    <a href="#pets">How it Works</a>
                </div>

                <div>
                    <h4>For Shelters</h4>
                    <a href="#about">Staff Portal</a>
                    <a href="#about">Pet Passport</a>
                    <a href="#about">Guardian Watch</a>
                </div>
            </footer>

            <div className="footer-bottom">
                <div>
                    <a href="#privacy">Privacy</a>
                    <a href="#terms">Terms</a>
                    <a href="#contact">Contact</a>
                </div>

                <span>©2025 RescueBase. All Rights Reserved.</span>
            </div>
        </section>
    );
}

export default function App() {

    const [page, setPage] = useState("home");
    const [selectedPet, setSelectedPet] = useState(null);


    // Checks the database on User Roles

    if (page === "auth" || page === "login") {
        return (
            <AuthPage
                mode="login"
                setPage={setPage}
            />
        );
    }

    if (page === "signup") {
        return (
            <AuthPage
                mode="signup"
                setPage={setPage}
            />
        );
    }

    if (page === "dashboard") {
        return (
            <Dashboard
                onLogout={() => setPage("home")}
                onApply={(pet) => {
                    setSelectedPet(pet || null);
                    setPage("adoption")
                }}
            />
        );
    }

    if (page === "adoption") {
        return (
            <AdoptionPage
                pet={selectedPet}
                setPage={setPage}
            />
        )
    }

    if (page === "foster") {
        return <FosterDashboard setPage={setPage} />
    }

    if (page === "admin") {
        return <AdminDashboard setPage={setPage} />
    }

    return (
        <main className="app">
            <Header onLogin={() => setPage("auth")} />

            <img
                className="page-paws"
                src={assets.images.pawTrail}
                alt=""
                aria-hidden="true"
            />

            <img
                className="page-paws-bottom"
                src={assets.images.pawTrail}
                alt=""
                aria-hidden="true"
            />

            <img
                className="page-paws-footer"
                src={assets.images.pawTrail}
                alt=""
                aria-hidden="true"
            />

            <section className="hero">

                <div className="hero-content">
                    <h1>
                        Find Your <br />
                        Perfect <span>Match</span>
                    </h1>

                    <p>Helping every rescued pet find a loving family faster.</p>

                    <button className="match-btn" type="button" onClick={() => setPage("auth")}>
                        Find my Match
                        <img src={assets.icons.heart} alt="" />
                    </button>
                </div>
            </section>

            <section className="pets-section" id="pets">
                <div className="section-heading">
                    <h2>Meet some of our rescues</h2>
                    <p>Every one of them is waiting for you.</p>
                </div>

                <a className="see-all-pets" href="#pets">
                    See All Pets →
                </a>

                <div className="pet-grid">
                    {pets.map((pet) => (
                        <PetCard key={pet.name} pet={pet} />
                    ))}
                </div>

                <p className="pet-note">
                    Sign in to see all available pets and start your application
                </p>

                <div className="pet-actions">
                    <button className="adopt-btn" type="button">
                        Adopt
                        <img src={assets.icons.adopt} alt="" />
                    </button>

                    <button className="donate-btn" type="button">
                        Donate
                        <img src={assets.icons.donate} alt="" />
                    </button>
                </div>
            </section>

            <StatsBand />
            <AdoptionSteps />
            <FeatureSection />
            <CTAFooter />
        </main>
    );
}