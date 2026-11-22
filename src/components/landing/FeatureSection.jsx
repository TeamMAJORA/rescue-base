import assets from "../../data/assets.json";

// What an adopter or supporter actually gets from RescueBase
const features = [
    {
        icon: assets.icons.pawSearch,
        title: "A quiz that suggests pets for you",
        text: "Answer a few questions about your home and routine, and see which pets may fit best.",
    },
    {
        icon: assets.icons.passport,
        title: "Health notes on every profile",
        text: "Each pet's profile shows the health and behavior notes recorded by shelter staff.",
    },
    {
        icon: assets.icons.home,
        title: "Real people, start to finish",
        text: "Shelter staff read every application and stay in touch with you through each step.",
    },
    {
        icon: assets.icons.redHeart,
        title: "Help lost pets get home",
        text: "Report a lost, found, or stray animal on the community map so it can be reunited or rescued.",
    },
];

export default function FeatureSection() {
    return (
        <section className="features-section">
            <div className="section-heading">
                <h2>Adopt with confidence</h2>
                <p>Everything you need to choose the right pet and help your community.</p>
            </div>

            <div className="features-grid">
                {features.map((feature) => (
                    <article className="feature-card" key={feature.title}>
                        <img src={feature.icon} alt="" />
                        <div>
                            <h3>{feature.title}</h3>
                            <p>{feature.text}</p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
