import assets from "../../data/assets.json";

const features = [
    {
        icon: assets.icons.pawSearch,
        title: "AI-Powered Matching",
        text: "Our quiz algorithm analyzes your lifestyle, experience, and home setup to find your most compatible pets first-.",
    },
    {
        icon: assets.icons.passport,
        title: "Digital Pet Passport",
        text: "Every animal has a complete medical history, vaccination records, and personality notes all in one place.",
    },
    {
        icon: assets.icons.home,
        title: "Guardian Watch",
        text: "Our in-house AI care monitoring watches out for common issues before adoption.",
    },
    {
        icon: assets.icons.redHeart,
        title: "Real-Time Analytics",
        text: "Shelter managers get live dashboards, intake trends, adoption rates, and donation stats that shows the impact of peaoples help.",
    },
];

export default function FeatureSection() {
    return (
        <section className="features-section">
            <div className="section-heading">
                <h2>More than an adoption site</h2>

                <p>
                    A complete platform for adopters, shelter staff, and managers — all connected.
                </p>
            </div>

            <div className="features-grid">
                {features.map((feature) => (
                    <article
                        className="feature-card"
                        key={feature.title}
                    >
                        <img
                            src={feature.icon}
                            alt=""
                        />

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