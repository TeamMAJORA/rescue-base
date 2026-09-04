import assets from "../../data/assets.json";

const fallbackPet = {
    name: "Maxx",
    breed: "Chihuahua",
    sex: "Male",
    age: "112 Years Old.",
    shelter: "Cebu City Shelter",
    image: assets.images.authPets,
    description: "Max is stemberdo."
};

export default function SpotlightSection({ pet, onSignup }) {
    const spotlightPet = pet || fallbackPet;

    return (
        <section className="spotlight-section">
            <div className="spotlight-heading">
                <h2>
                    Meet This Week’s Spotlight Star!
                </h2>

                <p>
                    Get to know the amazing personality behind the paws — because there’s so much more to
                    <br />
                    love than just a picture!
                </p>
            </div>

            <div className="spotlight-card">
                <div className="spotlight-image-wrap">
                    <img
                        className="spotlight-image"
                        src={spotlightPet.image}
                        alt={spotlightPet.name}
                    />

                    <span className="spotlight-status">
                        Available
                    </span>
                </div>

                <div className="spotlight-details">
                    <h3>
                        {spotlightPet.name}
                    </h3>

                    <span className="spotlight-meta">
                        {spotlightPet.breed} • {spotlightPet.sex || "Male"} • {spotlightPet.age || "Age unknown"} • Cebu City Shelter
                    </span>

                    <div className="spotlight-tags">
                        <span className="tag-playful">
                            Playful
                        </span>

                        <span className="tag-vaccinated">
                            Vaccinated
                        </span>

                        <span className="tag-neutered">
                            Neutered
                        </span>

                        <span className="tag-cuddly">
                            Cuddly
                        </span>
                    </div>

                    <p className="spotlight-description">
                        {spotlightPet.description || fallbackPet.description}
                    </p>

                    <div className="spotlight-actions">
                        <button
                            className="spotlight-adopt-btn"
                            type="button"
                            onClick={onSignup}
                        >
                            Adopt {spotlightPet.name}

                            <img
                                src={assets.icons.adopt}
                                alt=""
                            />
                        </button>

                        <button
                            className="spotlight-outline-btn"
                            type="button"
                            onClick={onSignup}
                        >
                            Foster

                            <img
                                src={assets.icons.home}
                                alt=""
                            />
                        </button>

                        <button
                            className="spotlight-outline-btn"
                            type="button"
                            onClick={onSignup}
                        >
                            Donate

                            <img
                                src={assets.icons.donate}
                                alt=""
                            />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}