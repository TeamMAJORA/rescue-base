export default function TailsSection({ onSignup }) {
    return (
        <section className="tails-section">
            <div className="tails-content">
                <div className="tails-text">
                    <h2>Meet the Tails Waiting for You</h2>

                    <p>
                        Look beyond the photos to discover their unique personalities and reach out to the shelter
                        <br />
                        ready to welcome them home.
                    </p>
                </div>

                <button
                    className="tails-button"
                    type="button"
                    onClick={onSignup}
                >
                    Browse Rescues
                </button>
            </div>
        </section>
    );
}