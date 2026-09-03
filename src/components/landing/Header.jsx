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