import {
    useMemo, useState
} from 'react';

import "../../styles/adopter/Dashboard.css"

const starterPets = [
    {
        id: 1,
        name: "Max",
        type: "Dog",
        breed: "Shih Tzu",
        age: "2 years",
        gender: "Male",
        size: "Small",
        status: "available",
        location: "RescueBase Shelter",
        personality: "Playful, loyal, and friendly",
        idealHome: "Best for families or active adopters",
        health: "Vaccinated and healthy",
        story: "Max is a sweet rescued dog who enjoys attention and short walks.",
        icon: "🐶",
    },
    {
        id: 2,
        name: "Luna",
        type: "Cat",
        breed: "Persian",
        age: "1 year",
        gender: "Female",
        size: "Small",
        status: "available",
        location: "RescueBase Shelter",
        personality: "Calm, gentle, and affectionate",
        idealHome: "Best for quiet homes or apartment living",
        health: "Healthy and dewormed",
        story: "Luna is a gentle cat who loves peaceful spaces and soft blankets.",
        icon: "🐱",
    },
    {
        id: 3,
        name: "Oreo",
        type: "Dog",
        breed: "Aspin",
        age: "3 years",
        gender: "Male",
        size: "Medium",
        status: "not_available",
        location: "Temporary Foster Home",
        personality: "Protective, smart, and calm",
        idealHome: "Best for adopters with pet care experience",
        health: "Under observation",
        story: "Oreo is currently under care and will be available after assessment.",
        icon: "🐕",
    },
];

export default function Dashboard({ onLogout, onApply }) {
    const savedUser = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [selectedPet, setSelectedPet] = useState(starterPets[0]);

    const availablePets = useMemo(() => {
        return starterPets.filter((pet) => pet.status === "available").length;
    }, []);

    const filteredPets = useMemo(() => {
        return starterPets.filter((pet) => {
            const matchesType =
                typeFilter === "all" || pet.type.toLowerCase() === typeFilter;

            const matchesSearch =
                pet.name.toLowerCase().includes(search.toLowerCase()) ||
                pet.breed.toLowerCase().includes(search.toLowerCase()) ||
                pet.type.toLowerCase().includes(search.toLowerCase());

            return matchesType && matchesSearch;
        });
    }, [search, typeFilter]);

    function handleApply(pet) {
        if (pet.status !== "available") return;
        onApply(pet);
    }

    return (
        <main className="adopter-page">
            <header className="adopter-topbar">
                <div>
                    <span className="adopter-eyebrow">Adopter Dashboard</span>
                    <h1>Hello, {savedUser.username || savedUser.name || "Adopter"}!</h1>
                    <p>Find rescued pets that are ready for a loving home.</p>
                </div>

                <button type="button" onClick={onLogout}>
                    Logout
                </button>
            </header>

            <section className="adopter-hero">
                <div className="adopter-hero-content">
                    <span>RescueBase Matching</span>
                    <h2>Meet your possible new companion.</h2>
                    <p>
                        Browse available rescued pets, check their details, and submit an
                        adoption application when you find a match.
                    </p>

                    <div className="adopter-hero-actions">
                        <a href="#available-pets">Browse Pets</a>
                        <button
                            type="button"
                            onClick={() => handleApply(selectedPet)}
                            disabled={selectedPet.status !== "available"}
                        >
                            Apply for {selectedPet.name}
                        </button>
                    </div>
                </div>

                <div className="adopter-featured-pet">
                    <div className="adopter-pet-icon">{selectedPet.icon}</div>
                    <span className={`adopter-status ${selectedPet.status}`}>
                        {selectedPet.status.replace("_", " ")}
                    </span>
                    <h3>{selectedPet.name}</h3>
                    <p>
                        {selectedPet.breed} • {selectedPet.age} • {selectedPet.gender}
                    </p>
                </div>
            </section>

            <section className="adopter-stats">
                <article>
                    <span>Available Pets</span>
                    <strong>{availablePets}</strong>
                </article>

                <article>
                    <span>Pet Categories</span>
                    <strong>Dog / Cat</strong>
                </article>

                <article>
                    <span>Application Status</span>
                    <strong>Ready</strong>
                </article>
            </section>

            <section className="adopter-content-grid">
                <section className="adopter-panel" id="available-pets">
                    <div className="adopter-panel-heading">
                        <div>
                            <h2>Available Pets</h2>
                            <p>Select a pet to view details and apply.</p>
                        </div>
                    </div>

                    <div className="adopter-filters">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search pet name, breed, or type"
                        />

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">All Pets</option>
                            <option value="dog">Dogs</option>
                            <option value="cat">Cats</option>
                        </select>
                    </div>

                    <div className="adopter-pet-list">
                        {filteredPets.map((pet) => (
                            <article
                                key={pet.id}
                                className={
                                    selectedPet.id === pet.id
                                        ? "adopter-pet-card active"
                                        : "adopter-pet-card"
                                }
                                onClick={() => setSelectedPet(pet)}
                            >
                                <div className="adopter-pet-card-icon">{pet.icon}</div>

                                <div>
                                    <h3>{pet.name}</h3>
                                    <p>
                                        {pet.type} • {pet.breed}
                                    </p>
                                    <small>
                                        {pet.age} • {pet.size}
                                    </small>
                                </div>

                                <span className={`adopter-status ${pet.status}`}>
                                    {pet.status.replace("_", " ")}
                                </span>
                            </article>
                        ))}
                    </div>
                </section>

                <aside className="adopter-panel adopter-detail-panel">
                    <div className="adopter-detail-header">
                        <div className="adopter-detail-icon">{selectedPet.icon}</div>

                        <div>
                            <span className={`adopter-status ${selectedPet.status}`}>
                                {selectedPet.status.replace("_", " ")}
                            </span>
                            <h2>{selectedPet.name}</h2>
                            <p>
                                {selectedPet.type} • {selectedPet.breed}
                            </p>
                        </div>
                    </div>

                    <div className="adopter-detail-grid">
                        <article>
                            <span>Age</span>
                            <strong>{selectedPet.age}</strong>
                        </article>

                        <article>
                            <span>Gender</span>
                            <strong>{selectedPet.gender}</strong>
                        </article>

                        <article>
                            <span>Size</span>
                            <strong>{selectedPet.size}</strong>
                        </article>

                        <article>
                            <span>Location</span>
                            <strong>{selectedPet.location}</strong>
                        </article>
                    </div>

                    <div className="adopter-detail-section">
                        <h3>Personality</h3>
                        <p>{selectedPet.personality}</p>
                    </div>

                    <div className="adopter-detail-section">
                        <h3>Ideal Home</h3>
                        <p>{selectedPet.idealHome}</p>
                    </div>

                    <div className="adopter-detail-section">
                        <h3>Health Status</h3>
                        <p>{selectedPet.health}</p>
                    </div>

                    <div className="adopter-detail-section">
                        <h3>Story</h3>
                        <p>{selectedPet.story}</p>
                    </div>

                    <button
                        type="button"
                        className="adopter-apply-button"
                        onClick={() => handleApply(selectedPet)}
                        disabled={selectedPet.status !== "available"}
                    >
                        {selectedPet.status === "available"
                            ? `Apply to Adopt ${selectedPet.name}`
                            : "Currently Not Available"}
                    </button>
                </aside>
            </section>
        </main>
    );
}