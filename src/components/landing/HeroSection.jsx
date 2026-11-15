import assets from "../../data/assets.json";
import { goToSection } from "./goToSection";

export default function HeroSection({ featuredPet, onOpenPet, onSignup }) {
    return (
        <section className="hero">
            <div className="hero-content">
                <div className="hero-text">
                    <h1>
                        Rescued in Cebu. <br />
                        Ready for a <span>Home</span>.
                    </h1>

                    <p>
                        Meet dogs and cats cared for by our partner shelter in Guadalupe, Cebu City.
                        Browse for free. When you find the one, apply online and the shelter team
                        will guide you from there.
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

                {featuredPet?.image && (
                    <button
                        type="button"
                        className="hero-pet"
                        onClick={() => onOpenPet(featuredPet)}
                    >
                        <img src={featuredPet.image} alt={featuredPet.name} />
                        <span>Meet {featuredPet.name} →</span>
                    </button>
                )}
            </div>
        </section>
    );
}
