<<<<<<< HEAD
import assets from "../../data/assets.json";

function Header({ onLogin, onSignup }) {
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

                <button className="start-btn" type="button" onClick={onSignup}>
                    <img src={assets.icons.yellowPaw} alt="" />
                    Get Started
                </button>
            </div>
        </header>
    );
}

export default Header;
=======
import { Fragment } from "react";
import assets from "../../data/assets.json";

const NAV_LINKS = [
    { id: "about", label: "About Us" },
    { id: "pets", label: "Browse Pets" },
    { id: "lost-found-map", label: "Lost & Found Map" },
];

// The one site header: landing page (with Log in / Get Started) and log in / sign-up pages.
// On pages other than the landing page, pass onNavigate: links and the logo then go back to the
// landing page (and its section) instead of jumping to an anchor that isn't there.
function Header({ onLogin, onSignup, onNavigate, showActions = true }) {
    const handleNavigate = (sectionId) => (event) => {
        if (!onNavigate) return;
        event.preventDefault();
        onNavigate(sectionId);
    };

    return (
        <header className="header">
            <a className="brand" href="/" onClick={handleNavigate(null)}>
                <img src={assets.logo} alt="RescueBase logo" />
                <span>RescueBase</span>
            </a>

            <nav className="nav" aria-label="Main">
                {NAV_LINKS.map((link) => (
                    <Fragment key={link.id}>
                        <a href={`#${link.id}`} onClick={handleNavigate(link.id)}>{link.label}</a>
                        <img src={assets.icons.redPaw} alt="" />
                    </Fragment>
                ))}
            </nav>

            {showActions && (
                <div className="header-actions">
                    <button className="login-btn" type="button" onClick={onLogin}>
                        <img src={assets.icons.yellowPaw} alt="" />
                        Log in
                    </button>

                    <button className="start-btn" type="button" onClick={onSignup}>
                        <img src={assets.icons.yellowPaw} alt="" />
                        Get Started
                    </button>
                </div>
            )}
        </header>
    );
}

export default Header;
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
