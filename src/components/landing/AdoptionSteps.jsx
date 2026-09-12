import assets from "../../data/assets.json";

const adoptionSteps = [
    {
        icon: assets.icons.pawSearch,
        title: "Take the Match Quiz",
        text: "Hey!, Answer a few fun questions about your lifestyle. Our AI finds pets that fit you.",
    },
    {
        icon: assets.icons.redHeart,
        title: "Meet Your Matches",
        text: "Browse your personalized pet gallery with safe profiles, photos, and personality breakdowns.",
    },
    {
        icon: assets.icons.home,
        title: "Apply & Bring Them Home",
        text: "Submit yor application in minutes. Our staff guides you through every step of your journey.",
    },
];

export default function AdoptionSteps() {
    return (
        <section className="steps-section">
            <div className="section-heading">
                <h2>Adoption in three steps</h2>

                <p>
                    We've made finding your forever pet as joyful as the moment you meet them.
                </p>
            </div>

            <div className="steps-grid">
                {adoptionSteps.map((step, index) => (
                    <article
                        className="step-card"
                        key={step.title}
                    >
                        <img
                            src={step.icon}
                            alt=""
                        />

                        <h3>{step.title}</h3>

                        <p>{step.text}</p>

                        {index < adoptionSteps.length - 1 && (
                            <img
                                src={assets.icons.stepArrow}
                                alt=""
                                className="step-arrow"
                            />
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
}