import assets from "../../data/assets.json";

const adoptionSteps = [
    {
        icon: assets.icons.pawSearch,
        title: "Browse and fall in love",
        text: "Look through the pets waiting for a home. No account needed to look around.",
    },
    {
        icon: assets.icons.clipboard,
        title: "Apply online",
        text: "When you find the one, tell the shelter a little about you and your home.",
    },
    {
        icon: assets.icons.redHeart,
        title: "Meet in person",
        text: "The shelter team reviews your application and contacts you to set a visit.",
    },
    {
        icon: assets.icons.home,
        title: "Bring them home",
        text: "Once you and the shelter agree it's a good fit, your new friend goes home with you.",
    },
];

export default function AdoptionSteps() {
    return (
        <section className="steps-section" id="how-it-works">
            <div className="section-heading">
                <h2>How adoption works</h2>
                <p>Four simple steps, with the shelter team helping you along the way.</p>
            </div>

            <div className="steps-grid">
                {adoptionSteps.map((step, index) => (
                    <article className="step-card" key={step.title}>
                        <img src={step.icon} alt="" />
                        <h3>
                            <span className="step-number">{index + 1}</span>
                            {step.title}
                        </h3>
                        <p>{step.text}</p>
                        {index < adoptionSteps.length - 1 && (
                            <img src={assets.icons.stepArrow} alt="" className="step-arrow" />
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
}
