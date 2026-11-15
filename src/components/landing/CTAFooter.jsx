import { useEffect, useState } from "react";
import assets from "../../data/assets.json";
import InfoModal from "./InfoModal";
import { PrivacyText, TermsText } from "./legalText";
import { goToSection } from "./goToSection";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const HEADERS = { "ngrok-skip-browser-warning": "true" };

function ContactText({ contact, dropOff }) {
    const hasContact = contact.email || contact.phone || contact.facebook;

    if (!hasContact && !dropOff) {
        return <p>Contact details for the shelter will be posted here soon.</p>;
    }

    return (
        <>
            {hasContact && (
                <>
                    <h3>{contact.name}</h3>
                    {contact.phone && <p>Phone: <a href={`tel:${contact.phone}`}>{contact.phone}</a></p>}
                    {contact.email && <p>Email: <a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
                    {contact.facebook && (
                        <p>
                            <a href={contact.facebook} target="_blank" rel="noopener noreferrer">
                                Message us on Facebook
                            </a>
                        </p>
                    )}
                </>
            )}

            {dropOff && (
                <>
                    <h3>Drop-off point for donations</h3>
                    <p>{dropOff.address}</p>
                    {dropOff.operatingHours && <p>{dropOff.operatingHours}</p>}
                </>
            )}
        </>
    );
}

export default function CTAFooter({ onLogin, onSignup }) {
    const [contact, setContact] = useState({ name: "", email: "", phone: "", facebook: "" });
    const [dropOff, setDropOff] = useState(null);
    const [openInfo, setOpenInfo] = useState("");

    useEffect(() => {
        fetch(`${API}/api/settings/contact`, { headers: HEADERS })
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => data?.contact && setContact(data.contact))
            .catch(() => {});

        fetch(`${API}/api/settings/drop-off`, { headers: HEADERS })
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => setDropOff(data?.dropOff?.enabled && data.dropOff.address ? data.dropOff : null))
            .catch(() => setDropOff(null));
    }, []);

    const infoPages = {
        privacy: { title: "Privacy", body: <PrivacyText /> },
        terms: { title: "Terms of Use", body: <TermsText /> },
        contact: { title: "Contact", body: <ContactText contact={contact} dropOff={dropOff} /> },
    };

    return (
        <section className="cta-footer">
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
                        onClick={onSignup}
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
                        onClick={() => goToSection("help", onSignup)}
                    >
                        Support a Shelter
                    </button>
                </div>
            </div>

            <footer className="footer">
                <div className="footer-brand">
                    <h3>RescueBase</h3>
                    <p>
                        Helping rescued dogs and cats in Cebu find loving homes,
                        together with our partner shelter.
                    </p>
                </div>

                <div>
                    <h4>For Adopters</h4>
                    <a href="#pets">Browse Pets</a>
                    <button type="button" className="footer-link" onClick={onSignup}>Match Quiz</button>
                    <a href="#how-it-works">How it Works</a>
                </div>

                <div>
                    <h4>For Supporters</h4>
                    <button type="button" className="footer-link" onClick={() => goToSection("help", onSignup)}>
                        Donate
                    </button>
                    <a href="#lost-found-map">Lost &amp; Found Map</a>
                    <button type="button" className="footer-link" onClick={onLogin}>Shelter staff log in</button>
                </div>
            </footer>

            <div className="footer-bottom">
                <div>
                    <button type="button" className="footer-link" onClick={() => setOpenInfo("privacy")}>Privacy</button>
                    <button type="button" className="footer-link" onClick={() => setOpenInfo("terms")}>Terms</button>
                    <button type="button" className="footer-link" onClick={() => setOpenInfo("contact")}>Contact</button>

                    {contact.facebook && (
                        <a
                            className="footer-facebook"
                            href={contact.facebook}
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
                    ©{new Date().getFullYear()} RescueBase. All Rights Reserved.
                </span>
            </div>

            {openInfo && (
                <InfoModal title={infoPages[openInfo].title} onClose={() => setOpenInfo("")}>
                    {infoPages[openInfo].body}
                </InfoModal>
            )}
        </section>
    );
}
