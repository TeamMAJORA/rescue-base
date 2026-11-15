import assets from "../../data/assets.json";
import { goToSection } from "./goToSection";

export default function HeroSection({ spotlightPet, onOpenPet, onSignup }) {
    return (
        <section className="hero">
            <div className="hero-content">
                <div className="hero-text">
                    <h1>
                        Find Your <br />
                        Perfect <span>Match</span>.
                    </h1>

                    <p>
                        Helping every rescued pet find a loving family faster.
                    </p>

                    <div className="hero-actions">
                        <a className="match-btn" href="#pets">
                            Meet Available Pets
                            <img src={assets.icons.heart} alt="" />
                        </a>

                        <button className="match-btn1" type="button" onClick={onSignup}>
                            Take the Match Quiz
                            <img src={assets.icons.redPaw} alt="" />
                        </button>
                    </div>

                    <button
                        type="button"
                        className="hero-help-link"
                        onClick={() => goToSection("help", onSignup)}
                    >
                        Can't adopt right now? Help another way ↓
                    </button>
                </div>

                {spotlightPet && (
                    <button
                        type="button"
                        className="hero-pet"
                        onClick={() => onOpenPet(spotlightPet)}
                        aria-label={`Today's Spotlight Star: ${spotlightPet.name}. Open profile`}
                    >
                        <img className="hero-pet-photo" src={spotlightPet.image} alt="" />
                        <img className="hero-pet-star" src="/starOftheDay.svg" alt="" aria-hidden="true" />
                        <span className="hero-pet-caption">
                            <small>Today's Spotlight Star</small>
                            Meet {spotlightPet.name} →
                        </span>
                    </button>
                )}
            </div>
        </section>
    );
}
