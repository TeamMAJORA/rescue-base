import { useEffect, useState } from "react";
import assets from "../../data/assets.json";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

export default function CTAFooter() {
    const [facebookUrl, setFacebookUrl] = useState("");

    useEffect(() => {
        fetch(`${API}/api/settings/social`, { headers: { "ngrok-skip-browser-warning": "true" } })
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => setFacebookUrl(data?.facebook || ""))
            .catch(() => setFacebookUrl(""));
    }, []);

    return (
        <section
            className="cta-footer"
            id="about"
        >
            <img
                className="cta-pets"
                src={assets.images.bannerPets}
                alt=""
            />

            <div className="cta-content">
                <h2>
                    From Rescue to Forever <span>Home</span>
                </h2>

                <p>
                    It takes five minutes to take the quiz. It takes a lifetime to love them.
                </p>

                <div className="cta-actions">
                    <button
                        className="match-btn cta-match-btn"
                        type="button"
                    >
                        Find my Match
                        <img
                            src={assets.icons.heart}
                            alt=""
                        />
                    </button>

                    <button
                        className="outline-btn"
                        type="button"
                    >
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
                    {facebookUrl && (
                        <a
                            className="footer-facebook"
                            href={facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Our Facebook page"
                            title="Our Facebook page"
                        >
                            <img src="/icons/facebook.svg" alt="" />
                            Facebook
                        </a>
                    )}
                </div>

                <span>
                    ©2025 RescueBase. All Rights Reserved.
                </span>
            </div>
        </section>
    );
}