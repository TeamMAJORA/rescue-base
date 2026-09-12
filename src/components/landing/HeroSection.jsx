import assets from "../../data/assets.json";

export default function HeroSection({ onSignup }) {
    return (
        <section className="hero">
            <div className="hero-content">
                <h1>
                    Find Your <br />
                    Perfect <span>Match</span>
                </h1>

                <p>
                    Helping every rescued pet find a loving family faster.
                </p>

                <div className="hero-actions">
                    <button
                        className="match-btn"
                        type="button"
                        onClick={onSignup}
                    >
                        Find my Match
                        <img
                            src={assets.icons.heart}
                            alt=""
                        />
                    </button>

                    <button
                        className="match-btn1"
                        type="button"
                    >
                        Report a Stray
                        <img
                            src={assets.icons.redPaw}
                            alt=""
                        />
                    </button>
                </div>
            </div>
        </section>
    );
}